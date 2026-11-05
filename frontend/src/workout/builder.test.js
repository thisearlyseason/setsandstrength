import { describe, expect, it } from 'vitest'
import { EXDB } from '../lib/exercises-data.js'
import instructions from '../instr/en.js'
import { builderRankingContext, buildWorkout, buildWeeklyPlan, swapWorkoutExercise, weeklyFrequencyReport, catalogForProfile, parseWorkoutRequest, validateWorkout } from './builder.js'

const catalog = [
  { id: 'db-row', n: 'dumbbell bent over row', eq: 'dumbbell', bp: 'back', tg: 'lats', cat: 'strength', inst: ['Hold dumbbells and row.'] },
  { id: 'db-press', n: 'dumbbell bench press', eq: 'dumbbell', bp: 'chest', tg: 'pectorals', cat: 'strength', inst: ['Lie on a bench and press.'] },
  { id: 'cable-row', n: 'cable row', eq: 'cable', bp: 'back', tg: 'lats', cat: 'strength', inst: ['Pull the cable.'] },
  { id: 'db-curl', n: 'dumbbell curl', eq: 'dumbbell', bp: 'upper arms', tg: 'biceps', cat: 'strength', inst: ['Curl both dumbbells.'] },
]

describe('local workout builder', () => {
  it('rejects empty saves and repeated exercise IDs', () => {
    expect(() => validateWorkout([], catalog, {})).toThrow(/at least one/)
    expect(() => validateWorkout([{ id: 'db-row' }, { id: 'db-row' }], catalog, {})).toThrow(/duplicate/)
  })
  it('parses the 35 minute dumbbells only no bench request into hard constraints', () => {
    expect(parseWorkoutRequest('35 minutes, upper body, dumbbells only, no bench')).toMatchObject({
      minutes: 35, focus: 'upper', equipment: ['dumbbell'], excludedEquipment: ['bench'],
    })
  })

  it('rejects exercises requiring a bench or unrequested equipment before ranking', () => {
    const plan = buildWorkout(catalog, { minutes: 35, focus: 'upper', equipment: ['dumbbell'], excludedEquipment: ['bench'] })
    expect(plan.exercises.map((e) => e.id)).toEqual(['db-row', 'db-curl'])
    expect(plan.rejected).toContainEqual({ id: 'db-press', reason: 'excluded equipment: bench' })
  })

  it('validates every proposed ID against the current eligible catalog', () => {
    const constraints = { minutes: 35, focus: 'upper', equipment: ['dumbbell'], excludedEquipment: ['bench'] }
    expect(() => validateWorkout([{ id: 'cable-row' }], catalog, constraints)).toThrow(/not eligible/)
  })

  it('parses experience, goal, training days, split and movement restrictions as editable constraints', () => {
    expect(parseWorkoutRequest('beginner strength, 4 days, upper/lower split, avoid overhead pressing')).toMatchObject({
      experience: 'beginner', goal: 'strength', trainingDays: 4, split: 'upper-lower', excludedMovements: ['overhead pressing'],
    })
  })

  it('rejects restricted movements even when their equipment is allowed', () => {
    const restricted = [{ id: 'overhead', n: 'dumbbell overhead press', eq: 'dumbbell', bp: 'shoulders', tg: 'delts', cat: 'strength', inst: ['Press overhead with dumbbells.'] }]
    const plan = buildWorkout(restricted, { minutes: 35, focus: 'upper', equipment: ['dumbbell'], excludedEquipment: [], excludedMovements: ['overhead pressing'] })
    expect(plan.exercises).toEqual([])
    expect(plan.rejected[0].reason).toMatch(/restricted movement/)
  })

  it('uses goal preference to rank only after eligibility filtering', () => {
    const plan = buildWorkout([
      { id: 'lift', n: 'a dumbbell curl', eq: 'dumbbell', bp: 'arms', tg: 'biceps', cat: 'strength', inst: ['curl'] },
      { id: 'run', n: 'z cardio step', eq: 'body weight', bp: 'legs', tg: 'cardio', cat: 'cardio', inst: ['step'] },
    ], { minutes: 20, focus: 'full', goal: 'endurance', equipment: [], excludedEquipment: [] })
    expect(plan.exercises[0].id).toBe('run')
    expect(plan.rejected.some((x) => x.id === 'run')).toBe(false)
  })

  it('builds the requested number of split sessions with eligible movements', () => {
    const plan = buildWeeklyPlan([...catalog, { id: 'db-squat', n: 'dumbbell squat', eq: 'dumbbell', bp: 'quadriceps', tg: 'quadriceps', cat: 'strength', inst: ['Squat holding dumbbells.'] }], { minutes: 35, focus: 'upper', equipment: ['dumbbell'], excludedEquipment: ['bench'], excludedMovements: [], trainingDays: 4, split: 'upper-lower' })
    expect(plan).toHaveLength(4)
    expect(plan.map((day) => day.focus)).toEqual(['upper', 'lower', 'upper', 'lower'])
    expect(plan.flatMap((day) => day.exercises).every((x) => ['db-row', 'db-curl', 'db-squat'].includes(x.id))).toBe(true)
  })
})

it('rebuilds prescription metadata when swapping a timed movement', () => {
  const constraints = { minutes: 35, focus: 'upper', equipment: ['dumbbell'], excludedEquipment: ['bench'] }
  const result = swapWorkoutExercise({ exercises: [{ id: 'old', reps: null, durationSec: 30, sets: 3, estimatedMinutes: 5 }] }, 'old', catalog, constraints)
  expect(result.exercises[0].reps).toBe(10)
  expect(result.exercises[0].durationSec).toBe(null)
  expect(() => validateWorkout(result.exercises, catalog, constraints)).not.toThrow()
})
it('counts weekly muscle days once after three planned credited sets', () => {
  const result = weeklyFrequencyReport([{ exercises: [{ id: 'x', sets: 2 }, { id: 'y', sets: 1 }] }], [{ id: 'x', tg: 'chest' }, { id: 'y', tg: 'chest' }], 2)
  expect(result.chest).toEqual({ days: 1, target: 2 })
  expect(result.back.days).toBe(0)
})

it('excludes a merged source ID before constraint validation and ranking without changing the shared catalog', () => {
 const scoped = catalogForProfile(catalog, { 'db-row': 'cable-row' })
 const constraints = { minutes: 35, focus: 'upper', equipment: ['dumbbell'], excludedEquipment: ['bench'] }
 expect(buildWorkout(scoped, constraints).exercises.map((e) => e.id)).toEqual(['db-curl'])
 expect(() => validateWorkout([{ id: 'db-row' }], scoped, constraints)).toThrow(/not eligible/)
 expect(catalog.some((e) => e.id === 'db-row')).toBe(true)
})

// Physical Pixel swap regression: primary equipment alone hid a required arm blaster.
it.each(['2403', '2401', '2402', '1656', '10977', '8613', '3761', '4017'])(
  'rejects catalog exercise %s when dumbbells do not establish every support/attachment', (id) => {
    const source = EXDB.find((e) => e.id === id)
    expect(source).toBeDefined()
    const restricted = { ...source, inst: instructions[id] || [] }
    const c = parseWorkoutRequest('35 minutes, upper body, dumbbells only, no bench')
    expect(buildWorkout([restricted], c).exercises).toEqual([])
    expect(() => validateWorkout([{ id }], [restricted], c)).toThrow(/not eligible/)
    const original = buildWorkout([catalog[0]], c)
    const swapped = swapWorkoutExercise(original, 'db-row', [catalog[0], restricted, catalog[3]], c)
    expect(swapped.exercises.map((e) => e.id)).toEqual(['db-curl'])
  },
)
it('keeps explicit floor-seated dumbbell movements eligible without assuming a bench', () => {
  const ex = { id: 'floor-z', n: 'dumbbell seated z press', eq: 'dumbbell', cat: 'strength', bp: 'shoulders', inst: ['Sit on the floor with legs extended and hold dumbbells.'] }
  expect(buildWorkout([ex], parseWorkoutRequest('35 minutes, upper body, dumbbells only, no bench')).exercises[0]?.id).toBe('floor-z')
})
it('does not mistake a dumbbell hammer-curl grip for a separate hammer tool', () => {
  const source = EXDB.find((e) => e.id === '0313')
  const c = parseWorkoutRequest('35 minutes, upper body, dumbbells only, no bench')
  expect(buildWorkout([{ ...source, inst: instructions[source.id] }], c).exercises[0]?.id).toBe('0313')
})
it('allows the arm-blaster variant only when that attachment is explicitly available', () => {
  const source = EXDB.find((e) => e.id === '2403')
  const c = parseWorkoutRequest('35 minutes, upper body, dumbbells and arm blaster, no bench')
  expect(buildWorkout([{ ...source, inst: instructions[source.id] }], c).exercises[0]?.id).toBe('2403')
})

it('adapts prescriptions to experience and goal with timed rest included', () => {
  const beginner = buildWorkout(catalog, { minutes: 35, goal: 'strength', experience: 'beginner' })
  const advanced = buildWorkout(catalog, { minutes: 35, goal: 'strength', experience: 'advanced' })
  const endurance = buildWorkout(catalog, { minutes: 35, goal: 'endurance', experience: 'beginner' })
  expect(beginner.exercises[0].reps).toBeGreaterThan(advanced.exercises[0].reps)
  expect(advanced.exercises[0].sets).toBeGreaterThan(beginner.exercises[0].sets)
  expect(advanced.exercises[0].restSec).toBeGreaterThan(endurance.exercises[0].restSec)
  expect(advanced.exercises[0].estimatedMinutes * 60).toBeGreaterThanOrEqual(advanced.exercises[0].sets * advanced.exercises[0].reps * 4 + (advanced.exercises[0].sets - 1) * advanced.exercises[0].restSec + 60)
})
it('fits generated sessions into the requested time budget and validates real timing on save', () => {
  const constraints = { minutes: 10, goal: 'strength', experience: 'advanced' }
  const plan = buildWorkout(catalog, constraints)
  expect(plan.estimatedMinutes).toBeLessThanOrEqual(10)
  expect(() => validateWorkout([{ id: 'db-row', sets: 20, reps: 50, restSec: 300, estimatedMinutes: 1 }], catalog, constraints)).toThrow(/time|minutes|budget/i)
  expect(() => validateWorkout([{ id: 'db-row', sets: -1, reps: 10, restSec: 60 }], catalog, {})).toThrow(/prescription/i)
})
it('prioritizes weekly muscle coverage over alphabetical duplicates and allows repeats to meet frequency', () => {
  const coverage = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'].map((tg, i) => ({ id: `m${i}`, n: `${i < 6 ? 'a' : 'z'} ${tg}`, eq: 'body weight', cat: 'strength', tg }))
  coverage.push(...Array.from({ length: 12 }, (_, i) => ({ ...coverage[0], id: `duplicate${i}`, n: `a chest ${i}` })))
  const week = buildWeeklyPlan(coverage, { minutes: 60, trainingDays: 2, muscleFrequencyTarget: 2, split: 'full-body' })
  expect(Object.values(weeklyFrequencyReport(week, coverage)).every((r) => r.days === 2)).toBe(true)
})
it('explains impossible weekly targets with an actionable shortage', () => {
  const week = buildWeeklyPlan(catalog, { minutes: 20, trainingDays: 1, muscleFrequencyTarget: 2 })
  expect(week.shortages?.join(' ')).toMatch(/training days|equipment|time|focus/i)
})
it('rejects a swap when only a longer prescription is eligible for the remaining budget', () => {
  const timed = { id: 'hold', n: 'hold', eq: 'body weight', cat: 'isometric', tg: 'abs' }
  const c = { minutes: 13, goal: 'strength', experience: 'advanced' }
  const workout = buildWorkout([catalog[0]], c)
  expect(workout.exercises).toHaveLength(1)
  expect(() => swapWorkoutExercise(workout, 'db-row', [timed, catalog[0]], c)).toThrow(/time budget/)
})
it('rejects a malformed timed prescription instead of trusting its display estimate', () => {
  const ex = { id: 'hold', n: 'hold', eq: 'body weight', cat: 'isometric' }
  expect(() => validateWorkout([{ id: 'hold', sets: 3, reps: 10, durationSec: null, restSec: 60 }], [ex], { minutes: 35 })).toThrow(/prescription/)
})
it('searches past longer replacement candidates to find a movement that fits', () => {
  const c = { minutes: 10, experience: 'advanced' }
  const long = Array.from({ length: 14 }, (_, i) => ({ id: `long${i}`, n: `a cardio ${i}`, eq: 'body weight', cat: 'cardio' }))
  const short = { ...catalog[0], id: 'short', n: 'z row' }
  const workout = buildWorkout([catalog[0]], c)
  expect(swapWorkoutExercise(workout, 'db-row', [...long, short], c).exercises[0].id).toBe('short')
})
it('includes shoulders/triceps on push days and biceps on pull days', () => {
  const c = ['chest', 'shoulders', 'triceps', 'back', 'biceps', 'quadriceps'].map((tg) => ({ id: tg, n: tg, eq: 'body weight', cat: 'strength', tg, bp: tg }))
  const week = buildWeeklyPlan(c, { minutes: 35, trainingDays: 6, split: 'ppl' })
  expect(week[0].exercises.map((e) => e.id)).toEqual(expect.arrayContaining(['chest', 'shoulders', 'triceps']))
  expect(week[1].exercises.map((e) => e.id)).toContain('biceps')
})
it('does not interpret excluded equipment as the only equipment available', () => {
  const c = parseWorkoutRequest('35 minutes, without a bench, avoid cable')
  expect(c.equipment).not.toContain('bench')
  expect(c.equipment).not.toContain('cable')
  expect(buildWorkout([catalog[0]], c).exercises[0]?.id).toBe('db-row')
})
it('honors excluded primary equipment even when instructions omit its name', () => {
  const ex = { ...catalog[0], n: 'row', inst: ['Pull toward your hip.'] }
  expect(buildWorkout([ex], { minutes: 35, excludedEquipment: ['dumbbell'] }).exercises).toEqual([])
})
it('retains setup transitions for every movement and counts warmup once after a swap', () => {
  const constraints = { minutes: 18 }
  const workout = buildWorkout(catalog.slice(0, 3), constraints)
  expect(workout.exercises).toHaveLength(3)
  const swapped = swapWorkoutExercise(workout, workout.exercises[0].id, catalog, constraints)
  // 3 x (3 x 10 x 4s work + 2 x 60s rest + 60s setup), plus 180s warmup.
  expect(swapped.estimatedMinutes).toBe(18)
  expect(() => validateWorkout(swapped.exercises, catalog, constraints)).not.toThrow()
})
it.each(['bodyweight only, no equipment', 'body weight only', 'no-equipment workout', 'without any equipment', 'no tools'])('enforces equipment-free request: %s', (request) => {
  const floor = { id: 'floor', n: 'push-up', eq: 'body weight', cat: 'calisthenics', tg: 'chest', inst: ['Place your hands on the floor.'] }
  const machine = { id: 'machine', n: 'machine chest press', eq: 'machine', cat: 'strength', tg: 'chest' }
  const supported = { ...floor, id: 'support', n: 'incline push-up', inst: ['Place your hands on a bench.'] }
  const constraints = parseWorkoutRequest(`20 minutes, ${request}`)
  expect(constraints.equipment).toEqual(['body weight'])
  expect(buildWorkout([floor, machine, supported], constraints).exercises.map((e) => e.id)).toEqual(['floor'])
  expect(() => validateWorkout([{ id: 'machine' }], [machine], constraints)).toThrow(/not eligible/)
})
it.each(['body weight', 'bodyweight', 'no equipment'])('accepts equipment field %s without requiring an instruction phrase', (equipment) => {
  const floor = { id: 'floor', n: 'push-up', eq: 'body weight', cat: 'calisthenics', tg: 'chest', inst: ['Place your hands on the floor.'] }
  expect(buildWorkout([floor, ...catalog], { minutes: 20, equipment: [equipment] }).exercises.map((e) => e.id)).toEqual(['floor'])
})
it.each(['1655'])('rejects real catalog upper-body metadata that hides a lower-body composite: %s', (id) => {
  const source = EXDB.find((e) => e.id === id)
  expect(source).toBeDefined()
  const exercise = { ...source, inst: instructions[id] || [] }
  const constraints = parseWorkoutRequest('35 minutes, upper body, dumbbells only, no bench')
  expect(buildWorkout([exercise], constraints).exercises).toEqual([])
  expect(() => validateWorkout([{ id }], [exercise], constraints)).toThrow(/not eligible/)
})
it.each(['dumbbell curl lunge', 'dumbbell deadlift row', 'dumbbell step-up curl', 'dumbbell calf raise curl'])('rejects a named lower-body composite from an upper-body-only session: %s', (n) => {
  const exercise = { ...catalog[3], n }
  expect(buildWorkout([exercise], parseWorkoutRequest('35 minutes, upper body, dumbbells only')).exercises).toEqual([])
})
it('keeps bent-over rows and hinged upper-body posture eligible', () => {
  expect(buildWorkout([catalog[0]], parseWorkoutRequest('35 minutes, upper body, dumbbells only')).exercises[0]?.id).toBe('db-row')
})
it('uses favorites only after hard eligibility and resolves merged favorite IDs', () => {
  const constraints = parseWorkoutRequest('35 minutes upper body dumbbells only no bench')
  const rankingContext = builderRankingContext({ favEx: ['old-curl', 'db-press'], exerciseIdAliases: { 'old-curl': 'db-curl' }, workouts: [] }, catalog, '2026-11-04')
  const plan = buildWorkout(catalog, constraints, { rankingContext })
  expect(plan.exercises[0].id).toBe('db-curl')
  expect(plan.exercises.some((e) => e.id === 'db-press')).toBe(false)
})
it('softly lowers eligible movements with more recent logged muscle workload', () => {
  const workouts = [{ d: '2026-11-04', entries: [{ id: 'db-row', sets: Array.from({ length: 8 }, () => ({ done: true, r: 10 })) }] }]
  const rankingContext = builderRankingContext({ workouts }, catalog, '2026-11-04')
  expect(rankingContext.workload.back).toMatchObject({ recentSets: 8, weeklySets: 8 })
  const plan = buildWorkout([catalog[0], catalog[3]], { minutes: 35 }, { rankingContext })
  expect(plan.exercises.map((e) => e.id)).toEqual(['db-curl', 'db-row'])
})
it('leaves baseline ranking unchanged without context or when logs are outside seven local days', () => {
  const baseline = buildWorkout(catalog, { minutes: 35 })
  const rankingContext = builderRankingContext({ workouts: [{ d: '2026-10-28', entries: [{ id: 'db-row', sets: [{ done: true }] }] }] }, catalog, '2026-11-04')
  expect(rankingContext.workload.back.weeklySets).toBe(0)
  expect(buildWorkout(catalog, { minutes: 35 }, { rankingContext }).exercises).toEqual(baseline.exercises)
})
it('uses explicit three/seven local-day windows and excludes warmups and undone rows', () => {
  const entry = (marker = {}) => ({ id: 'db-row', sets: [{ done: true, ...marker }] })
  const rankingContext = builderRankingContext({ workouts: [
    { d: '2026-10-29', entries: [entry()] }, { d: '2026-11-01', entries: [entry()] }, { d: '2026-11-02', entries: [entry()] },
    { d: '2026-11-04', entries: [entry({ phase: 'warmup' }), entry({ done: false })] }, { d: '2026-11-05', entries: [entry()] },
  ] }, catalog, '2026-11-04')
  expect(rankingContext.workload.back).toMatchObject({ weeklySets: 3, recentSets: 1 })
})
it('carries optional soft favorites into weekly generation and preview swaps', () => {
  const constraints = { ...parseWorkoutRequest('35 minutes upper body dumbbells only no bench'), trainingDays: 1 }
  const favorite = { ...catalog[0], id: 'favorite', n: 'z dumbbell row' }
  const scoped = [...catalog, favorite], rankingContext = builderRankingContext({ favEx: ['favorite'], workouts: [] }, scoped, '2026-11-04')
  expect(buildWeeklyPlan(scoped, constraints, { rankingContext })[0].exercises[0].id).toBe('favorite')
  const original = buildWorkout([catalog[0]], constraints)
  expect(swapWorkoutExercise(original, 'db-row', scoped, constraints, { rankingContext }).exercises[0].id).toBe('favorite')
})
it.each([
  ['no jumping', 'single leg hop', 'Hop on one leg.'],
  ['avoid jumping', 'lateral bound', 'Bound to the side.'],
  ['no running', 'jog in place', 'Jog slowly.'],
  ['avoid running', 'sprint', 'Sprint forward.'],
  ['avoid hinging', 'dumbbell bent-over row', 'Hold dumbbells and row.'],
  ['avoid overhead pressing', 'dumbbell press above head', 'Press dumbbells above your head.'],
])('recognizes restriction synonyms for %s: %s', (request, n, instruction) => {
  const ex = { ...catalog[0], n, inst: [`Hold dumbbells. ${instruction}`] }
  const constraints = parseWorkoutRequest(`35 minutes upper body dumbbells only, ${request}`)
  expect(buildWorkout([ex], constraints).exercises).toEqual([])
})
it.each(['no hopping', 'avoid jogging', 'without sprinting', 'avoid bent-over', 'avoid above-head presses'])('parses supported synonym restriction %s into editable constraints', (request) => {
  expect(parseWorkoutRequest(request).excludedMovements).toHaveLength(1)
})
it('keeps unknown negated movement requests editable and rejects uncertain metadata with a clear reason', () => {
  const constraints = parseWorkoutRequest('35 minutes, upper body, dumbbells only, avoid elbow flexion')
  expect(constraints.excludedMovements).toContain('elbow flexion')
  const plan = buildWorkout(catalog, constraints)
  expect(plan.exercises).toEqual([])
  expect(plan.needsAdjustment).toBe(true)
  expect(plan.adjustmentReason).toMatch(/elbow flexion.*remove|remove.*elbow flexion/i)
  expect(plan.rejected[0].reason).toMatch(/unsupported movement restriction: elbow flexion/)
})
it('rejects unsupported manually entered movement restrictions', () => {
  expect(buildWorkout(catalog, { minutes: 35, excludedMovements: ['knee flexion'] }).rejected[0].reason).toMatch(/unsupported movement restriction/)
})
it('shares a negation across equipment and movement phrases without treating no-equipment as an unknown movement', () => {
  const constraints = parseWorkoutRequest('35 minutes upper body dumbbells only, no bench or jumping')
  expect(constraints.excludedEquipment).toContain('bench')
  expect(constraints.excludedMovements).toContain('jumping')
  expect(parseWorkoutRequest('20 minutes, no equipment').excludedMovements).toEqual([])
})

it.each([['abs','15 minutes abs workout','abs'],['arms','20 minutes arms workout','biceps']])('builds a targeted %s session', (focus, request, muscle) => {
 const constraints = parseWorkoutRequest(request)
 expect(constraints.focus).toBe(focus)
 const targeted = [...catalog, {id:'crunch',n:'crunch',tg:'abs',bp:'waist',eq:'body weight',cat:'strength',inst:['Curl the torso.']}]
 const result = buildWorkout(targeted, constraints)
 expect(result.exercises.length).toBeGreaterThan(0)
 expect(result.exercises.every(e=>targeted.find(x=>x.id===e.id).tg===muscle)).toBe(true)
})
