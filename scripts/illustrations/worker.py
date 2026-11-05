#!/usr/bin/env python3
"""Durable single-host illustration worker. No generation or publishing by default.
Direct Images API adapter is intentional: retain raw usage and avoid hidden SDK retries.
"""
import argparse, base64, contextlib, fcntl, hashlib, json, os, signal, sqlite3
import sys, time, urllib.request, urllib.error, uuid, subprocess, io
from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
DEFAULT = ROOT / 'data/illustration-worker'

def read(path): return json.loads(Path(path).read_text())
def digest(data): return hashlib.sha256(data).hexdigest()
def atomic(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name+'.tmp')
    with open(tmp, 'wb') as f: f.write(data); f.flush(); os.fsync(f.fileno())
    os.replace(tmp, path)
def json_write(path, obj): atomic(path, (json.dumps(obj, indent=2)+'\n').encode())

class Worker:
    def __init__(self, home=DEFAULT, root=ROOT):
        self.root, self.home = Path(root), Path(home)
        self.home.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.home/'queue.sqlite', timeout=30)
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY, variant TEXT NOT NULL, source_hash TEXT NOT NULL,
            status TEXT NOT NULL, plan TEXT, master TEXT, sha TEXT, error TEXT,
            attempts INTEGER DEFAULT 0, next_at REAL DEFAULT 0, UNIQUE(id, variant));
          CREATE TABLE IF NOT EXISTS requests (
            token TEXT PRIMARY KEY, job TEXT, state TEXT, reserved REAL,
            cost REAL, usage TEXT, request_id TEXT, created REAL);
          CREATE TABLE IF NOT EXISTS control (key TEXT PRIMARY KEY,value TEXT);
          INSERT OR IGNORE INTO control VALUES ('paused','1');
        ''')
        self.db.commit()
    def control(self, key, value=None):
        if value is not None:
            self.db.execute('INSERT OR REPLACE INTO control VALUES (?,?)',(key,str(value))); self.db.commit()
        row=self.db.execute('SELECT value FROM control WHERE key=?',(key,)).fetchone()
        return row[0] if row else None
    @contextlib.contextmanager
    def lock(self):
        with open(self.home/'worker.lock','a') as f:
            try: fcntl.flock(f, fcntl.LOCK_EX|fcntl.LOCK_NB)
            except BlockingIOError: raise RuntimeError('Another worker/control mutation holds the lock')
            yield
    def sync(self):
        media=read(self.root/'assets/exercise-illustrations/manifest.json')['jobs']
        active={(x['exerciseId'],x['variant']):x for x in media}
        for path in sorted((self.root/'catalogue/exercises').glob('*.json')):
            e=read(path)
            if not e.get('name'): continue
            for variant in ('male','female'):
                key=e['id']+':'+variant; h=digest(path.read_bytes())
                m=active.get((e['id'],variant))
                old=self.db.execute('SELECT * FROM jobs WHERE id=?',(key,)).fetchone()
                if m:
                    master=m['master']; p=self.root/master['path']
                    if digest(p.read_bytes())!=master['sha256']: raise ValueError('Corrupt existing master '+key)
                    status='reviewed' if m['review']['status'] in ('approved','rejected') else 'generated'
                    self.db.execute('INSERT OR REPLACE INTO jobs (id,variant,source_hash,status,master,sha) VALUES (?,?,?,?,?,?)',
                        (key,variant,h,status,master['path'],master['sha256']))
                elif not old:
                    self.db.execute('INSERT INTO jobs (id,variant,source_hash,status,error) VALUES (?,?,?,?,?)',
                        (key,variant,h,'pending','Pose planning required'))
                elif old['source_hash']!=h:
                    # Do not regenerate a saved asset after a catalog edit.
                    self.db.execute('UPDATE jobs SET plan=NULL,error=? WHERE id=?',('Catalog changed; reconcile metadata before reuse',key))
        self.db.commit()
    def plan(self, path):
        style=read(self.root/'assets/exercise-illustrations/style-policy.json')
        for p in read(path)['jobs']:
            key=p['exerciseId']+':'+p['variant']
            row=self.db.execute('SELECT * FROM jobs WHERE id=?',(key,)).fetchone()
            if not row: raise ValueError('Not a canonical ID/variant: '+key)
            if row['status']!='pending': continue
            epath=self.root/'catalogue/exercises'/ (p['exerciseId']+'.json'); e=read(epath)
            poses=p['poses']; layout=p['layout']
            if not poses or len(poses)!=layout['columns']*layout['rows']: raise ValueError('Explicit matching pose layout required')
            if len({x['key'] for x in poses})!=len(poses) or not all(x.get('caption') and x.get('description') for x in poses): raise ValueError('Pose descriptions required')
            if not p.get('techniqueNotes') or not p.get('muscleNotes'): raise ValueError('Technique/muscle planning required')
            p=dict(p,styleVersion=style['id'],styleHash=digest(json.dumps(style,sort_keys=True).encode()),canonicalName=e['name'],equipment=e['equipment'],primaryMuscles=e.get('muscleMap',{}).get('primaries',[e['target']]))
            p['prompt']=style['prompt']+'\nAdult '+p['variant']+' model. Exercise: '+e['name']+'. Equipment: '+e['equipment']+'. Target metadata: '+str(p['primaryMuscles'])+'. '+p['muscleNotes']+'\n'+p['techniqueNotes']+'\nGrid: '+str(layout)+'. Equal panels, white gutters. Same model, scale, clothing, equipment and camera across all panels. Each pose fully inside its own panel. Poses in reading order: '+json.dumps(poses)+'. Captions are instructions only: never render text in image. Still positions, not a movement video.'
            p['key']=p['exerciseId']+'-'+p['variant']+'-anatomical-worker-v1-'+digest(p['prompt'].encode())[:12]
            self.db.execute('UPDATE jobs SET plan=?,source_hash=?,error=NULL WHERE id=?',(json.dumps(p),digest(epath.read_bytes()),key))
        self.db.commit()
    def report(self):
        counts=dict(self.db.execute('SELECT status,count(*) FROM jobs GROUP BY status').fetchall())
        ledger=self.db.execute('SELECT count(*),coalesce(sum(cost),0),coalesce(sum(CASE WHEN cost IS NULL THEN reserved ELSE 0 END),0) FROM requests').fetchone()
        files=[self.root/r[0] for r in self.db.execute('SELECT master FROM jobs WHERE master IS NOT NULL')]
        return dict(statuses=counts, remaining=sum(counts.get(s,0) for s in ('pending','processing','failed')),
            ready=self.db.execute("SELECT count(*) FROM jobs WHERE status='pending' AND plan IS NOT NULL").fetchone()[0],
            paused=self.control('paused')=='1',heartbeat=self.control('heartbeat'),pid=self.control('pid'),
            requests=ledger[0],usageCalculatedUSD=ledger[1],unresolvedReservedUSD=ledger[2],
            invoiceCostUSD=None,legacyGenerationCostUSD=None,masterBytes=sum(p.stat().st_size for p in files if p.exists()))
    def preflight(self, config):
        errors=[]
        if not config.get('enabled'): errors.append('Paid API execution disabled')
        if not os.getenv('OPENAI_API_KEY'): errors.append('OPENAI_API_KEY absent from worker environment')
        if config.get('budgetUSD',0)<=0 or config.get('maxRequests',0)<=0: errors.append('No paid budget/request allowance authorized')
        if config.get('reservePerRequestUSD',0)<=0: errors.append('Positive per-request reservation required')
        if config.get('model')!='gpt-image-2-2026-04-21': errors.append('Model change requires explicit calibration/config review')
        if self.db.execute("SELECT count(*) FROM requests WHERE state='uncertain'").fetchone()[0]: errors.append('Ambiguous prior charge requires reconciliation')
        if self.control('paused')=='1': errors.append('Queue paused')
        return errors
    def recover(self):
        for r in self.db.execute("SELECT * FROM requests WHERE state='processing'").fetchall():
            receipt=self.home/'receipts'/(r['token']+'.json')
            if receipt.exists(): self.finish(r['token'],read(receipt))
            else:
                self.db.execute("UPDATE requests SET state='uncertain' WHERE token=?",(r['token'],))
                self.db.execute("UPDATE jobs SET status='failed',error='Interrupted request: outcome/charge unknown; do not retry automatically' WHERE id=?",(r['job'],))
                self.control('paused','1')
        self.db.commit()
    def finish(self, token, result):
        req=self.db.execute('SELECT * FROM requests WHERE token=?',(token,)).fetchone()
        path=self.root/result['master']
        if digest(path.read_bytes())!=result['sha']: raise ValueError('Saved master hash mismatch')
        duplicate=self.db.execute('SELECT id FROM jobs WHERE sha=? AND id!=?',(result['sha'],req['job'])).fetchone()
        self.db.execute('UPDATE requests SET state=?,cost=?,usage=?,request_id=? WHERE token=?',
            ('complete',result.get('cost'),json.dumps(result.get('usage')),result.get('requestId'),token))
        error='Duplicate output: requires review; never publish' if duplicate else None
        self.db.execute('UPDATE jobs SET status=?,master=?,sha=?,error=? WHERE id=?',
            ('failed' if duplicate else 'generated',result['master'],result['sha'],error,req['job']))
        if result.get('cost') is None or result['cost']>req['reserved']: self.control('paused','1')
        self.db.commit()
    def step(self, cfg, provider):
        if self.control('paused')=='1': return False
        if self.db.execute("SELECT count(*) FROM requests WHERE state='uncertain'").fetchone()[0]:
            self.control('paused','1');return False
        row=self.db.execute("SELECT * FROM jobs WHERE status='pending' AND plan IS NOT NULL AND next_at<=? ORDER BY id LIMIT 1",(time.time(),)).fetchone()
        if not row: return False
        p=json.loads(row['plan']); style=read(self.root/'assets/exercise-illustrations/style-policy.json')
        source=self.root/'catalogue/exercises'/(p['exerciseId']+'.json')
        if digest(source.read_bytes())!=row['source_hash'] or digest(json.dumps(style,sort_keys=True).encode())!=p['styleHash']:
            self.db.execute('UPDATE jobs SET plan=NULL,error=? WHERE id=?',('Source/style changed; replan required',row['id']));self.db.commit();return True
        ledger=self.report(); reserve=cfg['reservePerRequestUSD']
        if ledger['requests']>=cfg['maxRequests'] or ledger['usageCalculatedUSD']+ledger['unresolvedReservedUSD']+reserve>cfg['budgetUSD']:
            self.control('paused','1');return False
        token=uuid.uuid4().hex
        self.db.execute('INSERT INTO requests VALUES (?,?,?,?,NULL,NULL,NULL,?)',(token,row['id'],'processing',reserve,time.time()))
        self.db.execute("UPDATE jobs SET status='processing',attempts=attempts+1 WHERE id=?",(row['id'],));self.db.commit()
        try:
            result=provider(p,cfg)
            # Save image before ledger update. Receipt makes interrupted DB commit recoverable.
            data=base64.b64decode(result['data'][0]['b64_json'],validate=True)
            if not data.startswith(b'\x89PNG\r\n\x1a\n'): raise ValueError('Provider did not return PNG')
            with Image.open(io.BytesIO(data)) as image:
                if cfg.get('size') and image.size!=tuple(map(int,cfg['size'].split('x'))): raise ValueError('Unexpected image dimensions')
                image.verify()
            rel='assets/exercise-illustrations/generated/'+p['key']+'.png'
            if (self.root/rel).exists(): raise ValueError('Refusing to overwrite existing master')
            atomic(self.root/rel,data)
            usage=result.get('usage'); cost=None
            if usage and isinstance(usage.get('input_tokens_details'),dict):
                details=usage['input_tokens_details']; rates=cfg['pricing']
                if all(k in details for k in ('text_tokens','image_tokens')) and 'output_tokens' in usage:
                    cost=(details['text_tokens']*rates['textInput']+details['image_tokens']*rates['imageInput']+usage['output_tokens']*rates['imageOutput'])/1e6
            receipt=dict(master=rel,sha=digest(data),bytes=len(data),usage=usage,cost=cost,requestId=result.get('_request_id'),pricing=cfg['pricing'],plan=p)
            json_write(self.home/'receipts'/(token+'.json'),receipt);self.finish(token,receipt)
        except urllib.error.HTTPError as err:
            # Only explicit 429 rejection retries. 5xx/timeouts may have generated a charge.
            if err.code==429:
                try: delay=max(1,min(86400,float(err.headers.get('Retry-After','60'))))
                except (ValueError,TypeError): delay=60
                attempt=row['attempts']+1; delay=max(delay,min(3600,10*2**attempt))
                self.db.execute("UPDATE requests SET state='rejected',reserved=0,cost=0 WHERE token=?",(token,))
                self.db.execute('UPDATE jobs SET status=?,next_at=?,error=? WHERE id=?',('pending' if attempt<cfg['maxAttempts'] else 'failed',time.time()+delay,'HTTP 429; bounded retry',row['id']))
            else:
                self.uncertain(token,row['id'],'HTTP '+str(err.code)+'; manual reconciliation required')
            self.db.commit()
        except Exception as err:
            self.uncertain(token,row['id'],type(err).__name__+'; outcome uncertain, inspect receipt/master before retry')
        return True
    def uncertain(self, token, job, message):
        self.db.execute("UPDATE requests SET state='uncertain' WHERE token=?",(token,))
        self.db.execute("UPDATE jobs SET status='failed',error=? WHERE id=?",(message,job));self.control('paused','1');self.db.commit()
    def run_loop(self, cfg, provider):
        stopping=False
        def stop(*_):
            nonlocal stopping
            stopping=True
        signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
        self.control('stop','0')
        self.control('pid',os.getpid())
        try:
            while not stopping and self.control('stop')!='1':
                self.control('heartbeat',time.time())
                if self.control('paused')!='1': self.step(cfg,provider)
                time.sleep(max(1,cfg.get('intervalSeconds',5)))
        finally: self.control('pid','');self.control('stoppedAt',time.time())
    def export(self, path):
        jobs=[]
        for r in self.db.execute("SELECT * FROM jobs WHERE status='generated' AND plan IS NOT NULL"):
            p=json.loads(r['plan']);p['inspectionNote']='API-generated candidate; anatomy, technique, clothing and panel alignment NOT reviewed.'
            costs=self.db.execute('SELECT sum(cost) FROM requests WHERE job=?',(r['id'],)).fetchone()[0]
            p['generation']={'status':'generated','attempts':r['attempts'],'provider':'OpenAI Images API','costUSD':None,'usageCalculatedCostUSD':costs}
            jobs.append(p)
        json_write(path,dict(jobs=jobs))

def api(plan, cfg):
    payload=dict(model=cfg['model'],prompt=plan['prompt'],size=cfg['size'],quality=cfg['quality'],output_format='png',n=1)
    request=urllib.request.Request('https://api.openai.com/v1/images/generations',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+os.environ['OPENAI_API_KEY']})
    with urllib.request.urlopen(request,timeout=240) as response:
        result=json.load(response);result['_request_id']=response.headers.get('x-request-id');return result

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--home',type=Path,default=DEFAULT)
    p.add_argument('--config',type=Path,default=DEFAULT/'config.json')
    p.add_argument('command',choices=['sync','plan','status','pause','resume','preflight','run','start','stop','export']);p.add_argument('file',nargs='?')
    a=p.parse_args();w=Worker(a.home)
    if a.command=='status': print(json.dumps(w.report(),indent=2));return
    if a.command=='stop': w.control('stop','1');print('Stop requested; in-flight result will be saved first');return
    if a.command in ('pause','resume'): w.control('paused','1' if a.command=='pause' else '0');print(a.command);return
    cfg=read(a.config) if a.config.exists() else read(ROOT/'scripts/illustrations/worker-config.example.json')
    if a.command=='preflight': print(json.dumps(w.preflight(cfg),indent=2));return
    if a.command=='start':
        errors=w.preflight(cfg)
        if errors: raise SystemExit('; '.join(errors))
        with w.lock(): pass
        with open(a.home/'worker.log','ab') as log:
            child=subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--home',str(a.home.resolve()),'--config',str(a.config.resolve()),'run'],stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True)
        time.sleep(2)
        if child.poll() is not None or w.control('pid')!=str(child.pid): raise SystemExit('Worker failed startup; inspect worker.log')
        print(json.dumps({'startedPid':child.pid,'heartbeat':w.control('heartbeat')}));return
    with w.lock():
        if a.command=='sync': w.sync()
        elif a.command=='plan': w.plan(a.file)
        elif a.command=='export': w.export(a.file)
        elif a.command=='run':
            w.recover();errors=w.preflight(cfg)
            if errors: raise SystemExit('; '.join(errors))
            w.run_loop(cfg,api)
    print(json.dumps(w.report(),indent=2))
if __name__=='__main__': main()
