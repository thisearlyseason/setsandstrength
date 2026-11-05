import { bodyWeightInKg } from '../lib/units.js'
const KG_PER_LB = 0.45359237
const positive = n => n != null && n !== '' && Number.isFinite(+n) && +n > 0
const round = n => Math.round(n * 10) / 10
export function homeWeek(S, today) {
  const d = new Date(`${today}T12:00:00`)
  d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  const start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const workouts = (S.workouts || []).filter(w => w.d >= start && w.d <= today)
  return { start, workouts, count: workouts.length, target: Math.max(1, Math.min(14, Math.floor(Number(S.trainingGoals?.sessions) || 3))) }
}
export function weightGoal(S) {
  const rows = (S.bodyweight || []).filter(r => positive(r.w)).slice().sort((a,b) => a.d.localeCompare(b.d))
  const last = rows.at(-1), previous = rows.at(-2), unit = S.unit === 'lb' ? 'lb' : 'kg'
  const display = kg => round(unit === 'lb' ? kg / KG_PER_LB : kg)
  const stored = S.trainingGoals || {}
  const kg = positive(stored.weight) ? +stored.weight * ((stored.unit || unit) === 'lb' ? KG_PER_LB : 1) : positive(S.bodyGoalKg) ? +S.bodyGoalKg : positive(S.targetW) ? +S.targetW * (unit === 'lb' ? KG_PER_LB : 1) : null
  const latestKg = last ? bodyWeightInKg(last,unit) : null
  return { target: kg == null ? null : display(kg), latest: latestKg == null ? null : display(latestKg), date: last?.d || null, previousChange: previous && last ? display(latestKg - bodyWeightInKg(previous,unit)) : null, delta: kg != null && latestKg != null ? display(latestKg-kg) : null }
}
export function writeWeightGoal(S, value) {
  if (value !== '' && value != null && !positive(value)) throw Error('Enter a positive weight target or leave it blank.')
  S.bodyGoalKg = positive(value) ? +value * (S.unit === 'lb' ? KG_PER_LB : 1) : null
  S.targetW = positive(value) ? +value : null
  const goalUnit = S.trainingGoals?.unit || S.unit
  S.trainingGoals = { ...S.trainingGoals, weight: positive(value) ? S.bodyGoalKg / (goalUnit === 'lb' ? KG_PER_LB : 1) : undefined, unit: goalUnit }
}
export function hasWeeklyPlan(S) {
  return Object.values(S.dayPlan || {}).filter(ids => ids?.some(id => !(S.routines || []).find(r=>r.id===id)?.cancelledAt)).length >= 2 || (S.routines || []).some(r => !r.cancelledAt && (r.programId || r.planGroupId))
}
