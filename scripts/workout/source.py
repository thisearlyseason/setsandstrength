"""Package corresponding source, including current edits; omit secrets, caches and restricted media."""
from pathlib import Path
import subprocess,zipfile
root=Path(__file__).resolve().parents[2]
paths=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=root).decode().split('\0')
out=root/'frontend/public/workout/source.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for rel in sorted(set(paths)):
  p=root/rel
  if not p.is_file() or p.is_symlink():continue
  if rel.startswith(('catalogue/media/','assets/anatomy/archive/','work/','.playwright-cli/','frontend/dist/','supabase/.temp/')):continue
  if any(part in ('node_modules','.git','.cache','.vite') for part in p.parts):continue
  if p==out or (p.name.startswith('.env') and p.name!='.env.example'):continue
  if rel.startswith('assets/anatomy/z-anatomy/') and p.suffix == '.fbx':continue
  if p.suffix in ('.keystore','.jks','.p12','.mobileprovision'):continue
  z.write(p,rel)
print(f'Corresponding source packaged: {out.stat().st_size//1024} KB; no credentials or restricted exercise media.')
