import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
const env = JSON.parse(
  execFileSync('supabase', ['status', '-o', 'json'], {
    cwd: new URL('../../', import.meta.url),
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)
if (!/^http:\/\/(127\.0\.0\.1|localhost):55321$/.test(env.API_URL))
  throw Error('This uploader only targets the local Workout instance')
const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const studies = JSON.parse(
  readFileSync(new URL('../src/workout/studies.json', import.meta.url)),
)
const rows = Object.values(studies).map((manifest) => ({
  exercise_id: manifest.exerciseId,
  manifest,
  review_status: manifest.reviewStatus,
}))
const { data: reviewed, error: reviewError } = await db
  .from('exercise_media')
  .select('exercise_id')
  .in(
    'exercise_id',
    rows.map((r) => r.exercise_id),
  )
  .eq('review_status', 'approved')
if (reviewError) throw reviewError
if (reviewed.length)
  throw Error(
    'Refusing to replace approved manifest records with generated drafts',
  )

const publicRoot = new URL('../public/workout/', import.meta.url)
let uploaded = 0
for (const version of ['anatomy-v2', 'anatomy-z1']) {
  const assetRoot = new URL(version + '/', publicRoot)
  const model = JSON.parse(readFileSync(new URL('model.gltf', assetRoot)))
  const files = [
    'model.gltf',
    ...model.buffers
      .filter((b) => !b.uri.startsWith('data:'))
      .map((b) => b.uri),
    'audit.json',
  ]
  files.push(
    ...readdirSync(new URL('motions/', assetRoot)).map(
      (name) => 'motions/' + name,
    ),
  )
  if (version === 'anatomy-z1') files.push('NOTICE.txt')
  for (const file of files) {
    const { error } = await db.storage
      .from('exercise-assets')
      .upload(version + '/' + file, readFileSync(new URL(file, assetRoot)), {
        contentType: file.endsWith('.gltf')
          ? 'model/gltf+json'
          : file.endsWith('.json')
            ? 'application/json'
            : 'application/octet-stream',
        cacheControl: '0',
        upsert: true,
      })
    if (error) throw error
    uploaded++
  }
}
console.log(
  `Uploaded ${uploaded} model, motion and attribution files to local Supabase.`,
)
const { error: manifestError } = await db
  .from('exercise_media')
  .upsert(rows, { onConflict: 'exercise_id' })
if (manifestError) throw manifestError
console.log(
  `Updated ${rows.length} draft media manifest records; training records unchanged.`,
)
