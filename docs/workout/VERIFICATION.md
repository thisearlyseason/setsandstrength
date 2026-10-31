# Local verification and remaining work

## Implemented and verified

- Upstream imported at `b6cfe2bbd3f099523ffbf2677438864e9a09a06f` on
  `codex/workout-supabase`. One checkout and one frontend dependency installation.
- Five responsive destinations, plan enrollment/calendar moves, exercise search,
  focused set logging, rest countdown, history, JSON/CSV exports/imports and account profiles.
- Full upstream catalog: 5,632 named exercises and 922 aliases. No catalog ID removals.
- 35 four-week draft templates across seven categories and five audience tracks.
- Local Supabase Auth, Postgres and Storage; original JSONB state sync kept behind a
  transactional revision/ownership check. Row-level and object policies restrict access.
- Production build succeeded. Existing large locale/catalog chunks still produce a size
  advisory; the new 3D renderer is loaded on demand.
- Final frontend suite: **544 files, 6,542 tests passed**. This includes preserved training,
  progression, sync/import coverage and the new enrollment/round-trip tests.
- Live local Supabase integration: signup/signin, adult/youth profile isolation,
  forged ownership, anonymous access denial, direct-write denial, concurrent revision
  conflict/retry, private file read/write denial across accounts, catalog write denial,
  and seeded catalog/template counts passed. Synthetic integration users/files and browser-QA accounts were removed.
- Browser: signup → profile → enroll → start → log set → finish → progress → reload passed.
  Switching from adult to youth showed independent history. Desktop 1440px, tablet 820px,
  and phone 390px views were inspected; tablet and phone had no horizontal overflow.
- Production PWA: changed units offline, reloaded offline, then reconnected and synced.
  Database inspection confirmed the new units and preserved workout. Expected blocked
  network requests occurred during the deliberate offline test.
- Original glTF loaded from local Supabase Storage. Reduced-motion preference started the
  animation paused. Forced asset failure showed a readable fallback while retaining the
  instructions. Normal model playback had no console warnings/errors after the clock fix.
- Public-launch check exits nonzero for unreviewed/missing content, as intended.
- Production dependency audit: zero reported vulnerabilities at verification time.

## Not complete / not verified

- **The HD anatomy library is not complete.** There is one original articulated geometric
  mannequin and seven rough motion studies, not seven finished anatomical demonstrations.
  Fine anatomy, exercise-specific equipment, accurate joint mechanics, camera refinement,
  full-catalog animation production and human review remain necessary. There are zero
  approved demonstrations and 5,625 exercises without even a motion study.
- All 35 programs remain drafts requiring qualified coaching review, including youth
  suitability. They are starter templates, not professionally validated prescriptions.
- Difficulty tags are curated for a small initial set; other exercises show unclassified.
  Movement browsing tags are conservative name-based categories, not expert assessments.
- Private Storage policies are functional; general-purpose upload/photo-management screens
  and binary-media backup import/export are not implemented in the redesigned interface.
- Native shells, legacy passkeys/device pairing, push services, AI coaching, team assignment,
  wearable integrations and store releases are outside this web implementation.
- An exploratory legacy Node API test run could not fully execute because the original
  server's separate dependencies (including undici) were not installed. That server is not
  used by Workout; no second dependency tree was created. Its source is retained unchanged.
- No physical-device, real coaching/anatomy review, hosted migration or public-release
  verification has been performed. Browser viewport checks are not physical-device proof.
- WebGL creation failure was simulated and retained usable instructions with a fallback.
  Mid-session context loss and exhaustive slow-network coverage remain unverified.

## Evidence and storage

Latest useful screenshots and concise logs are in ignored `work/`. Final source and setup
instructions are tracked separately. `frontend/public/workout/source.zip` is a regenerated
corresponding-source deliverable, excluding local credentials, caches and restricted media.
No shared caches, other project containers, user worktrees or recovery volumes were removed.

## Anatomy continuation — 2026-10-31

Supersedes the earlier seven-study count: **17 draft clips, 0 approved, 5,615 pending**. See `ANATOMY-PRODUCTION.md` for the current model limitations and reproducible commands. The full-catalog realistic-anatomy requirement remains unfinished.

- 19 targeted rig checks pass: all 17 clips sampled over 121 frames, finite/unit transforms, bounded IK residuals, fixed segment lengths, loop closure, muscle geometry winding and equipment visibility.
- All 17 clips loaded in a 1920×1080 browser review session with individual asset requests. Reviewed a pose contact sheet and corrected reversed muscle winding, lunge steps, dead-bug arm direction, forearm plank support and prone-body alignment.
- The rendered anatomy still appears procedural. These checks do **not** establish professional anatomical or exercise accuracy.
- Storage migration applied locally; all 20 model/clip/audit files uploaded without changing user training records. Frontend source exposes no service key.
- Final production-build smoke: all 17 clips load, no JavaScript exceptions; 390px phone layout has no horizontal overflow; reduced motion starts paused; blocked model/clip requests show the load-failure message. The intentionally blocked requests produce expected network errors.
- Fork training tests: 5 pass. Local Supabase integration checks pass, including ownership isolation and revision-conflict handling. Production build passes with existing upstream chunk-size warnings. Release gate remains blocked as intended.
- Two consecutive asset generations produce identical audit/content hashes. Final useful screenshots and concise test logs are retained in ignored `work/`; no dependency tree or checkout was duplicated.
