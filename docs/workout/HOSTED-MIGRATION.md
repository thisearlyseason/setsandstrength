# Moving Workout to hosted Supabase

No hosted service has been provisioned. Public launch remains blocked by the animation
and program review requirements in `coverage.json`.

1. Finish and review original media and training content. Preserve the AGPL notices and
   publish corresponding modified source. Refresh the downloadable source archive for
   each deployed build. The upstream exercise artwork has separate terms and is excluded
   from this app and source package.
2. Create the hosted Supabase project only when authorized. Apply the checked-in migrations
   to an empty project, review differences, then import public catalog/template/media data.
   Seed generation currently sets draft statuses; preserve approved content explicitly.
3. Move Auth users through Supabase's supported Auth migration process, preserving user
   IDs/password hashes when supported. Otherwise use an explicit invitation/password-reset
   migration and a controlled ownership-ID mapping. Never recreate users and hope their
   new UUIDs match existing profile owners.
4. Copy training profiles before profile states, retaining IDs, revisions, write IDs,
   timestamps and JSONB. Quiesce writes or perform a final incremental transfer before
   switching clients. Keep the old local instance as the recovery baseline.
5. Transfer object bytes and metadata for both Storage buckets, preserving paths and
   checksums. Public original assets and private uploads have different access policies.
   Rewrite any environment-specific references deliberately; a database dump alone does
   not transfer stored files.
6. Configure production Auth URL/redirect allowlists, verified email delivery and email
   confirmation. The development confirmation setting is not a production choice. Update
   the frontend's public Supabase URL/key and redeploy the web build only when authorized.
7. Run ownership/concurrency tests against dedicated staging users, verify youth profile
   isolation, authentication, offline recovery, imports, program enrollment and media
   playback. Compare row counts, workout IDs and asset checksums with the local backup.
8. Cut over only after acceptance. Keep rollback backups until data reconciliation is
   complete. Production access, payments, provisioning and deployment are separate actions.

The current library is a procedural motion-study pipeline, not a completed anatomical
asset library. Do not describe the pending exercises as HD demonstrations. Movement and
difficulty browsing classifications are incomplete and explicitly show unclassified
entries. A coach/team assignment service, teen login, wearables, payments and AI coaching
are not implemented.
