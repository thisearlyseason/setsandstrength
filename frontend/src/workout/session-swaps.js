import { buildWorkout, catalogForProfile } from './builder.js'
import { resolveMergedExerciseId } from './exercise-merge.js'
import { hasCompletedWork, isWarmupRow } from '../lib/workout-model.js'

const isWarmup = (s) => isWarmupRow(s) || ['warmup', 'warm-up', 'warm_up'].includes(s.kind || s.type)
const pendingRows = (entry) => (entry?.sets || []).filter((s) => !hasCompletedWork(s) && !isWarmup(s))

// Uses current session rows, including already logged work. The planning estimate does
// not predict wall-clock time: it includes the same warmup/setup assumptions as the builder.
export function estimatedSessionMinutes(active) {
  const seconds = 180 + (active.entries || []).reduce((sum, entry) => {
    const rows = entry.sets || [], target = entry.target || {}
    if (!rows.length) return sum
    const rest = Number(target.rest) || 0
    const work = rows.reduce((n, s) => n + (Number(s.sec) || Number(s.min) * 60 || (Number(s.r) || Number(target.reps) || 0) * 4), 0)
    return sum + work + Math.max(0, rows.length - 1) * rest + 60 + (entry.builderSwapRestAfterSeconds || 0)
  }, 0)
  return Math.ceil(seconds / 6) / 10
}

function replacementSession(active, index, exercise, prescribed) {
  const next = structuredClone(active), old = next.entries[index]
  const completed = old.sets.filter(hasCompletedWork), count = pendingRows(old).length
  const timed = prescribed.durationSec != null
  const target = { id: exercise.id, sets: count, mode: timed ? 'time' : 'reps', reps: timed ? undefined : prescribed.reps, sec: timed ? prescribed.durationSec : undefined, rest: prescribed.restSec, weight: 0, prog: prescribed.prog || 'off', repsMin: prescribed.repsMin }
  const replacement = {
    id: exercise.id, rid: old.rid, target,
    plan: { policy: 'off', kind: 'off' },
    sets: Array.from({ length: count }, () => ({ w: 0, ...(timed ? { sec: prescribed.durationSec } : { r: prescribed.reps }), done: false })),
  }
  if (completed.length) {
    old.sets = completed
    // Preserve the rest between the final logged set and the first replacement set,
    // in addition to the setup/transition for this newly introduced movement.
    old.builderSwapRestAfterSeconds = Number(old.target?.rest) || 0
    next.entries.splice(index + 1, 0, replacement)
    next.cur = index + 1
  } else {
    next.entries[index] = replacement
    next.cur = index
  }
  next.setTimer = null
  next.restUntil = 0
  next.restRemaining = 0
  if (active.builderConstraints) next.builderEstimatedMinutes = estimatedSessionMinutes(next)
  return next
}

function prescriptionFor(active, index, exercise) {
  if (active.builderConstraints) {
    return buildWorkout([exercise], { ...active.builderConstraints, minutes: 180 }, { limit: 1 }).exercises[0]
  }
  const target = active.entries[index].target || {}
  return { reps: target.reps || 10, durationSec: target.mode === 'time' ? target.sec || 30 : null, restSec: target.rest || 0, prog: 'off' }
}

/** Catalog must contain current instructions, so support/accessory constraints can be checked. */
export function sessionSwapOptions(active, index, catalog, aliases = {}) {
  const old = active?.entries?.[index]
  if (!old || !pendingRows(old).length) return []
  const current = catalog.find((e) => String(e.id) === resolveMergedExerciseId(old.id, aliases))
    || catalog.find((e) => String(e.id) === String(old.id))
  if (!current) return []
  const used = new Set(active.entries.map((e) => resolveMergedExerciseId(e.id, aliases)))
  return catalogForProfile(catalog, aliases).filter((exercise) => {
    if (used.has(String(exercise.id)) || exercise.tg !== current.tg) return false
    if (!active.builderConstraints) return true
    const prescribed = prescriptionFor(active, index, exercise)
    if (!prescribed) return false
    return estimatedSessionMinutes(replacementSession(active, index, exercise, prescribed)) <= Number(active.builderConstraints.minutes || 45)
  })
}

/** Returns a new session; no mutation occurs until the caller assigns it to state.active. */
export function applySessionSwap(active, index, replacementId, catalog, aliases = {}) {
  const exercise = sessionSwapOptions(active, index, catalog, aliases).find((e) => String(e.id) === String(replacementId))
  if (!exercise) throw new Error('No eligible replacement fits this session’s constraints and time budget. Adjust your plan or keep the current movement.')
  return replacementSession(active, index, exercise, prescriptionFor(active, index, exercise))
}
