import { it, expect } from 'vitest'
import { validatedCoachGuidance } from './coach-guidance.js'
it('never renders arbitrary model factual claims or numbers', () => {
  expect(validatedCoachGuidance('You gained 20% strength', 5)).toBe(null)
  expect(validatedCoachGuidance('review_history', 5)).toContain('source sessions')
})
it('uses sparse-data wording even if the model suggests a change', () => {
  expect(validatedCoachGuidance('review_history', 0)).toContain('comparison baseline')
})
