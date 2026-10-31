# Original 2D illustrated demonstrations

The active exercise and workout-player interfaces now use original SVG line drawings with red muscle highlights, four named phases, concise phase-specific cues and optional playback. There is no 3D viewer, orbit/zoom control, WebGL canvas, anatomical mesh request, or paid generation service in the active flow. Playback starts paused, including for reduced-motion users.

Previous anatomical models are retained in `assets/anatomy/archive/` as source history, outside the web/public directory and source-download ZIP. The borrowed anatomical geometry is not traced, sampled or rendered into the drawings. Existing upstream exercise artwork is not reused. Current vector sources and motion curves are original Workout work under the code's AGPL license.

## Current coverage

21 draft illustrated sequences; 0 professionally approved; 5,611 named catalog exercises remain pending. Walking was removed from the active demonstration list because the stationary prototype did not establish correct traveling heel-to-toe gait. Do not count old 3D studies as completed illustrations.

## Movement checks and corrections

These checks go beyond successful loading, but do not substitute for qualified human technique review:

- Read every active exercise's upstream instructions and selected phase-specific cues instead of displaying arbitrary instruction indexes.
- Found an upstream hammer-curl instruction that incorrectly asks for palm rotation. Corrected the fork's catalog and drawing cues to retain a neutral grip, checked against [Catalyst Athletics](https://www.catalystathletics.com/exercise/841/Hammer-Curl/). The pinned upstream source is preserved.
- Corrected dead-bug setup to upright thighs and horizontal shins, returning to tabletop between opposite-arm/opposite-leg extensions. Cross-checked the sequence against [NASM](https://www.nasm.org/resource-center/exercise-library/dead-bug).
- Deadlift drawing starts with the bar lowered; bench-press drawing starts with the load raised. End poses and cues follow those phase changes.
- Deepened squat/sumo-squat end poses to thigh level in the authored rig. Added a geometric regression check for that endpoint.
- Corrected overhead/bench press endpoints that previously stopped short of extension. Added endpoint reach checks.
- Retained lunge stepping/alternation, neutral hammer grip, toe turnout for sumo, planted support targets and distinct equipment.
- Visually inspected the 21-pose contact sheet. Artwork detail, exact gripping contacts, individual technique suitability and professional review remain unfinished. No demonstration is labeled approved.

## Sources and reproduction

- Drawing renderer: `frontend/src/workout/Illustration.jsx`
- Pose export: `frontend/scripts/anatomy/illustrations.mjs`
- Original motion authoring: `frontend/scripts/anatomy/movements.mjs`
- Generated vector-pose data: `frontend/public/workout/illustrations/`
- Review page: `/anatomy-review.html` (retained URL, now titled Illustration studio).

```sh
npm --prefix frontend run assets:illustrations
node scripts/workout/generate.mjs
npm --prefix frontend run assets:queue
npm --prefix frontend run test:anatomy
npm --prefix frontend run assets:upload
npm --prefix frontend run check:coverage
npm --prefix frontend run build
```

The upload command writes only to the existing local Supabase instance. No purchases, hosted accounts, paid assets or subscriptions are required. Historical anatomical-source tests still verify the archived assets; current illustration checks verify pose sequencing, identity, endpoints, cues and the absence of a WebGL/model dependency in the active viewer.
