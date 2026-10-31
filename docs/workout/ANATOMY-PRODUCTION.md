# Anatomy production status

The realism and full-catalog requirement is **not complete**. The current model is an original parametric approximation, with articulated segments rather than production-quality skin deformation. It must not be described as a medically accurate anatomical model. No demonstration has human approval.

## Current deliverables

- Shared original model: 189 meshes, 279,980 triangles, approximately 7 MB binary geometry. Individually named superficial muscle surfaces include longitudinal fiber relief/colors, tendon ends, fingers, toes, facial landmarks and deep trunk support. The authoring source is `frontend/scripts/anatomy/model.mjs`.
- 17 independently loaded original draft clips, up from seven. Added biceps curl, hammer curl, front raise, lateral raise, shrug, calf raise, forearm plank, barbell/dumbbell bench press and dumbbell Romanian deadlift.
- Equipment models include barbell/plates, dumbbells and bench. Two-link inverse kinematics constrain limb lengths and reachable targets. The source is `frontend/scripts/anatomy/movements.mjs`.
- Viewer preserves original materials, supports muscle-region highlighting, front/side/back inspection, pause, phase scrubbing, playback speed, rotate/zoom, fullscreen, reduced motion and load failure messages.
- Every one of 5,632 named exercises is listed in `production-queue.json`, arranged into 324 batches of at most 24 entries. Batches organize work; they do not imply equivalent movement or completed media. Existing aliases remain unchanged.
- Local inspection page: `/anatomy-review.html`. It is also included in the production build. Exercise selection is public catalog content only and does not access account records.

## Reproduction

From the repository root:

```sh
npm --prefix frontend run assets:original
node scripts/workout/generate.mjs
npm --prefix frontend run assets:queue
npm --prefix frontend run test:anatomy
supabase migration up --local
npm --prefix frontend run assets:upload
npm --prefix frontend run check:coverage
```

The uploader targets only the existing local instance, reads its service key in process memory, and uploads the shared model and individual clips. Public clients receive no upload privilege. The second migration adds JSON to the asset bucket MIME allowlist. Never reset a database containing user records just to refresh these assets.

## What remains

1. Replace the visibly procedural anatomy with a realistic anatomical sculpt, continuous deformation rig, accurate muscle origins/insertions and appropriate joint deformation. High polygon count alone does not establish realism.
2. Refine grips and fingers around equipment, foot roll, scapular movement, breathing, contact forces and transitions. Walking currently uses a stationary gait study; it does not yet satisfy the catalog instruction for traveling heel-to-toe walking.
3. Produce exercise-specific motion and equipment for the remaining **5,615** exercises. Even the 17 mapped drafts require visual/technique review. Do not map a generic clip to a variant without verifying stance, grip, equipment, range and instructions.
4. Record independent qualified anatomy and movement review. Automated finite-transform, limb-length, reachability and loop checks cannot establish anatomical or instructional correctness.

The full original-assets requirement is retained. No external model, licensed upstream exercise media, AI-generated anatomical photograph, or purchased asset was used. An alternative openly licensed anatomical base would require an explicit scope decision and license/provenance verification before incorporation.

## Reference and provenance

Muscle naming reference: [OpenStax, Muscles of the Pectoral Girdle and Upper Limbs](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs). No reference image, mesh or text was copied into the geometry. This reference does not validate the generated shapes.

The generator records geometry and clip SHA-256 hashes in `frontend/public/workout/anatomy-v2/audit.json`. These identify the generated asset revision; they are not review signatures. Preserve the original generation source alongside final assets.
