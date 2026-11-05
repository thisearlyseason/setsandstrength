import { describe, expect, it } from 'vitest'
import { applyExerciseMerge, previewExerciseMerge } from './exercise-merge.js'

describe('user-scoped exercise merges', () => {
  it('previews and atomically rewrites templates and history while preserving every set and the old ID alias', () => {
    const state = { customEx: [{ id: 'new', n: 'Canonical' }], routines: [{ id: 'r1', ex: [{ id: 'old' }] }], workouts: [{ id: 'w1', d: '2026-11-01', entries: [{ id: 'old', sets: [{ done: true, w: 20, r: 8 }] }, { id: 'new', sets: [{ done: true, w: 25, r: 6 }] }] }], active: null, exWeights: { old: { w: 20, d: '2026-10-01' }, new: { w: 25, d: '2026-11-01' } }, exNotes: { old: 'seat 3' }, exerciseIdAliases: {} }
    expect(previewExerciseMerge(state, 'old', 'new')).toMatchObject({ templateReferences: 1, sessionReferences: 1, affectedSets: 2, records: 2 })
    applyExerciseMerge(state, 'old', 'new')
    expect(state.routines[0].ex[0].id).toBe('new')
    expect(state.workouts[0].entries).toHaveLength(1)
    expect(state.workouts[0].entries[0].sets).toHaveLength(2)
    expect(state.exWeights.new).toEqual({ w: 25, d: '2026-11-01' })
    expect(state.exerciseIdAliases.old).toBe('new')
    expect(state.exNotes.new).toBe('seat 3')
  })
  it('rejects self-merges and alias cycles', () => {
    expect(() => applyExerciseMerge({}, 'same', 'same')).toThrow(/different exercises/)
    expect(() => applyExerciseMerge({ exerciseIdAliases: { target: 'old' } }, 'old', 'target')).toThrow(/cycle/)
  })
})

it('validates the canonical catalog entry before changing any part of the account', () => {
  const state = { exerciseIdAliases: {}, workouts: [{ entries: [{ id: 'old', sets: [{ w: 20 }] }] }] }
  const before = structuredClone(state)
  expect(() => applyExerciseMerge(state, 'old', 'missing')).toThrow(/available exercise/)
  expect(state).toEqual(before)
})

it('rejects stale source selections without partly rewriting the account', () => {
  const state = { customEx: [{ id: 'new' }, { id: 'other' }], exerciseIdAliases: { old: 'new' }, workouts: [{ entries: [{ id: 'old', sets: [{ w: 20 }] }] }] }
  const before = structuredClone(state)
  expect(() => applyExerciseMerge(state, 'old', 'other')).toThrow(/already merged/)
  expect(state).toEqual(before)
})

it('normalizes all earlier aliases when their current canonical exercise is merged again', () => {
  const state = { customEx: [{ id: 'b' }, { id: 'c' }], exerciseIdAliases: { a: 'b' }, routines: [{ ex: [{ id: 'a', sets: 2 }, { id: 'c', sets: 3 }] }], active: { entries: [{ id: 'a', sets: [{ w: 10 }] }] }, exWeights: { a: { w: 10 }, c: { w: 20 } } }
  applyExerciseMerge(state, 'b', 'c')
  expect(state.exerciseIdAliases).toEqual({ a: 'c', b: 'c' })
  expect(state.active.entries[0].id).toBe('c')
  expect(state.routines[0].ex).toEqual([{ id: 'c', sets: 5, reps: undefined, rest: undefined }])
  expect(state.exWeights).toEqual({ c: { w: 20 } })
})

it('honors a later deliberate canonical choice after reconciling conflicting offline targets', () => {
  const state = { customEx: [{ id: 'b' }, { id: 'c' }, { id: 'd' }], exerciseMergeEdges: { old: ['b', 'c'] }, exerciseIdAliases: { old: 'b', c: 'b' }, workouts: [{ entries: [{ id: 'c', sets: [{ w: 20 }] }] }] }
  applyExerciseMerge(state, 'b', 'd')
  expect(state.exerciseIdAliases).toEqual({ old: 'd', b: 'd', c: 'd' })
  expect(state.workouts[0].entries[0].id).toBe('d')
})
