import { allExercises, beatsWeight } from '../lib/exercises.js'
function rows(workout) { return workout?.entries || [] }
function resolve(id, aliases) {
  let value = String(id), seen = new Set()
  while (Object.hasOwn(aliases, value) && aliases[value]) {
    if (seen.has(value)) throw new Error('Exercise ID alias cycle detected.')
    seen.add(value); value = String(aliases[value])
  }
  return value
}
export const resolveMergedExerciseId = (id, aliases = {}) => resolve(id, aliases)

export function previewExerciseMerge(state, sourceId, canonicalId) {
  if (!sourceId || !canonicalId || String(sourceId) === String(canonicalId)) throw new Error('Choose two different exercises.')
  const routines = (state.routines || []).flatMap((r) => (r.ex || []).filter((e) => String(e.id) === String(sourceId) || String(e.id) === String(canonicalId)).map(() => ({ id: r.id, name: r.name })))
  const sessions = (state.workouts || []).filter((w) => rows(w).some((e) => String(e.id) === String(sourceId) || String(e.id) === String(canonicalId)))
  const affectedSets = sessions.reduce((n, w) => n + rows(w).filter((e) => String(e.id) === String(sourceId) || String(e.id) === String(canonicalId)).reduce((a, e) => a + (e.sets || []).length, 0), 0)
  const records = [sourceId, canonicalId].filter((id) => state.exWeights?.[id])
  return { templateReferences: routines.length, templates: routines, sessionReferences: sessions.length, sessions: sessions.map((w) => ({ id: w.id, name: w.name || 'Workout', date: w.d })), affectedSets, records: records.length, recordIds: records }
}

function mergeEntries(list, sourceId, canonicalId) {
  const out = [], byId = new Map()
  for (const entry of list || []) {
    const id = String(entry.id) === String(sourceId) ? String(canonicalId) : String(entry.id)
    const existing = id === String(canonicalId) ? byId.get(id) : null
    if (!existing) { const copy = { ...entry, id }; out.push(copy); byId.set(id, copy) }
    else existing.sets = [...(existing.sets || []), ...(entry.sets || [])]
  }
  return out
}

// Treat every merge as an equivalence edge. Keeping both targets is essential when two
// offline clients merge the same duplicate into different canonical exercises. Prefer the
// terminal target; competing terminals (or a cycle) use the same lexical ID on every client.
export function mergeExerciseAliasEdges(...states) {
  const targets = new Map()
  for (const state of states) {
    // Once edge facts exist the flattened alias map is derived data. Reading it back as
    // a new direction would change the winner on a later three-client reconciliation.
    const edges = state?.exerciseMergeEdges || state?.exerciseIdAliases || {}
    for (const [source, values] of Object.entries(edges)) for (const target of Array.isArray(values) ? values : [values]) {
      if (typeof target !== 'string' || !source || !target || source === target) continue
      if (!targets.has(source)) targets.set(source, new Set())
      targets.get(source).add(target)
    }
  }
  return Object.fromEntries([...targets.keys()].sort().map(id => [id, [...targets.get(id)].sort()]))
}

export function reconcileExerciseAliases(...maps) {
  const links = new Map(), sources = new Set()
  for (const map of maps) for (const [source, values] of Object.entries(map || {})) for (const raw of Array.isArray(values) ? values : [values]) {
    if (typeof raw !== 'string' || !source || !raw || source === raw) continue
    sources.add(source)
    for (const [a, b] of [[source, raw], [raw, source]]) {
      if (!links.has(a)) links.set(a, new Set())
      links.get(a).add(b)
    }
  }
  const entries = [], visited = new Set()
  for (const id of [...links.keys()].sort()) {
    if (visited.has(id)) continue
    const component = [], pending = [id]
    while (pending.length) {
      const next = pending.pop()
      if (visited.has(next)) continue
      visited.add(next); component.push(next)
      pending.push(...links.get(next))
    }
    const terminals = component.filter(x => !sources.has(x)).sort()
    const canonical = terminals[0] || component.sort()[0]
    for (const source of component.sort()) if (source !== canonical) entries.push([source, canonical])
  }
  return Object.fromEntries(entries)
}

export function applyExerciseMerge(state, sourceId, canonicalId) {
  if (!sourceId || !canonicalId || String(sourceId) === String(canonicalId)) throw new Error('Choose two different exercises.')
  const from = String(sourceId)
  const existing = state.exerciseIdAliases || {}
  const to = resolve(String(canonicalId), existing)
  if (to === from) throw new Error('This merge would create an exercise ID alias cycle.')
  if (resolve(from, existing) !== from) throw new Error('This exercise was already merged. Choose the current exercise again.')
  if (!allExercises(state).some(e => String(e.id) === to)) throw new Error('Choose an available exercise to keep.')
  // Validate the whole alias map before touching any history, records, or templates.
  for (const id of Object.keys(existing)) resolve(id, existing)
  // A deliberate merge after seeing a conflict supersedes every known target of the
  // source component, including a target that lost the earlier deterministic tie.
  const redirects = Object.fromEntries([from, ...Object.keys(existing).filter(id => resolve(id, existing) === from)].map(id => [id, to]))
  state.exerciseMergeEdges = mergeExerciseAliasEdges(state, { exerciseIdAliases: redirects })
  state.exerciseIdAliases = reconcileExerciseAliases(state.exerciseMergeEdges)
  return normalizeMergedExerciseReferences(state)
}

function rewriteExerciseReferences(state, from, to) {
  for (const workout of state.workouts || []) workout.entries = mergeEntries(workout.entries, from, to)
  if (state.active) state.active.entries = mergeEntries(state.active.entries, from, to)
  for (const session of state.active?.otherSessions || []) session.entries = mergeEntries(session.entries, from, to)
  for (const routine of state.routines || []) {
    const out = [], seen = new Map()
    for (const entry of routine.ex || []) {
      const id = String(entry.id) === from ? to : String(entry.id), prior = seen.get(id)
      if (prior) { prior.sets = (Number(prior.sets) || 0) + (Number(entry.sets) || 0); prior.reps = prior.reps || entry.reps; prior.rest = prior.rest || entry.rest }
      else { const copy = { ...entry, id }; out.push(copy); seen.set(id, copy) }
    }
    routine.ex = out
  }
  const a = state.exWeights?.[from], b = state.exWeights?.[to]
  if (a || b) state.exWeights[to] = !a ? b : !b ? a : beatsWeight(to, Number(a.w), Number(b.w)) || (Number(a.w) === Number(b.w) && String(a.d) >= String(b.d)) ? a : b
  if (state.exWeights) delete state.exWeights[from]
  const notes = [...new Set([state.exNotes?.[to], state.exNotes?.[from]].filter((x) => typeof x === 'string' && x.trim()).flatMap((x) => x.split('\n').map((v) => v.trim()).filter(Boolean)))]
  if (notes.length) { state.exNotes ||= {}; state.exNotes[to] = notes.join('\n') }
  if (state.exNotes) delete state.exNotes[from]
  return state
}

export function normalizeMergedExerciseReferences(state) {
  const edges = mergeExerciseAliasEdges(state)
  const aliases = reconcileExerciseAliases(edges)
  if (state.exerciseIdAliases || state.exerciseMergeEdges) { state.exerciseMergeEdges = edges; state.exerciseIdAliases = aliases }
  for (const [source, target] of Object.entries(aliases)) rewriteExerciseReferences(state, source, target)
  return state
}
