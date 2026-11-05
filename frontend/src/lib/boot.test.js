import { expect, it } from 'vitest'
import { bootWait } from './boot.js'

it('finishes the first turn on a fast start', () => {
  expect(bootWait(200, 1250)).toBe(1050)
})

it('dismisses immediately after a full turn or without animation', () => {
  expect(bootWait(1520, 1250)).toBe(0)
  expect(bootWait(undefined, undefined)).toBe(0)
})
