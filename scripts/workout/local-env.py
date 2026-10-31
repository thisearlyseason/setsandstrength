import subprocess,json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
s=json.loads(subprocess.check_output(['supabase','status','-o','json'],cwd=root,stderr=subprocess.DEVNULL))
(root/'frontend/.env.local').write_text('VITE_WORKOUT=1\nVITE_SUPABASE_URL='+s['API_URL']+'\nVITE_SUPABASE_ANON_KEY='+s['ANON_KEY']+'\n')
print('Local frontend environment written; privileged keys excluded.')
