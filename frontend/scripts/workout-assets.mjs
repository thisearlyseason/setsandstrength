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
const publicRoot = new URL('../public/workout/', import.meta.url)
const media = JSON.parse(readFileSync(new URL('media.json', publicRoot)))
const { data: reviewed, error: reviewError } = await db
  .from('exercise_media')
  .select('exercise_id')
  .eq('review_status', 'approved')
if (reviewError) throw reviewError
if (reviewed.length)
  throw Error('Refusing to replace approved media with generated drafts')
const drawings = media.filter((m) => m.illustrationAsset)
for (const m of drawings) {
  const file = m.illustrationAsset.replace('/workout/', '')
  const { error } = await db.storage
    .from('exercise-assets')
    .upload(file, readFileSync(new URL(file, publicRoot)), {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true,
    })
  if (error) throw error
}
for (let i = 0; i < media.length; i += 500) {
  const rows = media
    .slice(i, i + 500)
    .map((manifest) => ({
      exercise_id: manifest.exerciseId,
      manifest,
      review_status: manifest.reviewStatus,
    }))
  const { error } = await db
    .from('exercise_media')
    .upsert(rows, { onConflict: 'exercise_id' })
  if (error) throw error
}
const catalog = JSON.parse(readFileSync(new URL('catalog.json', publicRoot)))
const { error } = await db
  .from('exercise_catalog')
  .upsert({ id: '0313', metadata: catalog['0313'] }, { onConflict: 'id' })
if (error) throw error
console.log(
  `Uploaded ${drawings.length} vector sequences, synchronized media metadata and corrected hammer-curl instructions. Training records unchanged.`,
)
