// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { it, expect, vi } from 'vitest'
import SavedWorkouts from './SavedWorkouts.jsx'
it('opens the selected saved builder workout without duplicating program cards', () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host), onOpen = vi.fn(), onBuild = vi.fn()
  const saved = { id: 'original-id', name: 'Upper · 35 min', ex: [{ id: '0293' }] }
  try {
    act(() => root.render(<SavedWorkouts routines={[saved, { ...saved, id: 'program', programId: 'hockey' }]} onOpen={onOpen} onBuild={onBuild} />))
    const buttons = [...host.querySelectorAll('button')]
    expect(buttons.filter(b => b.getAttribute('aria-label')?.startsWith('Open saved workout'))).toHaveLength(1)
    act(() => buttons.find(b => b.getAttribute('aria-label') === 'Open saved workout Upper · 35 min').click())
    expect(onOpen).toHaveBeenCalledWith(saved)
    expect(saved.id).toBe('original-id')
  } finally { act(() => root.unmount()); host.remove() }
})
