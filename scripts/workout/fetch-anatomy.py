"""Fetch pinned, no-cost anatomy inputs; never execute downloaded source."""
from pathlib import Path
import hashlib,json,urllib.request
root=Path(__file__).resolve().parents[2]/'assets/anatomy/z-anatomy'
source=json.loads((root/'source.json').read_text())
for file in source['files']:
 path=root/file['name']
 if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==file['sha256']:
  print('Verified existing',file['name']);continue
 url=source['repository'].replace('github.com','raw.githubusercontent.com')+'/'+source['commit']+'/Resources/Models/FBX/'+file['name']
 with urllib.request.urlopen(url) as response:path.write_bytes(response.read())
 if hashlib.sha256(path.read_bytes()).hexdigest()!=file['sha256']:raise RuntimeError('Source hash mismatch: '+file['name'])
 print('Fetched and verified',file['name'])
