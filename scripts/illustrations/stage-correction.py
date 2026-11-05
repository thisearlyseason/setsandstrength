"""Stage an inspected replacement for human review, never for production."""
import json,sys
from pathlib import Path
root=Path('assets/exercise-illustrations');key=sys.argv[1];note=sys.argv[2]
requests=[]
for file in ['corrections-20261031.json','rebuilds-20261031.json','guided-20261031.json','style-refinements-20261031.json','pilot-continuation-20261031.json','deadbug-refinement-20261031.json','pilot-style-remainder-20261031.json']:
 requests+=json.loads((root/file).read_text())['jobs']
request=next(j for j in requests if j['key']==key)
if not (root/'generated'/f'{key}.png').exists():raise SystemExit('No generated master')
p=root/'manifest.json';m=json.loads(p.read_text());job=next(j for j in m['jobs'] if j['exerciseId']==request['exerciseId'] and j['variant']==request['variant'])
if job['key']==key:raise SystemExit('Already staged; do not overwrite inspection history')
history=job.setdefault('history',[])
history.append({k:job.get(k) for k in ['key','prompt','master','layout','cropBounds','poses','blockingIssues','visualInspection','generation','review']})
job.update(key=key,styleVersion='anatomical-'+key.split('-anatomical-')[1],prompt=request['prompt'],layout=request.get('layout',{'columns':len(job['poses']),'rows':1}),assets=[],generation={'status':'pending','attempts':1,'provider':'built-in image_gen'},review={'status':'pending','notes':note,'reviewer':''},inspectionNote=note)
# Explicit new crop geometry must replace prior-version crops.
if 'cropBounds' in request:job['cropBounds']=request['cropBounds']
if 'blockingIssues' in request:job['blockingIssues']=request['blockingIssues']
job.pop('visualInspection',None)
job['highlightTreatment']='Red indicates the target muscle region. Over clothing it is a surface teaching overlay; the fabric remains opaque.'
if request.get('source'):job['editSource']=str(root/'generated'/f"{request['source']}.png")
else:job.pop('editSource',None)
for field in ['master','thumbnail','processingSignature']:job.pop(field,None)
p.write_text(json.dumps(m,indent=2)+'\n');print('Staged for qualified review:',key)
