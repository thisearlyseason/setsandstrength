> Current visual direction: original 2D drawings. The 3D workflow below is historical; see [ILLUSTRATIONS.md](ILLUSTRATIONS.md) for active setup and coverage.

# Anatomical model and original motion production

The active viewer now uses **Z-Anatomy / BodyParts3D anatomical surfaces**, replacing the procedural body. No asset purchases, subscriptions, cloud model-generation services, or hosted accounts were used. The user authorized the free open-license base; exercise movements remain originally authored for Workout.

## Base model and license

- Publisher: [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy), with the selected FBX files distributed by [Lluís Vinent's Z-Anatomy application repository](https://github.com/LluisV/Z-Anatomy).
- Selected sources: muscular and skeletal systems only. Exact commit and SHA-256 hashes: `assets/anatomy/z-anatomy/source.json`.
- License: CC BY-SA 4.0 for the adapted Z-Anatomy meshes/rig. Attribution, modification notice, license links, and the upstream credit chain are retained in `assets/anatomy/z-anatomy/NOTICE.txt` and the viewer's public attribution link.
- Source notice identifies separately restricted organ/inner-ear material. Those systems and identified structures are excluded, alongside annotation boxes and muscle-attachment patches. The complete input FBX files remain local and ignored; they are excluded from the corresponding-source ZIP. The selected derived mesh, conversion code, source URLs/hashes and attribution are included.
- Application code remains AGPL-3.0-or-later. Its license does not replace the anatomy asset license. No source animation was used.

The current export contains 929 selected structures and approximately 1.62 million triangles, grouped into region meshes. Approximately 53 MB of binary geometry is split into files below the Storage bucket limit. The shared model stays cached while switching exercises; each viewer has independent skeleton/material state, and each selected movement loads separately.

This is an anatomical atlas adaptation, **not a reviewed exercise-demonstration library**. Automatic skin weights, proportion retargeting, equipment grip and joint deformation still need refinement and qualified review. The atlas's credibility does not validate our rig or movements.

## Current motion coverage

**22 original draft clips; 0 approved; 5,610 demonstrations pending.**

The latest additions are barbell curl, alternating dumbbell curl, loaded calf raise, standing dumbbell overhead press and sumo squat. They have distinct motion/equipment settings and catalog IDs. Sumo squat includes wide stance, toe turnout and hands at the chest; alternating curls use separate arm phases. All remain drafts.

Every named catalog exercise has a production entry in `production-queue.json`, grouped into small batches. Inventory coverage is not demonstration coverage. Never assign a generic clip to an unrelated exercise to increase the count.

## Reproduction

From the repository root:

```sh
python3 scripts/workout/fetch-anatomy.py
npm --prefix frontend run assets:original
npm --prefix frontend run assets:anatomical
node scripts/workout/generate.mjs
npm --prefix frontend run assets:queue
npm --prefix frontend run test:anatomy
npm --prefix frontend run assets:upload
npm --prefix frontend run check:coverage
```

The fetcher uses pinned public URLs and verifies the original source hashes. There are no payment/account steps. The importer selects structures, corrects reflected winding, changes centimeters to meters, welds vertices, assigns materials and skin weights, and writes glTF. The upload command targets only the existing local Supabase instance. Do not reset a database containing user records to refresh media.

Review the local build at `/anatomy-review.html`. Use pause, phase scrubbing, side/front/back cameras, muscle highlighting and fullscreen to inspect deformation. The importer and motion sources are under `frontend/scripts/anatomy/`; the original procedural source is retained for history and original equipment generation, but its body is not included in the active model.

## Remaining production gates

1. Refine skin weights and joint deformation, particularly shoulders, hips, wrists and ankles. Add detailed finger grips and scapular motion; inspect collision and contact over the complete cycle.
2. Refine the existing movement curves against each exercise's technique instructions. Walking is still a stationary gait study, not validated traveling gait.
3. Produce the remaining 5,610 exercise-specific demonstrations, with correct equipment, stance, laterality, range and transitions.
4. Record qualified human anatomy and strength-and-conditioning reviews for each finished asset/variant. Automated checks establish file integrity and mathematical constraints, not instructional correctness.

Public-launch validation remains blocked until every demonstration and program satisfies the review requirements.
