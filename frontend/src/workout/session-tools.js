import { startSession } from './training.js'
export const completedRoutine = (S, id) =>
  S.workouts.some((w) => (w.routineIds || [w.routineId]).includes(id))
export function startScheduled(S, r, date) {
  if (completedRoutine(S, r.id))
    throw Error('This session is completed. View it in your workout log.')
  const already = [S.active, ...(S.active?.otherSessions || [])].find((a) =>
    a?.routineIds?.includes(r.id),
  )
  if (!already) {
    for (const day of Object.keys(S.dayPlan))
      S.dayPlan[day] = (S.dayPlan[day] || []).filter((id) => id !== r.id)
    S.dayPlan[date] = [...(S.dayPlan[date] || []), r.id]
  }
  startSession(S, r)
  if (!already) S.active.d = date
}
