"""Register locally saved generated masters against existing catalog IDs. Never approves."""
import json,sys
from pathlib import Path
root=Path('assets/exercise-illustrations');file=Path(sys.argv[1]);requests=json.loads(file.read_text())['jobs']
p=root/'manifest.json';m=json.loads(p.read_text());additions=[]
for r in requests:
 if any(j['exerciseId']==r['exerciseId'] and j['variant']==r['variant'] for j in m['jobs']):continue
 if r['variant'] not in ['male','female']:raise ValueError('Invalid model variant')
 e=json.loads(Path('catalogue/exercises',r['exerciseId']+'.json').read_text())
 if not e.get('name') or e['id']!=r['exerciseId']:raise ValueError('Not a canonical exercise')
 if not (root/'generated'/(r['key']+'.png')).exists():raise ValueError('Missing master')
 if not r.get('poses'):raise ValueError('Explicit pose planning required')
 additions.append(dict(r,canonicalName=e['name'],styleVersion=r['key'].split('-anatomical-')[1],equipment=e['equipment'],primaryMuscles=e.get('muscleMap',{}).get('primaries',[e['target']]),metadataReview='Qualified review of technique and muscle mapping required.',reference={'rights':'Original generation from exercise metadata and user-selected style. No upstream image input.'},generation=dict(r.get('generation',{'attempts':1,'provider':'built-in image_gen','costUSD':None}),status='generated'),review={'status':'pending','notes':r.get('inspectionNote','Awaiting visual inspection'),'reviewer':''},assets=[],video=None,batch=file.name))
m['jobs'].extend(additions);p.write_text(json.dumps(m,indent=2)+'\n');print(f'{len(additions)} variants registered; none approved')
