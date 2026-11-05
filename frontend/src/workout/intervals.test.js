import { describe, expect, it } from 'vitest'
import { intervalRemaining, nextIntervalPhase } from './intervals.js'

describe('interval workout timer', () => {
  it('derives time from elapsed timestamps after backgrounding', () => {
    expect(intervalRemaining({ phase: 'work', endsAt: 11000, remaining: 8 }, 6000)).toBe(5)
  })
  it('advances through work, rest, and rounds', () => {
    expect(nextIntervalPhase({ phase: 'work', round: 1, rounds: 3 })).toMatchObject({ phase: 'rest', round: 1 })
    expect(nextIntervalPhase({ phase: 'rest', round: 1, rounds: 3 })).toMatchObject({ phase: 'work', round: 2 })
    expect(nextIntervalPhase({ phase: 'work', round: 3, rounds: 3 })).toMatchObject({ phase: 'done', round: 3 })
  })
})
