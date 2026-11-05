import { describe, expect, it } from 'vitest'
import { progressView } from './progress-view.js'

describe('Progress navigation', () => {
  it('defaults to a concise overview and rejects unknown views', () => {
    expect(progressView('', '')).toBe('overview')
    expect(progressView('?view=unknown', '')).toBe('overview')
  })
  it('restores each view from the URL', () => {
    for (const view of ['overview', 'history', 'body', 'insights']) {
      expect(progressView(`?view=${view}`, '')).toBe(view)
    }
  })
  it('opens history for existing log and individual session links', () => {
    expect(progressView('', '#workout-log')).toBe('history')
    expect(progressView('?view=body', '#workout-session%201')).toBe('history')
  })
})
