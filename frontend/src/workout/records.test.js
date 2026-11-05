import { describe, it, expect } from 'vitest'
import { recordBadges } from './records.js'
const session = (sets) => ({ entries: [{ id: '1760', sets }] })
describe('Workout achievements', () => {
  it('compares completed work and distinguishes session volume from a single-set record', () => {
    const S = {
      workouts: [
        session([
          { done: true, w: 20, r: 10 },
          { done: true, w: 20, r: 10 },
        ]),
      ],
    }
    const result = recordBadges(
      S,
      session([
        { done: true, w: 25, r: 8 },
        { done: false, w: 200, r: 100 },
      ]),
    )
    expect(result).toContainEqual({ id: '1760', label: 'Weight PR' })
    expect(result.some((b) => b.label === 'Volume PR')).toBe(false)
    expect(result.some((b) => b.label === 'Reps PR')).toBe(false)
  })
  it('celebrates the first session without claiming every exercise is a PR', () => {
    expect(
      recordBadges({ workouts: [] }, session([{ done: true, w: 20, r: 10 }])),
    ).toEqual([{ label: '1 workouts completed' }])
  })
})
