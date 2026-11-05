# Illustration queue and unattended worker

Audit date: 2026-10-31. Visual style approved; anatomical accuracy is not approved.

## Why previous batches stopped

The saved workflow used built-in image-generation calls during active chat turns. `catalog-queue.mjs` produced a queue file but did not execute it. There was no persistent consumer, scheduled service, or provider batch submission. Prior small batches ended with the assistant's turn. No exhausted quota or hard tool/turn limit is established by the saved evidence. Human review gates publication, not continued candidate generation.

The built-in chat image tool has no supported shell submission interface available here. A standalone process cannot invoke that chat tool. This implementation prepares a separate Images API workflow; it does not assume ChatGPT subscription benefits fund API requests. No live API request or provider calibration has been performed.

## Reconciliation

- 6,554 JSON records: **5,632 named canonical exercises + 922 aliases**. Aliases do not create jobs.
- Two model variants per canonical ID: **11,264 sets**, not 11,238.
- A set is one stable exercise ID plus one male/female variant. It contains one composed master, the explicit required pose crops (one, two, or more), and one thumbnail. Both variants together are two sets.
- **30 existing sets** = 15 exercise IDs × two variants; 30 distinct active master hashes, 66 pose images, 30 thumbnails. Prior rejected/corrected versions are retained as history, not extra completed sets.
- **11,234 remaining sets**. Zero approved; eight existing variants have recorded movement/anatomy blockers.
- Six repeated names have distinct canonical IDs. They are not collapsed on name alone; equipment/variant differences need reconciliation before any intentional asset reuse. No ID changed.
- 935 canonical records contain a `femaleVariant` reference. These upstream media/alias associations are not extra jobs; each canonical ID still gets the selected male/female replacement.
- 5,386 records lack detailed muscle maps. Do not invent detailed mapping from a target label and call it reviewed.
- Two remaining sets now have explicit calibration pose plans; 11,232 still require planning. Generic two-pose generation of the entire queue would violate the requested workflow.

## Implemented

`scripts/illustrations/worker.py` uses SQLite WAL, Python's standard library and the existing Pillow installation for PNG integrity checks. It is a durable **single-host, single-writer** worker, not a distributed service. It stores only media workflow metadata and references canonical exercise files; it is not another exercise database.

Runtime files live in ignored `data/illustration-worker/`: queue database, receipts, config and log. Masters use the existing `assets/exercise-illustrations/generated/` convention. No dependency installation or hosted service is needed. The computer must remain awake with network access; it does not generate while powered off. Restarting resumes the durable queue.

States: `pending`, `processing`, `generated`, `failed`, `reviewed`. Pending jobs without a plan are ineligible. Sync reads the existing manifest and excludes completed variants. Planning snapshots metadata/style hashes; changed inputs require replanning. Each request has a durable reservation before submission. A process lock prevents competing workers. Files are atomically written and hashed, followed by a receipt and database commit. A saved receipt recovers without another generation call. An interrupted request without a receipt is quarantined, retains its budget reservation, and pauses the queue because provider completion/charges may be unknown. A master saved just before a receipt failure is preserved for manual reconciliation, never silently overwritten.

Only explicit HTTP 429 rejections retry automatically, respecting Retry-After and exponential delay with an attempt limit. Other failures stop for diagnosis rather than risk repeated charges. Byte-identical outputs across exercise variants are quarantined. This does not detect every semantic near-duplicate; visual review remains necessary.

No generated asset automatically becomes production media. The worker exports candidates through the existing intake/optimization/review/promotion workflow. Existing approval requirements remain intact. Review decisions are synchronized from the manifest; the worker cannot grant anatomy approval.

## Commands

Run from the existing checkout:

```sh
python3 scripts/illustrations/worker.py sync
python3 scripts/illustrations/worker.py plan assets/exercise-illustrations/worker-calibration-plans.json
python3 scripts/illustrations/worker.py status
python3 scripts/illustrations/worker.py preflight
python3 scripts/illustrations/worker.py pause
python3 scripts/illustrations/worker.py resume
```

`resume` changes queue state only; it neither launches a process nor authorizes a paid request. The worker defaults to disabled, zero budget and zero request allowance.

After explicit paid authorization, configure a private local `data/illustration-worker/config.json` from `scripts/illustrations/worker-config.example.json`, and supply `OPENAI_API_KEY` in the launching process environment. Never put the key in source, the frontend, or chat. Confirm API billing/model access and any required organization verification. No new hosted account has been provisioned.

```sh
python3 scripts/illustrations/worker.py preflight
python3 scripts/illustrations/worker.py start
python3 scripts/illustrations/worker.py status
python3 scripts/illustrations/worker.py pause
python3 scripts/illustrations/worker.py stop
```

`start` launches a detached subprocess, verifies its PID/heartbeat, and returns. `stop` requests a clean stop after saving the current request. Pause also allows the in-flight request to finish. Neither requires killing the process. After a computer restart, run `start` again; no login agent has been installed. Do not run manual manifest edits/promotion concurrently with sync/intake.

To stage newly generated candidates for review:

```sh
python3 scripts/illustrations/worker.py export data/illustration-worker/completed.json
python3 scripts/illustrations/intake-batch.py data/illustration-worker/completed.json
python3 scripts/illustrations/process.py
node scripts/illustrations/catalog-queue.mjs
```

Use the existing illustration review page, then the existing explicit promotion workflow. This export does not approve anatomy. Before retrying an uncertain request, reconcile its receipt/master and provider billing; do not erase its reservation or reset it to pending blindly. A failed job with a duplicate master likewise needs explicit investigation, not automatic retries.

## Cost and storage: what is measured

Measured active media: **47,919,903 master bytes** and **2,288,222 optimized delivery bytes** across 30 sets. That is about 1.60 MB master + 76 KB delivery per set. Linear projection for all 11,264 sets: about **18.0 GB masters + 0.86 GB delivery**, excluding retained correction history. This is a rough storage projection, not an exact forecast: pose counts and equipment complexity vary. Final masters are deliverables; temporary worker tests stay far below the 2 GB disposable-artifact budget.

Built-in generations supplied no token or billing receipts, so their actual monetary cost and a measured API per-set cost remain **unknown**. The new worker records raw API usage and request IDs, derives cost using a saved rate table, and keeps actual provider invoice cost explicitly unknown rather than labeling estimates as billed amounts.

Official standard synchronous pricing checked on 2026-10-31: text input $5/M tokens, image input $8/M, image output $30/M. The lower $2.50/$4/$15 figures are Batch rates and do not apply to this synchronous worker. The guide's high-quality 1536×1024 comparison estimate is $0.165 output per image. At that estimate, **11,234 remaining masters would be about $1,853.61 output-only**, plus prompts, corrections and any future reference-image inputs. This is a published-rate illustration, NOT a measured pilot bill or a quote. The adapter uses text prompts; matching the approved style through this separate API must be visually calibrated before bulk execution.

Sources: [pricing](https://developers.openai.com/api/docs/pricing), [image generation and cost calculator](https://developers.openai.com/api/docs/guides/image-generation#calculating-costs), [model snapshot and endpoint support](https://developers.openai.com/api/docs/models/gpt-image-2).

**Proposed initial authorization: at most two calibration requests, with a $5 spending ceiling; not authorized or activated.** Current cap is $0. Local guards enforce request count and reserve a configurable amount before each call. An API request has no client-side dollar ceiling, so a reservation is NOT an absolute provider billing cap. A true hard $5 ceiling also needs a verified provider-enforced spending control; alert-only budgets are insufficient. Until that control/access is established, keep live generation disabled. After calibration, use measured usage and visual review to estimate the whole queue and agree any further budget. No paid bulk generation has started.

## Validation and remaining blockers

Ten offline worker tests cover two-variant completion/resume, budgets/pause, duplicate quarantine, ambiguous timeout handling, receipt recovery, missing-receipt interruption, bounded 429 retries, metadata/style invalidation process locking, and a detached heartbeat/clean-stop check. Seven existing illustration pipeline tests pass. An isolated detached worker processed two test jobs using copies of existing artwork, maintained heartbeats after the launching command returned, and was then stopped cleanly. Test assets were removed; no placeholder or duplicate test assets entered production.

Live provider end-to-end validation remains blocked by **missing OPENAI_API_KEY, unconfigured API billing/model access, and no approved paid allowance/provider hard spending control**. No live generation worker is running. Bulk execution also requires the remaining exercise-specific pose plans and provider style calibration. Accuracy review is still required before publication; style approval does not satisfy it.

Back up final masters, manifest/plans and the runtime database/receipts. For a consistent database backup use SQLite's backup API while running, or stop the worker before copying the database together with its WAL files. Never delete this runtime directory as disposable scratch.
