import { buildSessionEntries } from '../lib/session-start.js'
import { buildCompletedWorkout } from '../lib/finish-workout.js'
import {
  workoutVolume,
  bestWeightForEntry,
  bestWeightFor,
} from '../lib/history.js'
import { beatsWeight } from '../lib/exercises.js'
import { todayISO } from '../lib/format.js'
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
        note: week.note,
        reviewStatus: program.reviewStatus,
      }
      state.routines.push(routine)
      state.dayPlan[day] = [...(state.dayPlan[day] || []), id]
      dates.push(day)
    }
  return dates
}
export function startSession(state, routine) {
  if (state.active) throw Error('Finish or discard your current workout first.')
  state.active = {
    id: crypto.randomUUID(),
    d: todayISO(),
    start: Date.now(),
    routineIds: [routine.id],
    name: routine.name,
    cur: 0,
    entries: buildSessionEntries(state, routine).map((e) => ({
      ...e,
      rid: routine.id,
    })),
    workoutView: 'cards',
  }
}
export function completeSession(state) {
  const active = state.active
  if (!active || !active.entries.some((e) => e.sets.some((s) => s.done)))
    throw Error('Log at least one completed set before finishing.')
  const prs = active.entries
    .filter((e) =>
      beatsWeight(e.id, bestWeightForEntry(e), bestWeightFor(state, e.id)),
    )
    .map((e) => e.id)
  const w = buildCompletedWorkout(active, { end: Date.now(), prs })
  w.vol = workoutVolume(w)
  state.workouts.push(w)
  for (const e of w.entries) {
    const weight = bestWeightForEntry(e)
    if (weight > 0 && beatsWeight(e.id, weight, state.exWeights[e.id]?.w || 0))
      state.exWeights[e.id] = { w: weight, d: w.d }
  }
  state.active = null
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
    throw Error('Choose a valid Workout or openGym JSON backup.')
  return s
}
