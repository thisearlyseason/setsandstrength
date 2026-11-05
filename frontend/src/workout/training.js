import { convertWeight } from '../lib/units.js'
import { recordBadges } from './records.js'
import { buildSessionEntries } from '../lib/session-start.js'
import { buildCompletedWorkout } from '../lib/finish-workout.js'
import { saveWorkoutEdit } from '../lib/session-edit.js'
import { hasCompletedWork } from '../lib/workout-model.js'
import {
  workoutVolume,
  bestWeightForEntry,
  bestWeightFor,
} from '../lib/history.js'
import { beatsWeight } from '../lib/exercises.js'
import { todayISO } from '../lib/format.js'
import { resolveMergedExerciseId } from './exercise-merge.js'
export function enrollProgram(state, program, startDate = todayISO()) {
  const enrollment = crypto.randomUUID(),
    dates = []
  for (const week of program.weeks)
    for (const session of week.sessions) {
      const id = crypto.randomUUID(),
        date = new Date(startDate + 'T12:00:00')
      date.setDate(date.getDate() + session.offset)
      const day = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-')
      const routine = {
        id,
        name: `${program.label} · W${week.week} · ${session.name}`,
        ex: session.sections.flatMap((section) =>
          section.exercises.map((e) => ({ ...e, section: section.name })),
        ),
        programId: program.id,
        programVersion: program.version,
        enrollment,
        week: week.week,
        sessionIndex: week.sessions.indexOf(session),
        note: week.note,
        reviewStatus: program.reviewStatus,
      }
      state.routines.push(routine)
      state.dayPlan[day] = [...(state.dayPlan[day] || []), id]
      dates.push(day)
    }
  return dates
}
// Only time spent in another workout is excluded; both sessions keep their true start dates.
function resume(saved, others) {
  const { pausedAt, ...session } = saved
  return {
    ...session,
    pausedMs:
      (saved.pausedMs || 0) +
      (pausedAt ? Math.max(0, Date.now() - pausedAt) : 0),
    otherSessions: others,
  }
}
export const trainedMs = (session, end = session.end) =>
  Math.max(0, end - session.start - (session.pausedMs || 0))
export function startSession(state, routine) {
  if (state.active?.editingWorkoutId != null) throw new Error('Save or cancel your saved-session edits before starting another workout.')
  if (state.active?.routineIds?.includes(routine.id)) return
  const waiting = state.active?.otherSessions || []
  const saved = waiting.find((session) =>
    session.routineIds?.includes(routine.id),
  )
  if(routine.cancelledAt && !saved) throw Error('This plan is cancelled. Restore it before starting a new session.')
  const others = waiting.filter(
    (session) => !session.routineIds?.includes(routine.id),
  )
  if (state.active) {
    const { otherSessions, ...current } = state.active
    if (current.setTimer?.until)
      current.setTimer = {
        ...current.setTimer,
        remaining: Math.max(
          0,
          Math.ceil((current.setTimer.until - Date.now()) / 1000),
        ),
        until: 0,
      }
    if (current.restUntil) {
      current.restRemaining = Math.max(
        0,
        Math.ceil((current.restUntil - Date.now()) / 1000),
      )
      current.restUntil = 0
    }
    others.unshift({ ...current, pausedAt: Date.now() })
  }
  if (saved) {
    state.active = resume(saved, others)
    return
  }
  state.active = {
    id: crypto.randomUUID(),
    d: todayISO(),
    start: Date.now(),
    routineIds: [routine.id],
    name: routine.name,
    ...(routine.note ? {note:routine.note} : {}),
    ...(routine.builderConstraints ? { builderConstraints: structuredClone(routine.builderConstraints), builderPrescription: structuredClone(routine.builderPrescription || []) } : {}),
    cur: 0,
    entries: buildSessionEntries(state, {
      ...routine,
      ex: routine.ex.map((e) => ({
        ...e,
        prog:
          e.prog ||
          (routine.programId?.includes('youth') || e.section !== 'Main'
            ? 'off'
            : e.mode === 'time'
              ? 'off'
              : e.policy || 'double'),
      })),
    }).map((e) => {
      const matches = (routine.customPrescription || []).filter(row => resolveMergedExerciseId(row.id, state.exerciseIdAliases) === e.id)
      const saved = matches.length ? { ...matches[0], sets: matches.flatMap(row => row.sets), config: { ...matches[0].config, sets: matches.reduce((n,row)=>n+row.sets.length,0) } } : null
      const load = value => convertWeight(value, routine.customPrescriptionUnit || state.unit, state.unit)
      const cfg = routine.ex.find(row => resolveMergedExerciseId(row.id, state.exerciseIdAliases) === e.id)
      const expected = saved?.config && { ...saved.config, ...(saved.config.weight != null ? {weight: load(saved.config.weight)} : {}) }
      const unchanged = expected && ['mode','sets','reps','sec','min','prog','weight'].every(key => cfg?.[key] === expected[key] || (key === 'weight' && Math.abs(Number(cfg?.[key])-Number(expected[key])) < .011))
      const useSaved = saved && unchanged && cfg.prog === 'off' && state.startFrom !== 'last'
      return { ...e, rid: routine.id, ...(cfg?.note ? {note:cfg.note} : {}), ...(useSaved ? { sets: saved.sets.map(row => ({ ...row, ...(row.w != null ? {w: load(row.w)} : {}), done: false })) } : {}) }
    }),
    otherSessions: others,
    workoutView: 'cards',
  }
}
export function leaveFinishedSession(state) {
  const [next, ...others] = state.active?.otherSessions || []
  state.active = next ? resume(next, others) : null
}
export function completeSession(state) {
  if (state.active?.editingWorkoutId != null) return saveWorkoutEdit(state)
  const active = state.active
  if (!active || !active.entries.some((e) => e.sets.some(hasCompletedWork)))
    throw Error('Log at least one completed set before finishing.')
  const completed = { ...active, entries: active.entries.map((entry) => ({ ...entry, id: resolveMergedExerciseId(entry.id, state.exerciseIdAliases) })) }
  const prs = completed.entries
    .filter((e) =>
      beatsWeight(e.id, bestWeightForEntry(e), bestWeightFor(state, e.id)),
    )
    .map((e) => e.id)
  const w = buildCompletedWorkout(completed, { end: Date.now(), prs })
  if (!w.entries.some((entry) => entry.sets.some(hasCompletedWork)))
    throw Error('Log at least one completed set before finishing.')
  if (active.pausedMs) w.pausedMs = active.pausedMs
  w.vol = workoutVolume(w)
  w.badges = recordBadges(state, w)
  state.workouts.push(w)
  for (const e of w.entries) {
    const weight = bestWeightForEntry(e)
    if (weight > 0 && beatsWeight(e.id, weight, state.exWeights[e.id]?.w || 0))
      state.exWeights[e.id] = { w: weight, d: w.d }
  }
  leaveFinishedSession(state)
  return w
}
export function exportJSON(state) {
  return JSON.stringify(
    { format: 'workout-opengym', version: 1, state },
    null,
    2,
  )
}
export function readJSON(text) {
  const data = JSON.parse(text),
    s = data.state || data
  if (
    !s ||
    !Array.isArray(s.routines) ||
    !Array.isArray(s.workouts) ||
    !['kg', 'lb'].includes(s.unit)
  )
    throw Error('Choose a valid sets&strength JSON backup.')
  return s
}

// A pure row update keeps side-level logged data and intensifier details intact.
export function setWarmupFlag(row, checked) {
  const next = { ...row, phase: checked ? 'warmup' : 'work' }
  if (checked) next.warmup = true
  else {
    delete next.warmup
    for (const key of ['kind', 'type']) {
      if (/^warm[ _-]?up$/i.test(String(next[key] || '').trim())) delete next[key]
    }
  }
  return next
}
