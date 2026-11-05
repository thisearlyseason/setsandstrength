// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { it, expect, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ state: { customEx: [{ id: 'old', n: 'Old' }, { id: 'keep', n: 'Keep' }], exerciseIdAliases: {} } }))
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector({ S: fixture.state })
  useStore.getState = () => ({ update: () => { throw new Error('This exercise was already merged. Choose the current exercise again.') } })
  return { useStore }
})
vi.mock('../lib/exercises.js', () => ({ allExercises: state => state.customEx, beatsWeight: (id, a, b) => a > b }))
import DuplicateExerciseMerge from './DuplicateExerciseMerge.jsx'
it('shows a stale merge selection error without claiming the merge succeeded', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  const confirm = window.confirm
  window.confirm = () => true
  try {
    await act(async () => root.render(<MemoryRouter><DuplicateExerciseMerge /></MemoryRouter>))
    const selects = host.querySelectorAll('select')
    await act(async () => {
      selects[0].value = 'old'; selects[0].dispatchEvent(new Event('change', { bubbles: true }))
      selects[1].value = 'keep'; selects[1].dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => host.querySelector('button.lime').click())
    expect(host.querySelector('[role=alert]')?.textContent).toMatch(/already merged/)
    expect(host.querySelector('[role=status]')).toBeNull()
  } finally { act(() => root.unmount()); host.remove(); window.confirm = confirm }
})
