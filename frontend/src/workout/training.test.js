import { describe, it, expect } from 'vitest'
import {
  enrollProgram,
  startSession,
  completeSession,
  exportJSON,
  readJSON,
  setWarmupFlag,
} from './training.js'
import { mergeStates, stampChange } from '../lib/sync-merge.js'
import { workoutsCSV } from '../lib/export-csv.js'
import { parseImport, mergeImport } from '../lib/import-csv.js'
import programs from './programs.json'
import { editCompletedSession } from '../lib/session-edit.js'
import { isWarmupRow, hasCompletedWork } from '../lib/workout-model.js'
import { bestWeightForEntry } from '../lib/history.js'
const base = () => ({
  unit: 'kg',
  routines: [],
  workouts: [],
  bodyweight: [],
  measurements: [],
  exWeights: {},
  dayPlan: {},
  week: {},
  customEx: [],
  active: null,
  restSec: 90,
})
describe('Workout fork training', () => {
  it('enrolls all tracks as independent versioned routines with four weeks of dates', () => {
    for (const p of programs) {
      const s = base()
      enrollProgram(s, p, '2026-10-30')
      expect(s.routines).toHaveLength(p.ageBand === 'adult' ? 12 : 8)
      expect(s.routines.every((r) => r.programVersion === 1)).toBe(true)
      expect(Object.keys(s.dayPlan)).toHaveLength(s.routines.length)
      s.routines[0].ex[0].reps = 100
      expect(p.weeks[0].sessions[0].sections[0].exercises[0].reps).not.toBe(100)
    }
  })
  it('resumes the same sets after switching routines and finishing the other workout', () => {
    const s = base()
    enrollProgram(s, programs[0], '2026-11-03')
    const [first, second] = s.routines
    startSession(s, first)
    s.active.entries[0].sets[0].done = true
    const original = s.active.id
    startSession(s, second)
    const secondId = s.active.id
    startSession(s, second)
    expect(s.active.id).toBe(secondId)
    startSession(s, first)
    expect(s.active.id).toBe(original)
    expect(s.active.entries[0].sets[0].done).toBe(true)
    completeSession(s)
    expect(s.active.id).toBe(secondId)
    expect(s.active.otherSessions).toHaveLength(0)
    expect(s.workouts.map((w) => w.id)).toEqual([original])
  })
  it('uses upstream prescriptions, logs only completed entries, preserves history across JSON/CSV roundtrips', () => {
    const s = base()
    s.routines.push({
      id: 'r',
      name: 'QA session',
      ex: [{ id: '3948', sets: 2, reps: 8, weight: 0, mode: 'reps', rest: 90 }],
    })
    startSession(s, s.routines[0])
    s.active.entries[0].sets[0].done = true
    const w = completeSession(s)
    expect(s.active).toBeNull()
    expect(s.workouts).toHaveLength(1)
    expect(w.entries).toHaveLength(1)
    expect(readJSON(exportJSON(s))).toEqual(s)
    const imported = base()
    mergeImport(
      imported,
      parseImport(workoutsCSV(s), { unit: 'kg', customEx: [] }),
    )
    expect(imported.workouts).toHaveLength(1)
    expect(imported.workouts[0].entries[0].id).toBe('3948')
  })
  it('preserves both devices workout additions through the upstream conflict merge', () => {
    const initial = base(),
      a = structuredClone(initial),
      b = structuredClone(initial)
    a.workouts.push({ id: 'a', d: '2026-10-30', start: 100, entries: [] })
    b.workouts.push({ id: 'b', d: '2026-10-31', start: 200, entries: [] })
    a._ts = stampChange(initial, a, 1000)
    b._ts = stampChange(initial, b, 1100)
    expect(
      mergeStates(a, b)
        .workouts.map((x) => x.id)
        .sort(),
    ).toEqual(['a', 'b'])
  })
  it('refuses an empty completion and invalid backups', () => {
    expect(() => completeSession(base())).toThrow()
    expect(() => readJSON('{"workouts":[]}')).toThrow()
  })

  it('resolves merged exercise IDs before persisting a completed session', () => {
    const s = base()
    s.exerciseIdAliases = { old: 'canonical' }
    s.routines.push({ id: 'alias', name: 'Alias', ex: [{ id: 'old', sets: 1, reps: 8 }] })
    startSession(s, s.routines[0])
    s.active.entries[0].sets[0] = { done: true, w: 20, r: 8 }
    const workout = completeSession(s)
    expect(workout.entries[0].id).toBe('canonical')
    expect(s.exWeights.canonical).toMatchObject({ w: 20 })
  })
})
it('carries independent builder constraints and prescriptions into an active session', () => {
  const state = base(), routine = { id: 'builder', name: 'Builder', ex: [{ id: '3948', sets: 3, reps: 10 }], builderConstraints: { minutes: 35, equipment: ['dumbbell'] }, builderPrescription: [{ id: '3948', sets: 3, reps: 10, restSec: 60, durationSec: null }] }
  startSession(state, routine)
  expect(state.active.builderConstraints).toEqual(routine.builderConstraints)
  expect(state.active.builderPrescription).toEqual(routine.builderPrescription)
  state.active.builderConstraints.minutes = 50
  expect(routine.builderConstraints.minutes).toBe(35)
})
it('saves edited warmup classification into the original synced record and recalculates working PRs', () => {
  const state = base()
  const entry = (weights) => ({ id: '0025', target: { mode: 'reps' }, sets: weights.map((w) => ({ w, r: 5, done: true })) })
  state.workouts = [
    { id: 'prior', d: '2026-11-01', start: 100, end: 200, entries: [entry([50])], prs: ['0025'] },
    { id: 'edit', d: '2026-11-02', start: 300, end: 400, entries: [entry([80, 30])], prs: ['0025'], badges: [{ label: '2 workouts completed' }] },
  ]
  state.exWeights['0025'] = { w: 80, d: '2026-11-02' }
  const stale = structuredClone(state)
  editCompletedSession(state, 'edit')
  state.active.entries[0].sets[0] = setWarmupFlag(state.active.entries[0].sets[0], true)
  const saved = completeSession(state)
  expect(saved).toMatchObject({ id: 'edit', d: '2026-11-02', start: 300, end: 400, vol: 150, prs: [] })
  expect(saved.entries[0].sets.filter((s) => hasCompletedWork(s) && !isWarmupRow(s))).toHaveLength(1)
  expect(bestWeightForEntry(saved.entries[0])).toBe(30)
  expect(state.exWeights['0025'].w).toBe(50)
  expect(state.workouts).toHaveLength(2)
  expect(state.active).toBeNull()
  const merged = mergeStates(stale, state)
  expect(merged.workouts.filter((w) => w.id === 'edit')).toHaveLength(1)
  expect(merged.workouts.find((w) => w.id === 'edit').vol).toBe(150)
})
it('requires saved-session edits to be saved or canceled before starting another workout', () => {
  const state = base(); state.active = { editingWorkoutId: 'edit', routineIds: ['same'], entries: [] }
  expect(() => startSession(state, { id: 'same', ex: [] })).toThrow(/save|cancel/i)
  expect(state.active.editingWorkoutId).toBe('edit')
})
it.each(['kind', 'type'])('sets canonical work phase and removes a legacy %s warmup marker without losing row data', (key) => {
  const original = { w: 20, r: 10, done: false, phase: 'warmup', warmup: true, [key]: 'warm-up', sides: { L: { w: 20, r: 5, done: true }, R: { w: 20, r: 5, done: false } }, note: 'Keep' }
  const next = setWarmupFlag(original, false)
  expect(isWarmupRow(next)).toBe(false)
  expect(next.phase).toBe('work')
  expect(next[key]).toBeUndefined()
  expect(next.note).toBe('Keep')
  expect(next.sides).toEqual(original.sides)
  expect(hasCompletedWork(next)).toBe(true)
  expect(isWarmupRow(original)).toBe(true)
})
it('preserves unrelated intensifier data when toggling warmup', () => {
  const row = { r: 10, type: 'dropset', drops: [{ r: 5, w: 10 }] }
  const warmup = setWarmupFlag(row, true)
  expect(isWarmupRow(warmup)).toBe(true)
  expect(setWarmupFlag(warmup, false)).toMatchObject({ phase: 'work', type: 'dropset', drops: row.drops })
})
it('saves a completed limb when the aggregate side row is still pending', () => {
  const state = base()
  state.active = { id: 'partial-side-session', d: '2026-11-04', start: 100, entries: [{ id: '0025', sets: [{ done: false, w: 10, r: 16, sides: { L: { done: true, w: 10, r: 8 }, R: { done: false, w: 10, r: 8 } } }] }] }
  const saved = completeSession(state)
  expect(saved.id).toBe('partial-side-session')
  expect(saved.vol).toBe(80)
  expect(saved.entries[0].sets[0].sides.L).toMatchObject({ done: true, w: 10, r: 8 })
  expect(state.workouts).toHaveLength(1)
  expect(state.active).toBeNull()
})
it('rejects a misleading aggregate tick with no completed limbs without changing the active session or history', () => {
  const state = base()
  state.active = { id: 'no-completed-limbs', d: '2026-11-04', start: 100, entries: [{ id: '0025', sets: [{ done: true, w: 10, r: 16, sides: { L: { done: false, w: 10, r: 8 }, R: { done: false, w: 10, r: 8 } } }] }] }
  const before = structuredClone(state)
  expect(() => completeSession(state)).toThrow(/completed set/)
  expect(state).toEqual(before)
})
