import { it, expect } from 'vitest'
import { sessionSwapOptions, applySessionSwap } from './session-swaps.js'
const catalog = [
  { id: 'old', n: 'dumbbell row', eq: 'dumbbell', cat: 'strength', tg: 'lats', bp: 'back', inst: ['Hold dumbbells.'] },
  { id: 'safe', n: 'dumbbell bent row', eq: 'dumbbell', cat: 'strength', tg: 'lats', bp: 'back', inst: ['Hold dumbbells.'] },
  { id: 'machine', n: 'machine row', eq: 'machine', cat: 'strength', tg: 'lats', bp: 'back' },
  { id: 'bench', n: 'dumbbell bench row', eq: 'dumbbell', cat: 'strength', tg: 'lats', bp: 'back', inst: ['Lie on a bench.'] },
]
const active = () => ({ cur: 0, builderConstraints: { minutes: 20, focus: 'back', equipment: ['dumbbell'], excludedEquipment: ['bench'] }, builderPrescription: [{ id: 'old', sets: 3, reps: 10, restSec: 60, durationSec: null }], entries: [{ id: 'old', rid: 'r', target: { id: 'old', sets: 3, reps: 10, rest: 60 }, sets: [{ r: 10, w: 20, done: true }, { r: 10, w: 20 }, { r: 10, w: 20 }] }] })
it('filters running builder replacements by original restrictions and current aliases', () => {
  expect(sessionSwapOptions(active(), 0, catalog).map((e) => e.id)).toEqual(['safe'])
  expect(sessionSwapOptions(active(), 0, catalog, { safe: 'machine' })).toEqual([])
  expect(() => applySessionSwap(active(), 0, 'machine', catalog)).toThrow(/eligible|constraints/)
})
it('preserves completed rows and replaces only remaining sets without mutating the source', () => {
  const original = active(), next = applySessionSwap(original, 0, 'safe', catalog)
  expect(next.entries[0].sets).toEqual([original.entries[0].sets[0]])
  expect(next.entries[1].sets).toHaveLength(2)
  expect(next.entries[1].sets.every((s) => !s.done && s.w === 0 && s.r === 10)).toBe(true)
  expect(next.entries[1].target).toMatchObject({ rest: 60, sets: 2 })
  expect(next.cur).toBe(1)
  expect(original.entries).toHaveLength(1)
  expect(next.builderPrescription.map((e) => e.id)).toEqual(['old'])
})
it('counts the extra transition and retained between-set rest against the original time budget', () => {
  const session = active(); session.builderConstraints.minutes = 8
  expect(sessionSwapOptions(session, 0, catalog)).toEqual([])
  expect(() => applySessionSwap(session, 0, 'safe', catalog)).toThrow(/time|budget|eligible/)
})
it('keeps legacy sessions unrestricted by builder equipment rules', () => {
  const session = active(); delete session.builderConstraints; delete session.builderPrescription
  expect(sessionSwapOptions(session, 0, catalog).map((e) => e.id)).toEqual(expect.arrayContaining(['safe', 'machine', 'bench']))
})
it('refuses replacement after every set is completed', () => {
  const session = active(); session.entries[0].sets.forEach((s) => { s.done = true })
  expect(sessionSwapOptions(session, 0, catalog)).toEqual([])
})
it('replaces an unstarted entry in place and removes stale timers', () => {
  const session = active(); session.entries[0].sets.forEach((s) => { s.done = false }); session.setTimer = { until: 100 }; session.restUntil = 123
  const next = applySessionSwap(session, 0, 'safe', catalog)
  expect(next.entries).toHaveLength(1)
  expect(next.entries[0].sets).toHaveLength(3)
  expect(next.entries[0].id).toBe('safe')
  expect(next.setTimer).toBeNull()
  expect(next.restUntil).toBe(0)
  expect(next.builderConstraints).toEqual(session.builderConstraints)
})
it('does not offer an existing session movement or a merged source ID', () => {
  const session = active(); session.entries.push({ ...session.entries[0], id: 'safe' })
  expect(sessionSwapOptions(session, 0, catalog)).toEqual([])
})
it('changes between reps and timed prescriptions without retaining stale reps or load', () => {
  const timed = { id: 'timed', n: 'dumbbell row hold', eq: 'dumbbell', cat: 'isometric', tg: 'lats', bp: 'back', inst: ['Hold dumbbells.'] }
  const next = applySessionSwap(active(), 0, 'timed', [...catalog, timed])
  expect(next.entries[1].target).toMatchObject({ mode: 'time', sec: 30, rest: 60 })
  expect(next.entries[1].sets).toEqual([{ w: 0, sec: 30, done: false }, { w: 0, sec: 30, done: false }])
})
it('preserves a completed side when its row is not marked fully done', () => {
  const session = active()
  session.entries[0].sets[0] = { r: 10, w: 20, done: false, sides: { L: { r: 5, w: 20, done: true }, R: { r: 5, w: 20, done: false } } }
  const next = applySessionSwap(session, 0, 'safe', catalog)
  expect(next.entries[0].sets).toEqual([session.entries[0].sets[0]])
  expect(next.entries[1].sets).toHaveLength(2)
})
it.each([{ phase: 'warmup' }, { phase: 'warm_up' }, { kind: 'warm-up' }, { type: 'warmup' }])('does not add an unfinished warmup row to the replacement set count: %j', (marker) => {
  const session = active(); session.entries[0].sets.unshift({ r: 5, w: 10, done: false, ...marker })
  expect(applySessionSwap(session, 0, 'safe', catalog).entries[1].sets).toHaveLength(2)
})
