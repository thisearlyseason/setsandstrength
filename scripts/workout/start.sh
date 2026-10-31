#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
supabase start -x studio,realtime,imgproxy,edge-runtime,logflare,vector,supavisor >/dev/null
python3 scripts/workout/local-env.py
printf 'Workout local backend is ready. Start the app with: npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173\n'
