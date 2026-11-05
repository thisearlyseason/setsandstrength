import { trainingGroup } from './exercise-search.js'
import { musclesOf, trainingReport } from './analysis.js'
import { resolveMergedExerciseId } from './exercise-merge.js'
import { todayISO } from '../lib/format.js'
const EQUIPMENT_WORDS = ['body weight', 'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bench', 'rack', 'band', 'anchor', 'pull-up bar', 'step', 'box', 'chair', 'stability ball', 'exercise ball', 'ez bar', 'rope', 'handle', 'strap', 'attachment', 'landmine', 'smith machine', 'arm blaster', 'bosu ball', 'medicine ball', 'tennis ball', 'pad', 'suspension trainer', 'weight plate', 'sandbag', 'sled', 'tire', 'hammer', 'macebell', 'trap bar', 'wheel roller', 'roller', 'stationary bike', 'elliptical', 'upper body ergometer', 'skierg', 'stepmill', 'wall', 'v-bar', 'straight bar', 'ankle cuff', 'wrist weight', 'ankle weight']
function mentionsEquipment(text, word) {
  // "Hammer curl" describes a grip, not a second piece of equipment.
  const source = word === 'hammer' ? text.replace(/\bhammer(?:[ -]+strict)?[ -]+(?:curls?|grip|press)\b/g, '') : text
  return new RegExp(`\\b${word.replace(/[ -]/g, '[ -]?')}s?\\b`).test(source)
}
const MOVEMENT_FAMILIES = [
  { restriction: /^(?:overhead[ -]+press(?:ing|es)?|(?:above[ -]+head)[ -]+press(?:ing|es)?|military[ -]+press(?:ing|es)?)$/, matches: (text) => /\bpress(?:ing|es)?\b/.test(text) && /\boverhead\b|\babove[ -]+(?:your[ -]+|the[ -]+)?head\b|\bmilitary\b/.test(text) },
  { restriction: /^(?:jump(?:ing|s)?|hopp?(?:ing|s)?|bound(?:ing|s)?)$/, matches: (text) => /\b(?:jump(?:ing|s)?|hop(?:ping|s)?|bound(?:ing|s)?)\b/.test(text) },
  { restriction: /^(?:run(?:ning|s)?|jog(?:ging|s)?|sprint(?:ing|s)?)$/, matches: (text) => /\b(?:run(?:ning|s)?|jog(?:ging|s)?|sprint(?:ing|s)?)\b/.test(text) },
  { restriction: /^(?:hing(?:e|ing|es)|bent[ -]+over)$/, matches: (text) => /\bhing(?:e|ing|es)\b|\bbent[ -]+over\b/.test(text) },
  { restriction: /^(?:kneel(?:ing|s)?|kneeling)$/, matches: (text) => /\bkneel(?:ing|s)?\b/.test(text) },
  { restriction: /^(?:lung(?:e|es|ing))$/, matches: (text) => /\blung(?:e|es|ing)\b/.test(text) },
  { restriction: /^(?:squat(?:ting|s)?)$/, matches: (text) => /\bsquat(?:ting|s)?\b/.test(text) },
]
const movementFamily = (phrase) => MOVEMENT_FAMILIES.find((family) => family.restriction.test(String(phrase).trim().toLowerCase()))
const negativePhrases = (text) => [...text.matchAll(/\b(?:no|without|avoid|exclude)[ -]+(.+?)(?=[,;.!?\n]|\b(?:no|without|avoid|exclude)\b|$)/g)]
  .flatMap((match) => match[1].split(/\s+(?:and|or)\s+/)).map((phrase) => phrase.replace(/^(?:any|a|the)\s+/, '').trim()).filter(Boolean)
const equipmentRestriction = (phrase) => EQUIPMENT_WORDS.find((word) => new RegExp(`^${word.replace(/[ -]/g, '[ -]?')}s?\\b`).test(phrase))

export function parseWorkoutRequest(text = '') {
  const s = String(text).toLowerCase()
  const minutes = Number(s.match(/(\d+)\s*(?:minutes?|mins?)/)?.[1]) || 45
  const focus = /\bpush\b(?!\s*\/)/.test(s) ? 'push' : /\bpull\b(?![ -]?up|\s*\/)/.test(s) ? 'pull' : /upper\s*(?:body|\/\s*lower)/.test(s) ? 'upper'
    : /lower\s*body|legs?/.test(s) ? 'lower'
      : /\b(abs|abdominals?|core)\b/.test(s) ? 'abs' : /\b(arms?|biceps?|triceps?)\b/.test(s) ? 'arms' : /chest/.test(s) ? 'chest' : /back/.test(s) ? 'back' : /shoulder/.test(s) ? 'shoulders' : 'full'
  const negated = negativePhrases(s)
  const excludedEquipment = [...new Set(negated.map(equipmentRestriction).filter(Boolean))]
  const equipmentFree = /\b(?:no|without)(?:[ -]+any)?[ -]+(?:equipment|tools)\b|\bbody[ -]?weight[ -]+only\b|\bequipment[ -]+free\b/.test(s)
  const equipment = equipmentFree ? ['body weight'] : EQUIPMENT_WORDS.filter((word) => mentionsEquipment(s, word) && !excludedEquipment.includes(word))
  const excludedMovements = [...new Set(negated.filter((phrase) => !equipmentRestriction(phrase) && !/^(?:equipment|tools)(?:[ -]+(?:needed|required|workout))?$/.test(phrase)))]
  const trainingDays = Number(s.match(/(\d+)\s*(?:training\s*)?days?(?:\s*(?:per|a)\s*week)?/)?.[1]) || 3
  const split = /push\s*\/\s*pull\s*\/\s*legs/.test(s) ? 'ppl' : /upper\s*\/\s*lower/.test(s) ? 'upper-lower' : 'full-body'
  const experience = /advanced/.test(s) ? 'advanced' : /intermediate/.test(s) ? 'intermediate' : /beginner|novice/.test(s) ? 'beginner' : 'unspecified'
  const goal = /strength|stronger/.test(s) ? 'strength' : /endurance|conditioning|stamina/.test(s) ? 'endurance' : /hypertrophy|muscle|build size/.test(s) ? 'hypertrophy' : 'general fitness'
  return { minutes: Math.max(10, Math.min(minutes, 180)), focus, equipment, excludedEquipment, excludedMovements, experience, goal, trainingDays: Math.max(1, Math.min(trainingDays, 7)), split, muscleFrequencyTarget: 2 }
}

const bodyArea = (e) => `${e.bp || ''} ${e.tg || ''}`.toLowerCase()
const detailText = (e) => `${e.n || ''} ${e.desc || ''} ${(e.inst || []).join(' ')}`.toLowerCase()

const areaMatches = (e, focus) => {
  const body = bodyArea(e)
  if (focus === 'abs') return /abs|abdominal|oblique/.test(String(e.tg || '').toLowerCase())
  if (focus === 'arms') return /bicep|tricep|brachialis|forearm/.test(String(e.tg || '').toLowerCase())
  if (focus === 'push') return trainingGroup(e) === 'push'
  if (focus === 'pull') return trainingGroup(e) === 'pull'
  if (focus === 'upper') return /chest|pectoral|shoulder|delt|upper arm|bicep|tricep|back|lat|rhomboid/.test(body)
  if (focus === 'lower') return /leg|quad|hamstring|glute|calf|lower body/.test(body)
  if (focus === 'chest') return /chest|pectoral/.test(body)
  if (focus === 'back') return /back|lat|rhomboid/.test(body)
  if (focus === 'shoulders') return /shoulder|delt/.test(body)
  return true
}

const equipmentName = (value) => /^(?:body[ -]?weight|no[ -]+equipment|no[ -]+tools|none)$/i.test(String(value).trim()) ? 'body weight' : String(value).trim().toLowerCase()

function eligibility(ex, constraints) {
  if (!ex?.id || !ex.n || !ex.eq || !ex.cat) return 'exercise metadata is incomplete'
  const text = detailText(ex)
  const excluded = (constraints.excludedEquipment || []).map(equipmentName)
  const denied = excluded.find((word) => String(ex.eq).toLowerCase() === word.toLowerCase() || mentionsEquipment(text, word.toLowerCase()))
  if (denied) return `excluded equipment: ${denied}`
  const restrictions = constraints.excludedMovements || []
  const unsupported = restrictions.find((phrase) => !movementFamily(phrase))
  if (unsupported) return `unsupported movement restriction: ${unsupported}; remove or rephrase it using a supported movement family before building`
  const restricted = restrictions.find((phrase) => movementFamily(phrase).matches(text))
  if (restricted) return `restricted movement: ${restricted}`
  // An empty field means unspecified; explicit no-equipment is body weight only.
  const allowed = (constraints.equipment || []).map(equipmentName)
  if (allowed.length && !allowed.some((word) => String(ex.eq).toLowerCase() === word.toLowerCase())) return 'equipment is not available'
  if (allowed.length && equipmentName(ex.eq) !== 'body weight' && !allowed.some((word) => mentionsEquipment(text, word))) return 'instructions do not confirm the required equipment'
  // Equipment metadata has only one label. Any extra equipment explicitly named in instructions
  // makes an otherwise matching exercise uncertain, so reject it for an equipment-limited plan.
  if (allowed.length) {
    const extra = EQUIPMENT_WORDS.find((word) => !allowed.some((a) => word === a.toLowerCase()) && mentionsEquipment(text, word))
    if (extra) return `additional equipment is uncertain: ${extra}`
    // Some catalog entries say only 'sit upright' or name a supported variant while their
    // primary equipment is dumbbell. Do not invent a seat, preacher pad, or other support.
    const name = String(ex.n).toLowerCase()
    const supportVariant = /seated|sitting|preacher|peacher|spider|hyperextension|with support|support head/.test(name)
      || /against (?:a |the )?support|stable object|sturdy object/.test(text)
    const floorSeated = /\b(?:sit|seated|sitting)\s+(?:down\s+)?on\s+(?:the\s+)?(?:floor|ground)\b/.test(text)
    const explicitSupport = ['bench', 'chair', 'box', 'step', 'stability ball', 'exercise ball', 'bosu ball', 'pad', 'machine']
      .some((word) => allowed.includes(word) && mentionsEquipment(text, word))
    if (supportVariant && !floorSeated && !explicitSupport) return 'required support is not established by catalog metadata'
  }
  const upperOnly = ['upper', 'chest', 'back', 'shoulders', 'arms', 'push', 'pull'].includes(constraints.focus)
  // Primary catalog muscles can hide combined lifts (for example a curl + squat).
  // Match named lower-body movements, while allowing a bent-over/hinged row posture.
  const namedLowerMovement = /\b(?:squats?|lunges?|lunging|dead[ -]?lifts?|step[ -]?ups?|hip[ -]?thrusts?|glute[ -]?bridges?|calf[ -]?raises?|burpees?|thrusters?)\b/i.test(ex.n)
  if (upperOnly && namedLowerMovement) return 'named lower-body movement is outside requested upper-body focus'
  if (!areaMatches(ex, constraints.focus || 'full')) return 'outside requested focus'
  if (/form check|technique check/.test(String(ex.n).toLowerCase())) return 'catalog entry is a form-check duplicate'
  if (!['strength', 'calisthenics', 'olympic', 'isometric', 'cardio', 'combat', 'plyometrics'].includes(ex.cat)) return 'not a workout movement'
  return null
}

// Local planning defaults, not a prediction of an individual's workout duration.
// Four seconds per rep, all between-set rests and one minute to change/setup equipment.
const WARMUP_SECONDS = 180
const secondsOf = (e) => e.sets * (e.durationSec || e.reps * 4) + (e.sets - 1) * e.restSec + 60
const minutesOf = (exercises) => exercises.length ? Math.ceil((WARMUP_SECONDS + exercises.reduce((n, e) => n + secondsOf(e), 0)) / 6) / 10 : 0
function prescription(ex, constraints) {
  const advanced = constraints.experience === 'advanced'
  const beginner = constraints.experience === 'beginner'
  const goal = constraints.goal
  const timed = ['isometric', 'cardio', 'combat'].includes(ex.cat)
  const sets = advanced ? 4 : 3
  const reps = goal === 'strength' ? (beginner ? 8 : 5) : goal === 'endurance' ? (advanced ? 20 : 15) : 10
  const restSec = goal === 'strength' ? (beginner ? 120 : 150) : goal === 'endurance' ? 45 : goal === 'hypertrophy' ? 90 : 60
  const durationSec = timed ? (ex.cat === 'isometric' ? (advanced ? 45 : 30) : (advanced ? 90 : 60)) : null
  const result = { id: ex.id, sets, reps: timed ? null : reps, durationSec, restSec, prog: timed ? 'off' : 'double', repsMin: timed ? undefined : Math.max(1, reps - 2) }
  return { ...result, estimatedMinutes: Math.ceil(secondsOf(result) / 6) / 10 }
}

// Soft preferences use logged work, not an inferred physiological readiness score.
export function builderRankingContext(state, catalog, today = todayISO()) {
  const aliases = state.exerciseIdAliases || {}
  const resolve = (id) => resolveMergedExerciseId(id, aliases)
  const workouts = (state.workouts || []).map((w) => ({ ...w, entries: (w.entries || []).map((e) => ({ ...e, id: resolve(e.id) })) }))
  // Shared report credits completed working rows once (including a completed side),
  // using inclusive local-date windows today-6..today and today-2..today.
  const report = trainingReport(workouts, Object.fromEntries(catalog.map((e) => [String(e.id), e])), today)
  return {
    preferredIds: [...new Set((state.favEx || []).map(resolve))],
    recentIds: report.ratings.exercises.map((e) => e.id),
    workload: Object.fromEntries(Object.entries(report.muscles).map(([muscle, value]) => [muscle, { weeklySets: value.workingSets, recentSets: value.recentSets }])),
  }
}

export function buildWorkout(catalog, constraints, { recentIds = [], limit, frequency = null, rankingContext = null } = {}) {
  const recent = new Set(recentIds.map(String))
  const candidates = (Array.isArray(catalog) ? catalog : []).map((ex) => ({ ex, reason: eligibility(ex, constraints) }))
  const eligible = candidates.filter((x) => !x.reason).map(({ ex }) => ex)
  const rejected = candidates.filter((x) => x.reason).map(({ ex, reason }) => ({ id: ex.id, reason }))
  const preferred = constraints.goal === 'strength' ? ['strength', 'olympic']
    : constraints.goal === 'endurance' ? ['cardio', 'combat', 'plyometrics']
      : constraints.goal === 'hypertrophy' ? ['strength', 'calisthenics'] : []
  const favorites = new Set((rankingContext?.preferredIds || []).map(String))
  const workloadPenalty = (ex) => musclesOf(ex).reduce((sum, muscle) => sum + (rankingContext?.workload?.[muscle]?.recentSets || 0) * 0.2 + (rankingContext?.workload?.[muscle]?.weeklySets || 0) * 0.05, 0)
  const score = (ex) => workloadPenalty(ex) - (favorites.has(String(ex.id)) ? 0.75 : 0) + (preferred.length && !preferred.includes(ex.cat) ? 2 : 0) + (recent.has(String(ex.id)) ? 1 : 0)
  const exercises = [], credited = new Set()
  const coverage = (ex) => frequency ? musclesOf(ex).reduce((n, m) => n + (!credited.has(m) && frequency[m]?.days < frequency[m]?.target ? frequency[m].target - frequency[m].days : 0), 0) : 0
  const remaining = [...eligible]
  while (remaining.length && exercises.length < (limit || 12)) {
    remaining.sort((a, b) => coverage(b) - coverage(a) || score(a) - score(b) || a.n.localeCompare(b.n))
    const ex = remaining.shift(), next = prescription(ex, constraints)
    if (minutesOf([...exercises, next]) > (Number(constraints.minutes) || 45)) continue
    exercises.push(next)
    if (next.sets >= 3) musclesOf(ex).forEach((m) => credited.add(m))
  }
  const unsupported = (constraints.excludedMovements || []).find((phrase) => !movementFamily(phrase))
  const adjustmentReason = unsupported ? `Unsupported movement restriction: ${unsupported}. Remove or rephrase it as jumping/hopping, running/jogging, hinging/bent-over, overhead pressing, kneeling, lunging or squatting.` : undefined
  return { exercises, rejected, adjustmentReason, estimatedMinutes: minutesOf(exercises), constraints: structuredClone(constraints), needsAdjustment: !exercises.length || (remaining.length === 0 && exercises.length < 2) }
}

export function buildWeeklyPlan(catalog, constraints, { recentIds = [], rankingContext = null } = {}) {
  const days = Math.max(1, Math.min(7, Number(constraints.trainingDays) || 3))
  const split = constraints.split || 'full-body'
  const plan = []
  const used = new Set()
  for (let day = 0; day < days; day++) {
    const focus = split === 'upper-lower' ? (day % 2 ? 'lower' : 'upper')
      : split === 'ppl' ? ['push', 'pull', 'lower'][day % 3] : (constraints.focus || 'full')
    const frequency = weeklyFrequencyReport(plan, catalog, constraints.muscleFrequencyTarget)
    const workout = buildWorkout(catalog, { ...constraints, focus }, { recentIds: [...recentIds, ...used], frequency, rankingContext })
    workout.exercises.forEach((ex) => used.add(String(ex.id)))
    plan.push({ day: day + 1, focus, ...workout })
  }
  plan.shortages = weeklyFrequencyShortages(plan, catalog, constraints.muscleFrequencyTarget)
  return plan
}

export function validateWorkout(exercises, catalog, constraints) {
  if (!Array.isArray(exercises) || !exercises.length) throw new Error('Add at least one eligible exercise before saving.')
  if (new Set(exercises.map((e) => String(e.id))).size !== exercises.length) throw new Error('A generated workout cannot contain duplicate exercise IDs.')
  const byId = new Map((catalog || []).map((ex) => [String(ex.id), ex]))
  const bad = exercises.find(({ id }) => !byId.has(String(id)) || eligibility(byId.get(String(id)), constraints))
  if (bad) throw new Error(`Exercise ${bad.id} is not eligible for this workout.`)
  for (const e of exercises) {
    const timed = ['isometric', 'cardio', 'combat'].includes(byId.get(String(e.id)).cat)
    if (!Number.isInteger(e.sets) || e.sets < 1 || !Number.isFinite(e.restSec) || e.restSec < 0
      || (timed ? (!Number.isFinite(e.durationSec) || e.durationSec <= 0 || e.reps != null) : (!Number.isInteger(e.reps) || e.reps < 1 || e.durationSec != null))) throw new Error(`Exercise ${e.id} has an invalid prescription.`)
  }
  if (minutesOf(exercises) > (Number(constraints.minutes) || 45)) throw new Error('Workout exceeds the time budget. Increase minutes or rebuild with fewer movements.')
  return true
}

export function swapWorkoutExercise(workout, exerciseId, catalog, constraints, { rankingContext = null } = {}) {
  if (!workout.exercises.some((e) => String(e.id) === String(exerciseId))) throw new Error('Select an exercise in this workout to swap.')
  const used = new Set(workout.exercises.map((e) => String(e.id)))
  const retainedSeconds = workout.exercises.filter((e) => String(e.id) !== String(exerciseId)).reduce((n, e) => n + secondsOf(e), 0)
  const availableMinutes = (Number(constraints.minutes) || 45) - retainedSeconds / 60
  const replacement = availableMinutes > 0 ? buildWorkout(catalog.filter((e) => !used.has(String(e.id))), { ...constraints, minutes: availableMinutes }, { limit: 1, rankingContext }).exercises[0] : null
  if (replacement) {
    const exercises = workout.exercises.map((e) => String(e.id) === String(exerciseId) ? replacement : e)
    validateWorkout(exercises, catalog, constraints)
    return { ...workout, exercises, estimatedMinutes: minutesOf(exercises) }
  }
  throw new Error('No eligible replacement fits the time budget. Increase minutes or adjust equipment, focus, or movement restrictions.')
}

export function weeklyFrequencyShortages(week, catalog, target = 2) {
  return Object.entries(weeklyFrequencyReport(week, catalog, target)).filter(([, r]) => r.days < r.target).map(([muscle, r]) => `${muscle}: ${r.days}/${r.target} days. ${week.length < r.target ? 'Add training days or lower the frequency target.' : 'Add time, broaden focus/equipment, or choose a split with more days for this muscle.'}`)
}

export function weeklyFrequencyReport(week, catalog, target = 2) {
  const index = Object.fromEntries(catalog.map((e) => [String(e.id), e]))
  const counts = {}
  for (const day of week) {
    const credited = {}
    for (const ex of day.exercises) for (const muscle of musclesOf(index[String(ex.id)])) credited[muscle] = (credited[muscle] || 0) + Number(ex.sets || 0)
    for (const [muscle, sets] of Object.entries(credited)) if (sets >= 3) counts[muscle] = (counts[muscle] || 0) + 1
  }
  return Object.fromEntries(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'].map((m) => [m, { days: counts[m] || 0, target: Number(target) || 2 }]))
}

export function catalogForProfile(catalog, aliases = {}) {
  return catalog.filter((exercise) => !Object.hasOwn(aliases, String(exercise.id)))
}
