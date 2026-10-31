# Workout local development

This is a local development version of an AGPL openGym fork. Start with the app at
http://127.0.0.1:5173. No hosted project, purchases, native releases or public deployment
have been created. The complete animation library is not finished; see `coverage.json`.

## Setup

Requirements: Node 24, npm, Docker, Supabase CLI, Python 3. Use this checkout; no second
repository or dependency tree is needed. All commands below run at the repository root.

```sh
npm --prefix frontend ci
node scripts/workout/generate.mjs
./scripts/workout/start.sh
supabase migration up --local
```

The first `supabase start` applies migrations and `supabase/seed.sql` automatically to a
new database. For an already-created database, refresh **catalog/template** data explicitly:

```sh
docker exec -i supabase_db_workout psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 < supabase/seed.sql
node frontend/scripts/workout-assets.mjs
python3 scripts/workout/source.py
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The seed touches public catalog, template and manifest records, not accounts or workout
state. It currently regenerates draft content; do not run it over future reviewed content
without preserving that review work. The original model source is
`frontend/scripts/workout-anatomy.mjs`; regenerate with `npm --prefix frontend run assets:original`.

Workout uses ports 55321 (API), 55322 (database), 55324 (local email), leaving other
Supabase projects alone. Unneeded containers are excluded. Local email confirmation is
turned off for development. Open Profile to create an adult account, then optional
adult-managed 13–15 / 16–17 profiles. No test credentials are required for ordinary use.

`frontend/.env.local` is ignored. The setup writes only the local public/anon key there;
service-role keys stay in process memory in local maintenance tools. Never put a
service-role key in a VITE variable. Do not expose local development ports publicly.

## How persistence works

The redesigned web entry runs when `VITE_WORKOUT=1`. Original native source and the
upstream entry are preserved. The existing Zustand store and its stamped merge rules
remain the training-state owner. The transport maps state requests to Supabase rather
than the original JSON-file server. Native pairing, passkeys, AI coaching and push
services are not enabled in this web release.

An authenticated account owns training profiles. Each profile has a JSONB state document,
a revision and a write identifier. `save_profile_state` locks the row, checks ownership
and the expected revision, and returns the latest state on conflict. The upstream store
merges and retries. Direct client writes to the state table are forbidden.

Profile selection is per browser tab; switching flushes pending writes first and uses
the upstream owner-change protection. An offline switch is blocked if changes still
need syncing. In-progress sessions are preserved through the upstream stash mechanism.

Catalog and program files are versioned offline snapshots of the seeded public tables.
Enrollment copies a specific template version into ordinary routines and calendar dates.
Changes to templates do not alter an enrolled user's routines. Media metadata has a
complete entry for every named exercise; only seven entries currently have prototype
motion studies. The viewer fetches the original glTF from local Supabase Storage, with
a bundled public copy as an offline fallback.

Private uploads have an account-prefixed Storage policy and integration tests. A general
photo-upload interface is not part of the current redesigned screens. JSON exports contain
training state; they are not database/Storage backups. Do not assume a JSON export carries
binary attachments imported from an older openGym backup.

## Verification

```sh
npm --prefix frontend test -- --maxWorkers=2
npm --prefix frontend run test:integration
npm --prefix frontend run check:coverage
npm --prefix frontend run build
npm --prefix frontend run check:release
```

`check:release` intentionally exits nonzero until every exercise has a reviewed original
asset, reviewer/date, verified technique and equipment, and every program is approved.
The integration test creates and removes only its own synthetic local accounts and file.
Upstream unit tests run with `VITE_WORKOUT=0`; fork-specific tests exercise the preserved
training functions, program enrollment, merge and JSON/CSV round trips. The real Supabase
test checks the new transport's ownership and concurrency behavior.

A production build supports an installable PWA and caches visited public assets only.
Auth/API/private media responses are never service-worker cached. For a production-build
local check: `npm --prefix frontend run preview -- --host 127.0.0.1 --port 5173` after
stopping the dev server. External web fonts fall back to system fonts offline.

## Backup, restore and shutdown

Before changes to local database/storage, make a durable backup outside ignored scratch:

```sh
mkdir -p backups
supabase db dump --local --schema public,auth,storage --file backups/schema.sql
supabase db dump --local --schema public,auth,storage --data-only --use-copy --file backups/data.sql
```

Those dumps contain sensitive account data; keep `backups/` private and out of Git.
Storage metadata is not the files themselves: also retain a copy of both buckets' object
bytes, with object paths and checksums, using a privileged local export tool or a stopped
Docker-volume backup. Preserve your Docker volumes until restore is verified. To restore,
use a separate empty database, restore schema/data, restore bucket bytes at the same paths,
and verify Auth, profile ownership, row counts and sample file checksums before switching.
Do not reset a database containing user records to make setup easier.

Stop only this project's containers with `supabase stop` from this directory. Do not use
`--no-backup`. Never delete shared Docker images, caches or another project's volumes.
Temporary logs and browser screenshots are under ignored `work/`; source and final
artifacts are separate. The source-download ZIP excludes secrets, caches and restricted
upstream exercise media and is regenerated after code changes.
