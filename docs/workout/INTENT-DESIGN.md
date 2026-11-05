# Workout / Intent visual direction

The existing Workout app now uses a near-black, off-white, and acid-lime visual system inspired by the supplied mobile references. Existing training, profile, catalogue, and persistence flows remain in place. The Workout brand is retained; Form / Field was a visual reference, not a product rename.

- App: `frontend/src/workout/intent.css`, imported only by the Workout entry point.
- Landing page: `website/index.html`, `website/intent.css`, `website/store-links.js`.
- Store URLs: set `listings.apple` and `listings.google` in `website/store-links.js` when this product's listings are live. Empty or invalid URLs retain a visible coming-soon state. No upstream openGym store IDs are used on the new homepage.
- Local preview: app at http://127.0.0.1:5173; website at http://127.0.0.1:4174 (plain static server).
- Download buttons are not live yet. Native builds, device installation, store submission, and deployment were not performed.
- Existing exercise illustrations and their review labels remain independent of the decorative campaign artwork.

## Artwork

Generated using the built-in imagegen tool, stored at `frontend/public/workout/intent-hero.png` and `website/intent-hero.png`. It is decorative promotional imagery, not an exercise technique demonstration.

Final prompt:

> Use case: ads-marketing. Create a premium fitness app hero BACKGROUND image, landscape 1536x1024. Near-black studio background, grayscale photographic athletic adult woman in black training clothes performing a controlled reverse lunge, full body with both feet visible, placed on the RIGHT HALF of frame. Dramatic silver rim lighting and authentic athletic anatomy. A luminous acid lime-yellow translucent silk-like energy ribbon spirals elegantly around her, like fine long-exposure light trails. Subtle olive topographic contour lines in background. Left 45 percent almost black empty negative space for live UI text. Moody high-contrast luxury sports editorial, off-black #080b09 and neon #d7ff3f palette. No text, no letters, no logos, no UI, no watermark.

## Verification

- Workout test suite: 3 files, 9 tests passed, including session completion and backup round trips.
- Production build: passed; existing large upstream bundle warnings remain.
- Browser: mobile Home, Train, Library, Progress, Profile, plan modal, and an in-memory workout fixture visually checked. Fixture was discarded by navigation; no account data was changed.
- Interactions: Home's Find my plan opens plans without requiring sign-in; Running filter changes the featured plan and cards; Explore plan opens its detail dialog; Escape dismisses it; exercise search filters results; landing Get the app navigates to downloads.
- Layout checks: no horizontal overflow in tested 390px app progress/profile/player views, 320px library and landing views, or 1440px landing view.
- Screenshots and concise verification evidence: `work/style-review/`.
- Authentication, cloud sync, and physical iOS/Android behavior were not tested in this visual pass.
