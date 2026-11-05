import { describe, it, expect } from 'vitest'
import { startScheduled, completedRoutine } from './session-tools.js'
import { enrollProgram, completeSession } from './training.js'
import programs from './programs.json'
const base = () => ({
  unit: 'kg',
  routines: [],
  workouts: [],
  exWeights: {},
  dayPlan: {},
  active: null,
  restSec: 90,
})
describe('Scheduled training', () => {
  it('moves an unfinished workout once and refuses to overwrite a completed day', () => {
    const s = base()
    enrollProgram(s, programs[0], '2026-11-03')
    const r = s.routines[0]
    startScheduled(s, r, '2026-11-04')
    expect(s.dayPlan['2026-11-03']).not.toContain(r.id)
    expect(s.dayPlan['2026-11-04']).toEqual([r.id])
    s.active.entries[0].sets[0].done = true
    completeSession(s)
    expect(completedRoutine(s, r.id)).toBe(true)
    expect(() => startScheduled(s, r, '2026-11-05')).toThrow(/completed/)
    expect(s.dayPlan['2026-11-04']).toContain(r.id)
  })
  it('pauses set and rest timers while another session is active',()=>{
    const s=base();enrollProgram(s,programs[0]);const [a,b]=s.routines
    startScheduled(s,a,'2026-11-03')
    s.active.setTimer={entry:0,set:0,until:Date.now()+45000,remaining:45}
    s.active.restUntil=Date.now()+30000
    startScheduled(s,b,'2026-11-04')
    const saved=s.active.otherSessions[0]
    expect(saved.setTimer.until).toBe(0)
    expect(saved.setTimer.remaining).toBeGreaterThan(40)
    expect(saved.restUntil).toBe(0)
    startScheduled(s,a,'2026-11-03')
    expect(s.active.setTimer.until).toBe(0)
    expect(s.active.entries[0].sets[0].done).not.toBe(true)
  })
  it('keeps youth and warm-ups out of automatic progression', () => {
    const s = base()
    const youth = programs.find((p) => p.track === 'youth-13')
    enrollProgram(s, youth)
    startScheduled(s, s.routines[0], '2026-11-03')
    expect(s.active.entries.every((e) => e.plan.policy === 'off')).toBe(true)
  })
  it('connects legacy adult plan progression to the actual engine', () => {
    const s = base()
    enrollProgram(s, programs[0])
    startScheduled(s, s.routines[0], '2026-11-03')
    expect(
      s.active.entries.find((e) => e.target.section === 'Main').plan.policy,
    ).toBe('double')
    expect(s.active.entries[0].plan.policy).toBe('off')
  })
})
