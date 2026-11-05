"""Resume local delivery conversion. No network, generation or approval side effects."""
import json, hashlib
from io import BytesIO
from pathlib import Path
from PIL import Image
root=Path('assets/exercise-illustrations'); path=root/'manifest.json'
m=json.loads(path.read_text()); seen={}; total=0
out=Path('frontend/public/workout/illustration-pilot'); out.mkdir(parents=True,exist_ok=True)
for j in m['jobs']:
 master=root/'generated'/f"{j['key']}.png"
 if not master.exists(): continue
 digest=hashlib.sha256(master.read_bytes()).hexdigest()
 if digest in seen: raise ValueError(f"Duplicate master: {j['key']} and {seen[digest]}")
 seen[digest]=j['key']; n=len(j['poses']); assets=[]
 layout=j.get('layout',{'columns':n,'rows':1});cols=layout['columns'];rows=layout['rows']
 if not isinstance(cols,int) or not isinstance(rows,int) or cols<1 or rows<1 or cols*rows!=n: raise ValueError('Invalid panel layout: '+j['key'])
 signature=hashlib.sha256((digest+json.dumps({'layout':layout,'cropBounds':j.get('cropBounds'),'poses':j['poses'],'encoder':'webp-88-78-v1'},sort_keys=True)).encode()).hexdigest()
 # Reuse byte-identical delivery files only after checking source, settings and
 # every saved content hash. A changed or missing file takes the full encoder path.
 cached=j.get('assets',[]); thumb=j.get('thumbnail',{})
 def intact(a):
  relative=a.get('path','')
  if not relative.startswith('/workout/illustration-pilot/'): return False
  dest=out/Path(relative).name
  return a.get('width',0)>0 and a.get('height',0)>0 and dest.is_file() and dest.stat().st_size==a.get('bytes') and hashlib.sha256(dest.read_bytes()).hexdigest()==a.get('sha256')
 if j.get('processingSignature')==signature and j.get('master',{}).get('sha256')==digest and len(cached)==n and all(a.get('pose')==p['key'] and intact(a) for a,p in zip(cached,j['poses'])) and intact(thumb):
  total+=sum(a['bytes'] for a in cached)+thumb['bytes']
  continue
 im=Image.open(master).convert('RGB')
 for i,p in enumerate(j['poses']):
  col=i%cols;row=i//cols
  bounds=j.get('cropBounds',[])[i] if j.get('cropBounds') else [col/cols,row/rows,(col+1)/cols,(row+1)/rows]
  if len(bounds)!=4 or not (0<=bounds[0]<bounds[2]<=1 and 0<=bounds[1]<bounds[3]<=1): raise ValueError('Invalid pose crop: '+j['key'])
  pose=im.crop((round(bounds[0]*im.width),round(bounds[1]*im.height),round(bounds[2]*im.width),round(bounds[3]*im.height))); pose.thumbnail((1200,1200))
  buffer=BytesIO();pose.save(buffer,'WEBP',quality=88,method=6);encoded=buffer.getvalue();asset_hash=hashlib.sha256(encoded).hexdigest()
  filename=f"{j['key']}-{p['key']}-{asset_hash[:12]}.webp"; dest=out/filename;dest.write_bytes(encoded)
  assets.append({'pose':p['key'],'path':'/workout/illustration-pilot/'+filename,'width':pose.width,'height':pose.height,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
  if i==0:
   pose.thumbnail((240,240));buffer=BytesIO();pose.save(buffer,'WEBP',quality=78,method=6);encoded=buffer.getvalue();thumb_hash=hashlib.sha256(encoded).hexdigest();thumb=out/f"{j['key']}-thumb-{thumb_hash[:12]}.webp";thumb.write_bytes(encoded)
   j['thumbnail']={'path':'/workout/illustration-pilot/'+thumb.name,'width':pose.width,'height':pose.height,'bytes':thumb.stat().st_size,'sha256':hashlib.sha256(thumb.read_bytes()).hexdigest()}
 if j.get('processingSignature')!=signature:
  same_master=j.get('master',{}).get('sha256')==digest
  old_review=j.get('review',{})
  j['review']={'status':'rejected' if same_master and old_review.get('status')=='rejected' else 'pending','notes':j.get('inspectionNote') or (old_review.get('notes') if same_master else None) or 'Generated draft; anatomy, equipment, panel boundaries and technique require human review.','reviewer':''}
 j['processingSignature']=signature
 j['master']={'path':str(master),'width':im.width,'height':im.height,'bytes':master.stat().st_size,'sha256':digest}
 j['assets']=assets; j['generation'].update(status='generated',attempts=max(1,j['generation']['attempts']),provider='built-in image_gen',costUSD=None)
 total+=sum(a['bytes'] for a in assets)+j['thumbnail']['bytes']
active={Path(a['path']).name for j in m['jobs'] for a in j.get('assets',[])} | {Path(j['thumbnail']['path']).name for j in m['jobs'] if j.get('thumbnail')}
for old in out.glob('*.webp'):
 if old.name not in active: old.unlink() # Rebuildable delivery files only; source masters retained.
path.write_text(json.dumps(m,indent=2)+'\n')
# Review metadata is intentionally separate from the production index.
(out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
summary={'generatedMasters':len(seen),'requiredMasters':len(m['jobs']),'deliveryBytes':total,'masterBytes':sum(j.get('master',{}).get('bytes',0) for j in m['jobs']),'generationCostUSD':None,'costNote':'Built-in tool does not expose per-generation billing. No API credits purchased or paid API used. Do not infer zero future cost.'}
(root/'measurements.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
