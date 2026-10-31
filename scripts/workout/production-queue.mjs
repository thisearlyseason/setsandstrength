import { readFileSync, writeFileSync } from 'node:fs'
import { EXDB } from '../../frontend/src/lib/exercises-data.js'
const root = new URL('../../', import.meta.url),
  media = JSON.parse(
    readFileSync(new URL('frontend/public/workout/media.json', root)),
  ),
  byId = new Map(media.map((m) => [m.exerciseId, m]))
const groupCounts = {},
  batches = {}
const entries = [...EXDB]
  .sort((a, b) =>
    `${a.eq}/${a.cat}/${a.id}`.localeCompare(`${b.eq}/${b.cat}/${b.id}`),
  )
  .map((e) => {
    const group = `${e.eq}/${e.cat || 'unclassified'}`
    const n = groupCounts[group] || 0
    groupCounts[group] = n + 1
    const batch =
      group.replaceAll(/[^a-z0-9]+/gi, '-') +
      '-' +
      String(Math.floor(n / 24) + 1).padStart(3, '0')
    batches[batch] = (batches[batch] || 0) + 1
    const m = byId.get(e.id)
    return {
      exerciseId: e.id,
      name: e.n,
      batch,
      equipment: e.eq,
      target: e.tg,
      secondary: e.sm || [],
      sourceInstructions: `catalogue/exercises/${e.id}.json`,
      status: m.reviewStatus,
      model: m.model,
    illustrationAsset: m.illustrationAsset || null,
      motionAsset: m.motionAsset || null,
      requiredReview: [
        'anatomical landmarks and deformation',
        'exact equipment and grip',
        'stance and laterality',
        'range and joint path',
        'ground and equipment contacts',
        'start and end transitions',
        'instruction correspondence',
        'qualified movement review',
      ],
      approval: null,
    }
  })
writeFileSync(
  new URL('docs/workout/production-queue.json', root),
  JSON.stringify(
    {
      schemaVersion: 1,
      note: 'Production inventory only. Batching does not imply equivalent movements or completed demonstrations.',
      batchSize: 24,
      batches,
      entries,
    },
    null,
    2,
  ) + '\n',
)
console.log(
  `Indexed ${entries.length} exercises in ${Object.keys(batches).length} review batches; no additional motion coverage claimed.`,
)
