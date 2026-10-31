import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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
const { error } = await db.storage
  .from('exercise-assets')
  .upload(
    'anatomy.gltf',
    readFileSync(new URL('../public/workout/anatomy.gltf', import.meta.url)),
    { contentType: 'model/gltf+json', upsert: true },
  )
if (error) throw error
console.log('Original draft anatomy asset uploaded to local Supabase Storage.')
