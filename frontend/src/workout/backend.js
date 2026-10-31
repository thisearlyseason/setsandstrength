import { createClient } from '@supabase/supabase-js'
export const configured = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)
export const supabase = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  : null
let selected = null
const fail = (message, status = 503, data = {}) =>
  Object.assign(new Error(message), { status, data })
export async function account() {
  if (!supabase)
    throw fail(
      'Local Supabase is not configured. Follow docs/workout/LOCAL.md.',
    )
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw fail('Sign in to your account.', 401)
  return data.session.user
}
export async function profiles() {
  await account()
  const { data, error } = await supabase
    .from('training_profiles')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}
export async function currentProfile() {
  if (selected) return selected
  const user = await account(),
    list = await profiles()
  const wanted = sessionStorage.getItem('workout.profile.' + user.id)
  selected = list.find((p) => p.id === wanted) || list[0]
  if (!selected) throw fail('Create a training profile to get started.', 401)
  return selected
}
export async function createProfile(name, age_band = 'adult') {
  const user = await account()
  const { data, error } = await supabase
    .from('training_profiles')
    .insert({ name: name.trim(), age_band, owner_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}
export async function selectProfile(id) {
  const user = await account(),
    list = await profiles()
  if (!list.some((p) => p.id === id)) throw fail('Profile access denied', 403)
  sessionStorage.setItem('workout.profile.' + user.id, id)
  selected = null
}
export async function supabaseApi(path, opts = {}) {
  if (path === '/api/config')
    return {
      allow_guest: false,
      password_login: true,
      coach: null,
      default_lang: 'en',
    }
  if (path === '/api/logout' || path === '/api/logout/all') {
    const { error } = await supabase.auth.signOut({
      scope: path.endsWith('/all') ? 'global' : 'local',
    })
    if (error) throw error
    selected = null
    return { ok: true }
  }
  const profile = await currentProfile()
  if (path === '/api/me')
    return {
      user: { id: profile.id, name: profile.name, age_band: profile.age_band },
    }
  if (path === '/api/data' && opts.method === 'PUT') {
    const body = JSON.parse(opts.body)
    const { data, error } = await supabase.rpc('save_profile_state', {
      p_profile_id: profile.id,
      p_expected_rev: body.baseRev ?? 0,
      p_state: body.state,
    })
    if (error) throw fail(error.message, error.code === '42501' ? 403 : 503)
    if (data.conflict) throw fail('A newer revision exists', 409, data)
    return data
  }
  if (path === '/api/data' || path === '/api/data/rev') {
    const { data, error } = await supabase
      .from('profile_states')
      .select('state,rev,wid')
      .eq('profile_id', profile.id)
      .single()
    if (error) throw fail(error.message, 503)
    return data
  }
  if (path === '/api/activity') return { ok: true }
  throw fail('This upstream service is not enabled in Workout.', 404)
}
