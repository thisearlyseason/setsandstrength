// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
const test = vi.hoisted(() => ({ navigate: vi.fn(), notice: vi.fn(), S: null }))
vi.mock('react-router-dom', () => ({ useNavigate: () => test.navigate }))
vi.mock('../store/useStore.js', () => {
  const useStore = (selector) => selector({ S: test.S })
  useStore.getState = () => ({ update: (fn) => fn(test.S) })
  return { useStore }
})
vi.mock('../lib/exercises.js', () => {
  const ex = { id: 'db-row', n: 'dumbbell row', eq: 'dumbbell', bp: 'back', tg: 'lats', cat: 'strength' }
  return { EXDB: [ex], EXIDX: { 'db-row': ex }, imgSrc: () => '/test-row.png', figureOf: () => null }
})
vi.mock('./training.js', () => ({ startSession: (s, routine) => { s.active = { routineId: routine.id } } }))
vi.mock('../instr/en.js', () => ({ default: { 'db-row': ['Hold dumbbells and row.'] } }))
import WorkoutBuilder from './WorkoutBuilder.jsx'
let root, host
beforeEach(() => {
  vi.useFakeTimers()
  test.navigate.mockClear(); test.notice.mockClear()
  test.S = { workouts: [], routines: [], dayPlan: {}, exerciseIdAliases: {} }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  act(() => root.render(<WorkoutBuilder requireUser={() => true} notice={test.notice} />))
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers() })
const button = (label) => [...host.querySelectorAll('button')].find((el) => el.textContent.trim() === label)
it.each(['Add to My Workouts', 'Schedule today', 'Start workout', 'Save weekly plan', 'Schedule this week'])(
  '%s consumes rapid taps before changing screens', (action) => {
    const weekly = action.includes('week')
    act(() => button(weekly ? 'Build weekly plan' : 'Build workout').click())
    const target = button(action)
    act(() => { target.click(); target.click() })
    expect(test.S.routines).toHaveLength(weekly ? 3 : action === 'Start workout' ? 0 : 1)
    if (weekly) expect(new Set(test.S.routines.map((r) => r.name)).size).toBe(3)
    // A second tap must not reach a newly rendered program/start control at the same position.
    expect(test.navigate).not.toHaveBeenCalled()
    expect(target.disabled).toBe(true)
    act(() => vi.advanceTimersByTime(350))
    expect(test.navigate).toHaveBeenCalledTimes(1)
    expect(test.navigate).toHaveBeenCalledWith(action === 'Start workout' ? '/workout' : action.startsWith('Schedule') ? '/plans?view=schedule' : '/plans?view=workouts')
  },
)
it('saves one-based weekly day names and the existing progression contract', () => {
  act(() => button('Build weekly plan').click())
  act(() => button('Save weekly plan').click())
  expect(test.S.routines[0].name).toMatch(/^Day 1 ·/)
  expect(test.S.routines[0].ex[0]).toMatchObject({ id: 'db-row', prog: 'double', repsMin: 8 })
})
it.each(['Save weekly plan', 'Schedule this week'])('%s shares one weekly group ID across saved days', (action) => {
  act(() => button('Build weekly plan').click())
  act(() => button(action).click())
  const groupIds = test.S.routines.map((r) => r.planGroupId)
  expect(groupIds[0]).toEqual(expect.any(String))
  expect(new Set(groupIds).size).toBe(1)
})
it('leaves single-session saves outside weekly plan groups', () => {
  act(() => button('Build workout').click())
  act(() => button('Add to My Workouts').click())
  expect(test.S.routines[0].planGroupId).toBeUndefined()
})
it.each(['Add to My Workouts', 'Start workout', 'Save weekly plan'])('%s retains builder constraints and full original prescription', (action) => {
  act(() => button(action.includes('weekly') ? 'Build weekly plan' : 'Build workout').click())
  act(() => button(action).click())
  for (const routine of test.S.routines) {
    expect(routine.builderConstraints).toMatchObject({ minutes: 35, equipment: ['dumbbell'], excludedEquipment: ['bench'] })
    expect(routine.builderPrescription[0]).toMatchObject({ id: 'db-row', sets: 3, reps: 10, restSec: 60, durationSec: null })
  }
})
it('keeps an open history edit when starting a new builder workout',()=>{
 test.S.active={editingWorkoutId:'existing-session'}
 act(()=>button('Build workout').click())
 act(()=>button('Start workout').click())
 expect(test.S.routines).toHaveLength(0)
 expect(test.S.active.editingWorkoutId).toBe('existing-session')
 expect(test.notice).toHaveBeenCalledWith(expect.stringMatching(/save or cancel/i))
})

it('offers an explicit choice to keep a generated workout when starting', () => {
 act(() => button('Build workout').click())
 const choice = [...host.querySelectorAll('input[type="checkbox"]')].find(el => el.parentElement.textContent.includes('Also add to My Workouts'))
 expect(choice.checked).toBe(false)
 act(() => choice.click())
 act(() => button('Start workout').click())
 expect(test.S.routines).toHaveLength(1)
 expect(test.S.routines[0].inMyWorkouts).toBe(true)
})
it('scheduling alone does not add to the reusable collection', () => {
 act(() => button('Build workout').click())
 act(() => button('Schedule today').click())
 expect(test.S.routines[0].inMyWorkouts).toBe(false)
})
