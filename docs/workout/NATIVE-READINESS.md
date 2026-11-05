# Native readiness — 2026-11-04

Sets & Strength is a native development candidate, using `frontend/src/workout/entry.jsx` → `WorkoutApp.jsx` inside Capacitor. The website remains a landing page; meal planning and sleep tracking are deferred. This report separates implementation, simulator checks, physical checks, and release gates. No store submission or production deployment was performed.

## Blockers resolved

- Registered and built the approved new iOS identity `pro.gamedaysports.setsstrength`, team `3C4T9P67ZN`, with HealthKit and App Group `group.pro.gamedaysports.setsstrength`. The signed development build replaces the upstream identifier as the normal project configuration. The old unavailable `ch.opengym.app` is no longer a signing blocker for this new app.
- Android now uses the matching application ID. Debug installs separately as `pro.gamedaysports.setsstrength.test`; its Java namespace remains unchanged. The upstream installed app and its data were preserved. Existing accounts restore their records in the new app after sign-in; unsynced data in the old installation must be exported/imported intentionally.
- Builder hard constraints now cover support equipment, uncertain seated/accessory metadata, upper-body composites, movement synonym families and unknown restrictions. Goal/experience change the prescription; duration includes work, rest, setup, transitions and warmup. Weekly frequency deficits drive selection, with explicit shortages. Recent workload and preferences rank only eligible records. Generation, swap and save validate IDs.
- In-workout swaps preserve completed rows and completed limbs, transfer only remaining work, and retain the saved constraints. Starting another workout cannot silently discard a saved-session edit.
- Saved-session editing is reachable from expanded Workout Log records. Review precedes Save changes; dates, IDs, timestamps and unknown metadata survive. Cancel/discard and concurrent deletion are handled. Normal logging now exposes cardio minutes/speed and independent left/right fields when the recorded mode needs them. Warmups and optional ratings are editable without opening them during quick logging.
- Progress uses completed limbs and metric-specific records, canonical speed/distance conversions, consistent warmup exclusion, and separate measured load/estimated 1RM. Rating views have selectable scopes, declared axes, minimum data and accessible text. Muscle coverage, recovery context, cardio time and monthly comparisons use the same logged facts and profile-specific exercise catalog.
- Home has an editable weekly session target, calendar-week progress, body goal and local steps. Body goals preserve canonical precision across unit changes and unrelated saves. Steps are read only after an explicit local permission action; unavailable data is distinct from zero and never synced.
- Coach handles native background interruption, timeout, profile changes, sparse history and midnight refresh. Same-date sessions are ordered by recorded times. Answers render calculated facts and source links; model output cannot apply changes or invent numbers.
- Exercise merges retain alias-edge facts and converge across conflicting simulated clients without duplicating sets. User-owned canonical validation and atomic stale-preview failures preserve data.
- Local photos survive a clean sign-out/sign-in without appearing in another account. The device-only retention stash is account/profile scoped, not an adoption candidate or cloud upload. A physical A→B→A regression exposed the earlier file-loss bug and verified the fix.

## Feature matrix and normal routes

“Working” describes reachable implemented flows. It does not imply that every hardware/accessibility combination has been certified. Web application screens are out of scope throughout.

| Feature / route | iOS | Android | Code evidence |
| --- | --- | --- | --- |
| Home `/` | Working; current full dashboard hardware journey partial | Working; goals, local steps and real profile exercised | `WorkoutApp.jsx`, `home-insights.js`, `BodyGoal.jsx`, `LocalSteps.jsx` |
| Builder `/builder`, Plans `/plans`, logging `/workout` | Working; physical earlier candidate and current iPhone simulator journey | Working; physical constrained build/swap/save/start/log | `WorkoutBuilder.jsx`, `builder.js`, `session-swaps.js`, `training.js` |
| Local Coach `/coach` | Working guided mode; ready bridge on simulator, physical ready model unverified | Working; physical AICore download, ready/offline inference, disabled mode and interruption | `LocalCoach.jsx`, `local-inference.js`, native `OnDeviceAIPlugin` adapters |
| Exercise records `/exercise-progress` | Working; shared calculation and UI regressions; full modality hardware matrix unverified | Working; shared regressions and physical progress views | `ExerciseProgress.jsx`, `records.js`, `analysis.js` |
| Analysis, recovery, monthly review `/progress` | Working; shared regressions and simulator log edit | Working; same-day sessions, no-history, ratings, accessible table and after-sync edit verified | `TrainingAnalysis.jsx`, `RatingExplorer.jsx`, `RatingRadar.jsx`, `analysis.js` |
| Saved-session edit from `/progress` → `/workout` | Working; iPhone simulator review/save journey | Working; physical review/save and database verification | `WorkoutLog.jsx`, `SavedSessionEditor.jsx`, `session-edit.js` |
| Body check-ins and goals `/progress`, `/` | Working; shared date/unit tests; complete physical flow unverified | Working; physical entry/edit/delete, charts and unit round trip | `CheckIns.jsx`, `BodyGoal.jsx`, `home-insights.js` |
| Photos `/progress-photos` | Working; earlier physical import/compare/delete and denied-camera recovery | Working; current physical native denial/import/compare/delete and account isolation | `ProgressPhotos.jsx`, `progress-photos.js`, photo retention/store modules |
| Duplicate merge `/merge-exercises` | Working; shared conflict/replay regressions | Working; physical preview/confirm and preserved persisted sets | `DuplicateExerciseMerge.jsx`, `exercise-merge.js`, `sync-merge.js` |
| Interval timer `/intervals` | Working; physical background and simulator controls | Working; physical force-close catch-up | `Intervals.jsx`, `intervals.js` |

Recovery is an explainable elapsed-time/workload guide, not measured physiological readiness. Weekly frequency is a requested planning target; when the catalog or available days cannot support it, the preview reports the shortage. No undefined Grit/points or new Bloodwork workflow was introduced.

## Latest physical Pixel evidence

Pixel 9 Pro XL, Android 17 beta. Latest tests used the approved new debug package. WebView automation ran inside the installed native app; permission dialogs, picker and confirmations used native controls. No personal photos were used.

- New-ID account sign-in restored original workout UUIDs. Native model pause interrupted the request safely, preserved local facts and re-enabled Ask.
- DB-only/no-bench eligibility and swaps were checked on the phone. A completed row stayed, two pending rows transferred, with no third duplicate.
- Native Camera “Don't allow” was selected. Import remained usable; two tiny synthetic front images compared side by side, selecting Side hid Front, and native delete confirmations removed both private JPEGs.
- Account A→B→A: two private files retained, B displayed zero images/no adoption dialog, A restored both loaded images. Deletion subsequently left zero private JPEG files.
- Actual user-scoped merge rewrote one session's three rows to the selected canonical ID, preserving the two original workouts and 12 logged rows. Alias `5469 → 6147` persisted; shared catalog unchanged.
- Actual saved-session edit after sync: same two workout IDs and original date/start/end, 12 logged rows, 11 working rows after marking one warmup, nine rated rows. Edited load 20 lb; working volume 375 lb × reps. Review preceded Save. See `pixel-session-edit.json`.
- Mobile accessibility regression: five table column headers, ten muscle row headers and 40 data cells remained exposed on the phone after repairing hidden mobile headers.
- Explicit local step permission/read worked; only readiness booleans were retained. A separate native step-only denial was exercised earlier. No raw step reading was copied into evidence or account sync.

Earlier physical candidate evidence remains separate: AICore initial download was disclosed and explicitly approved, then inference succeeded in Airplane Mode ON/Wi-Fi OFF, no default network and no USB backend route. A full constrained build/swap/save/log/citation journey and disabled-model repeat passed. Timer force-close catch-up displayed 64 seconds versus approximately 63.7 host seconds. Body metric entry/edit/delete, 30/90/all values and 180.2 lb → kg → 180.2 lb precision round trip passed. These earlier results are not a fresh airplane-mode run of the final bundle.

## iOS evidence

Latest iPhone 17 Pro simulator native suite: **six passed, six physical-only skipped, zero failures**; result `Test-AppUITests-2026.11.04_14-30-09--0600.xcresult`. It covers authenticated workout/save/log/citation, saved-session edit/review/save, keyboard, single/weekly previews, guided/disabled model and interval background/reset. Focused advanced-row tests and final package builds follow this suite; advanced live cardio/side fields were not physically retested. The keyboard viewport asserts scale 1.0 ± 0.05 and retains pinch zoom.

Earlier physical iPad Pro 12.9-inch third generation (`iPad8,7`, iPadOS 26.7.1) used the approved isolated QA identity. Authenticated workout/citation plus photo import/compare/delete: two tests, zero failures (`10-59-22` result). Full airplane-mode authenticated journey: one test, zero failures (`11-03-17` result); radios restored. Camera denial recovery and interval background controls passed. This hardware correctly reported unsupported Foundation Models. The user made only the Pixel available for the final continuation, so these iPad results precede the final source and new normal identity.

The M5 iPad simulator previously returned a ready Foundation Models response and passed backend-offline guided journeys. Simulator readiness does not establish physical Apple model behavior. Explicit simulator mode temporarily omits the ML Kit framework that lacks an arm64 simulator slice; normal seven-plugin device configuration is restored afterward.

## Final automated checks

- Full frontend: **577 files, 6,771 tests passed**, zero failures (`npm --prefix frontend test`).
- Separate runners: **31 Android JVM**, **59 WatchCore**, **32 Node anatomy** tests passed.
- `VITE_WORKOUT=1 npm --prefix frontend run build:mobile`: passed, including native bundle checks.
- Android Play and sideload debug assembly: passed with Java 21; both package identities verified.
- Normal iOS development signing/build: passed; `codesign --verify --deep --strict` passed with the approved ID, team, App Group and HealthKit.
- `git diff --check`: passed. Native XCTest result boundaries are stated above; six physical-only checks were skipped, not passed.

Concise command receipts and JSON proofs are beside this report in `verification-2026-11-04/`. After verification, generated `dist`/native public staging copies and intermediate caches were removed. Regenerate them with the mobile build command before another native rebuild. Current APKs and the signed development app were retained.

## Persistence and files changed

No SQL migration. Forward-compatible optional fields in existing revisioned profile JSON include `bodyGoalKg`, `trainingGoals.sessions`, `exerciseMergeEdges`, `exerciseIdAliases`, builder constraints/prescriptions and weekly `planGroupId`. Existing `_weightSource` preserves precision without inventing historical accuracy. Photos' bytes and `localPhotosOnly` retention are device-local; revisioned photo metadata follows existing account scope. Coach prompts/responses remain ephemeral and separate from sync. No remote inference fallback or prompt logging is added.

Main source groups (relative to repository):

- `frontend/src/workout/`: builder/coach/progress/analysis/guidance/metrics/photos/merge/timer screens and rules; new `BodyGoal`, `LocalSteps`, `RatingExplorer`, `RatingRadar`, `SavedSessionEditor`, `AdvancedSetRow`, `home-insights`, `session-swaps`; focused tests; `WorkoutApp.jsx` route and normal-flow wiring.
- `frontend/src/store/useStore.js` and related tests; `frontend/src/lib/` merge, units, session/model, photo/cache and native health integration.
- iOS/Android native AI and health plugins, permission declarations, approved app IDs/App Group, build configuration and identity regression tests.
- Native XCTest journeys, guarded disposable-account runner, simulator configuration and test discovery. The existing web Docker CSP hash was corrected; landing-page UI was not redesigned.

Existing unrelated checkout changes, including illustration work, were preserved. The verification JSON lists final check counts and package results.

## Remaining verification gates and exact manual steps

These are verification limits, not resolved by another compile: physical Apple ready-model hardware, successful camera capture, spoken VoiceOver/TalkBack, external keyboard and every tablet/orientation combination. Conflicting multi-client merges are regression simulations plus a real single-Pixel merge, not two-native-device conflict certification. Store distribution/upload/publication is outside this run.

**Pixel 9 Pro XL:** install the current debug APK, sign into a disposable account online and let the catalog cache finish. In Coach inspect capability; if download is needed, review the disclosure and approve intentionally. Wait for Ready. Remove USB API reverse routes, enable Airplane Mode and explicitly turn Wi-Fi off. Cold-reopen; build “35 minutes, upper body, dumbbells only, no bench,” inspect every movement, swap, save, start, log and finish. Ask what changed and open its session citation. Disable the model and repeat in Guided local mode. Background a running request and verify interruption/retry. Restore original radios. Import two same-pose dated photos, compare, deny Camera then retry Import; separately test a successful capture and delete it. Exercise cardio and partial left/right logging, review/edit a saved session with a warmup, then inspect totals after sync.

**iPad:** use the new signed development build with its matching App Group. On the 2018 iPad expect Unsupported and usable Guided local mode; no download makes that hardware eligible. On an Apple Intelligence-capable physical iPad, complete disclosed OS model setup, verify Ready, disabled/unavailable/interrupted states and the same airplane-mode workflow. On both, test timer background plus force-close/reopen, photos and permission denial. Final shared changes/new identity still need a physical iPad repeat.

**Both:** create two same-date sessions whose combined three chest working sets credit one day; warmups do not count, untrained muscles say “No training logged.” Edit on another client and resync. Preview/cancel/confirm a merge, reconnect an older offline client and verify no duplicate sets. Navigate charts/tables, dialogs and optional ratings with VoiceOver/TalkBack and keyboard in portrait/landscape. Compare source dates, sample sizes, units and missing coverage.

## Cleanup

The two final disposable local accounts and credential fixtures were deleted after persisted verification. New debug-app data, own imported source images, picker XML and task USB routes were removed. The redundant old task debug package was uninstalled; the upstream normal app/data were untouched. The downloaded system model was retained. No radios were changed in this final continuation. Rebuildable task caches are removed after final builds; current packages, signed development app and concise evidence are retained. No production records were changed.
