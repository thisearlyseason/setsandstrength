// Disposable accounts are restricted to this project's local Supabase instance.
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
const root = new URL('../../', import.meta.url)
const file = new URL(process.env.NATIVE_QA_ACCOUNT_FILE || 'work/native-qa.json', root)
if (!file.href.startsWith(new URL('work/', root).href) || !file.pathname.endsWith('/native-qa.json')) throw Error('QA account fixtures must stay under work/ and be named native-qa.json')
const env = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }))
if (env.API_URL !== 'http://127.0.0.1:55321') throw Error('This test requires the local Workout instance')
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
if (process.argv[2] === 'cleanup') {
  if (existsSync(file)) {
    const fixture = JSON.parse(readFileSync(file, 'utf8'))
    const { data, error } = await admin.auth.admin.getUserById(fixture.userId)
    if (error) throw error
    if (data.user.email !== fixture.email || !/^native-ui-\d+@example\.test$/.test(fixture.email)) throw Error('Refusing to remove an account not owned by this test')
    const removed = await admin.auth.admin.deleteUser(fixture.userId)
    if (removed.error) throw removed.error
    unlinkSync(file)
  }
} else {
  if (existsSync(file)) throw Error('A QA fixture already exists; clean up that test first')
  mkdirSync(new URL('.', file), { recursive: true })
  const email = `native-ui-${Date.now()}@example.test`, password = crypto.randomUUID() + '!aA1'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  writeFileSync(file, JSON.stringify({ email, password, userId: data.user.id }), { mode: 0o600 })
  const profile = await admin.from('training_profiles').insert({ owner_id: data.user.id, name: 'Native UI QA', age_band: 'adult' })
  if (profile.error) throw profile.error
}
console.log('Local QA account operation complete')
