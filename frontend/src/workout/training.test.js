import { describe, it, expect } from 'vitest'
import {
  enrollProgram,
  startSession,
  completeSession,
  exportJSON,
  readJSON,
} from './training.js'
import { mergeStates, stampChange } from '../lib/sync-merge.js'
import { workoutsCSV } from '../lib/export-csv.js'
import { parseImport, mergeImport } from '../lib/import-csv.js'
import programs from './programs.json'
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
})
