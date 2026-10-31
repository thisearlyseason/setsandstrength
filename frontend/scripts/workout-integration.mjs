import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
const env = JSON.parse(
  execFileSync('supabase', ['status', '-o', 'json'], {
    cwd: new URL('../../', import.meta.url),
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)
assert.ok(
  /^http:\/\/(127\.0\.0\.1|localhost):55321$/.test(env.API_URL),
  'Tests must use this local Workout instance',
)
const options = { auth: { persistSession: false, autoRefreshToken: false } },
  admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, options),
  created = []
const client = () => createClient(env.API_URL, env.ANON_KEY, options)
try {
  const a = client(),
    b = client(),
    anonymous = client()
  for (const [i, c] of [a, b].entries()) {
    const email = `workout-rls-${Date.now()}-${i}@example.test`,
      password = crypto.randomUUID() + '!A1'
    const { data, error } = await c.auth.signUp({ email, password })
    assert.ifError(error)
    assert.ok(data.session)
    created.push(data.user.id)
    const auth = await c.auth.signInWithPassword({ email, password })
    assert.ifError(auth.error)
  }
  const ap = await a
    .from('training_profiles')
    .insert({ name: 'QA Adult', age_band: 'adult' })
    .select()
    .single()
  assert.ifError(ap.error)
  const yp = await a
    .from('training_profiles')
    .insert({ name: 'QA Youth', age_band: '13-15' })
    .select()
    .single()
  assert.ifError(yp.error)
  const bp = await b
    .from('training_profiles')
    .insert({ name: 'QA Other', age_band: 'adult' })
    .select()
    .single()
  assert.ifError(bp.error)
  const other = await b
    .from('training_profiles')
    .select('*')
    .eq('id', yp.data.id)
  assert.ifError(other.error)
  assert.equal(other.data.length, 0)
  const cross = await b
    .from('profile_states')
    .select('*')
    .eq('profile_id', yp.data.id)
  assert.equal(cross.data.length, 0)
  const forged = await b
    .from('training_profiles')
    .insert({ owner_id: created[0], name: 'Forged', age_band: 'adult' })
  assert.ok(forged.error)
  const direct = await a
    .from('profile_states')
    .update({ state: { bad: true } })
    .eq('profile_id', ap.data.id)
  assert.ok(direct.error)
  const denied = await b.rpc('save_profile_state', {
    p_profile_id: yp.data.id,
    p_expected_rev: 0,
    p_state: { secret: 'no' },
  })
  assert.ok(denied.error)
  const anon = await anonymous.rpc('save_profile_state', {
    p_profile_id: yp.data.id,
    p_expected_rev: 0,
    p_state: { secret: 'no' },
  })
  assert.ok(anon.error)
  const results = await Promise.all(
    [1, 2].map((n) =>
      a.rpc('save_profile_state', {
        p_profile_id: ap.data.id,
        p_expected_rev: 0,
        p_state: {
          unit: 'kg',
          routines: [],
          workouts: [{ id: 'w' + n }],
          _ts: n,
        },
      }),
    ),
  )
  results.forEach((r) => assert.ifError(r.error))
  assert.equal(results.filter((r) => r.data.conflict).length, 1)
  assert.equal(results.filter((r) => !r.data.conflict).length, 1)
  const stale = results.find((r) => r.data.conflict).data
  assert.equal(stale.rev, 1)
  assert.ok(stale.state.workouts.length === 1)
  const merged = await a.rpc('save_profile_state', {
    p_profile_id: ap.data.id,
    p_expected_rev: 1,
    p_state: { ...stale.state, workouts: [{ id: 'w1' }, { id: 'w2' }] },
  })
  assert.ifError(merged.error)
  assert.equal(merged.data.rev, 2)
  const youth = await a
    .from('profile_states')
    .select('*')
    .eq('profile_id', yp.data.id)
    .single()
  assert.deepEqual(youth.data.state, {})
  const path = created[0] + '/qa.png',
    blob = new Uint8Array([137, 80, 78, 71])
  const upload = await a.storage
    .from('private-uploads')
    .upload(path, blob, { contentType: 'image/png' })
  assert.ifError(upload.error)
  const own = await a.storage.from('private-uploads').download(path)
  assert.ifError(own.error)
  const theft = await b.storage.from('private-uploads').download(path)
  assert.ok(theft.error)
  const overwrite = await b.storage
    .from('private-uploads')
    .upload(path, blob, { contentType: 'image/png', upsert: true })
  assert.ok(overwrite.error)
  const publicWrite = await a
    .from('exercise_catalog')
    .insert({ id: 'evil', metadata: {} })
  assert.ok(publicWrite.error)
  const cat = await anonymous
    .from('exercise_catalog')
    .select('id', { count: 'exact', head: true })
  assert.equal(cat.count, 5632)
  const programs = await anonymous
    .from('program_templates')
    .select('id', { count: 'exact', head: true })
  assert.equal(programs.count, 35)
  await a.storage.from('private-uploads').remove([path])
  console.log(
    'PASS: signup/signin, adult/youth ownership, forged owner denial, anonymous denial, direct-write denial, atomic concurrent save/conflict retry, profile isolation, private media isolation, immutable public catalog, 5,632 catalog records and 35 programs.',
  )
} finally {
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw error
  }
}
