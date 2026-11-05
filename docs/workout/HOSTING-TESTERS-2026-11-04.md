# Sets & Strength hosting and testing — 2026-11-04

## Completed

- Deployed the existing landing page on Vercel project `setsandstrength`, team `tylers-projects-5b59182e`.
- Deployment: `dpl_SXV7VFYougrvZ88JnAsXpkQr5okc`.
- Production: https://setsandstrength.app and https://www.setsandstrength.app. Both returned HTTP 200 with valid HTTPS. DNS verified by Vercel.
- Porkbun DNS changed from apex ALIAS `pixie.porkbun.com` to A `216.150.1.1`; wildcard parking CNAME changed to `www` CNAME `d9cb539489e063e1.vercel-dns-016.com`. TTL 600. Nameservers retained.
- Current page/assets staged with `node scripts/workout/stage-website.mjs` into `work/setsandstrength-site`. This is a small deployment artifact, not a repository copy. Only the branded landing-page assets are included, excluding old upstream website pages.
- Verified landing page, linked assets, theme toggle, canonical URL, robots/sitemap and no OpenGym text in served index.
- Created Apple app `6830831694`, Sets & Strength, bundle ID `pro.gamedaysports.setsstrength`, SKU `setsandstrength-ios`, English (Canada).
- Created internal TestFlight group `8dd648ae-f8fb-4eb2-8123-d5178d677672`, Sets & Strength Testers, manual build distribution. Added `thisearlyseason@gmail.com`; verified status is No Builds Available.

## Remaining prerequisites (updated after user clarification)

- User chose the existing Supabase project `iksqlpzgdzccjqyexitk` at https://iksqlpzgdzccjqyexitk.supabase.co, using the account in Safari. Do not create the previously proposed $10/month project. Safari sign-in confirmed as tylerans+setsandstrength@gmail.com in the free GD organization. Existing project renamed Sets & Strength. No paid project provisioned.
- Browser Supabase account differs from the existing CLI session's project inventory. Do not provision through that CLI without verifying the intended account/organization.
- User explicitly approved Google Play declarations. Created app `4973711977374588882`, Sets & Strength, package `pro.gamedaysports.setsstrength`, free app. Existing Alpha closed track: `4699669757394437969`. Saved the Google Group eligibility; signed release uploaded as a draft; its opt-in link remains unavailable until publication.
- Existing Google Group `gameday-sports-app-testers@googlegroups.com` was verified directly on The Squad and saved on Sets & Strength. No other app's tester configuration was changed.
- Added tylerans@gmail.com and jevan.ans@gmail.com to external TestFlight group 8643a423-32e0-444d-a6de-065b3f6d766f, Sets & Strength External Testers. Verified 2 testers, No Builds Available. No developer permissions granted; build processing and beta review still pending.
- iOS 1.4.3 (44) uploaded successfully through Xcode; Apple processing/distribution remains pending. Android 1.4.3 (28) uploaded and validated in the Alpha release draft; Google blocks rollout on incomplete listing and declarations.
- Android applicationId, Capacitor appId, and Android package-name/URL-scheme resources now use `pro.gamedaysports.setsstrength`. Java namespace remains intact. Java 21 Gradle `processPlayReleaseMainManifest` passed; parsed merged manifest confirms new package and FileProvider authority with existing MainActivity class. The default Java 26 was incompatible with this Gradle version.

## Evidence

Latest screenshots and CLI DNS verification JSON are in ignored `work/`. Browser forms for Google Play declarations and Supabase pricing were preserved for continuation. No app production release was performed.

## Hosted backend and signed candidates

- Audited the target before changes: zero public tables, users, and buckets. Applied both existing migrations in one transaction through the signed-in SQL editor.
- Seeded 5,632 exercises, 5,632 media manifests, and 53 draft programs from the current bundled data. No existing user data migrated.
- Hosted API tests passed: synthetic confirmed-user login, adult/youth ownership, forged-owner denial, anonymous denial, direct state-write denial, concurrent save conflict/retry, private storage isolation, and catalog write denial. Removed only test-created users/files; verified zero remaining QA users/profiles/states.
- Authentication Site URL set to https://setsandstrength.app. Email confirmation remains enabled. Custom Resend SMTP enabled and verified after reload: smtp.resend.com:465, username resend, sender Sets & Strength <noreply@setsandstrength.app>.
- Resend domain added in the existing tylerans Pro workspace. Porkbun records added: TXT resend._domainkey (Resend-provided public key), CNAME rsend -> rsend.forge.rmta.net, CNAME send -> send.forge.rmta.net, TTL 600. All three resolve at Cloudflare 1.1.1.1; Resend domain verification succeeded at 13:52 local time. With explicit user approval, created Sets & Strength Supabase SMTP, sending-only and scoped to setsandstrength.app, and saved it in the target Supabase project. Recovery key is stored only in ignored work/resend-smtp-credentials.json (mode 600). Website DNS unchanged.
- Dedicated Android upload key created with user approval; recovery files in ignored backups/signing/setsandstrength, private files mode 600. Keep these permanently and back up securely.
- Signed iOS archive/IPA in backups/releases/setsandstrength-44.xcarchive and backups/releases/setsandstrength-ios-44. Xcode upload succeeded at 13:49 local time.
- Signed Android bundle: backups/releases/setsandstrength-android-28/setsandstrength-28.aab; SHA-256 cb50b9fcf03d0a6b5ffc0551bfa275a78084d2d7ffcc4d019c577baa2a3681e8. Play accepted version 28, API 24+, target SDK 36, 143 MB download.
- Verified both final signed artifacts contain the hosted endpoint and exclude the privileged backend key. Shared dist/native assets were overwritten by concurrent local development; Android candidate was isolated under work/android-release with shared dependencies reused and verified web assets copied from the iOS archive. Do not use current shared dist as proof of the store artifact.
- 28 focused test files / 156 tests passed. Updated account UI messages to remove local-only instructions.
- Updated corresponding-source packaging to exclude private chat attachments, verification screenshots, Swift/Gradle caches, Pods and redundant illustration render intermediates. Current source archive included in candidates; required license notices retained.
- Google closed release blockers: dashboard setup, full store description, sign-in/access details, financial features declaration, foreground-service declaration, health declaration. No rollout performed.
- Concise evidence: work/hosted-verification.json, work/android-release-verification.json, work/hosted-fork-tests.log, work/hosted-ios-upload.log, work/google-play-release-blockers.png, work/supabase-hosted-programs.png.

- External tester proof: work/testflight-external-testers.png. Resend proof: work/resend-domain-verified.png. Credential approval form: work/resend-key-approval.png.
- Removed isolated Android rebuildable build outputs after signed AAB verification. Shared developer caches and unrelated task evidence retained.

- SMTP end-to-end verification: Supabase signup returned HTTP 200 and confirmation_sent_at; Resend showed delivered for email 01a1a829-2ed2-760c-bd66-5f627965d007 to the user-owned QA alias. Only the test-created user was removed afterward. No inbox/read verification claimed. Evidence: work/smtp-test-result.json and work/supabase-smtp-connected.png.
