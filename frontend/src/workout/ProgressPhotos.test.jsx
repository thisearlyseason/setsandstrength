// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { it, expect, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ state: null, url: vi.fn(), update: vi.fn(), put: vi.fn(), remove: vi.fn() }))
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector(fixture.state)
  useStore.getState = () => ({ ...fixture.state, update: fixture.update, stashedMediaHashes: fixture.stashedMediaHashes })
  return { useStore }
})
vi.mock('../lib/media-store.js', () => ({ mediaStore: { url: fixture.url, release: vi.fn(), put: fixture.put, remove: fixture.remove } }))
vi.mock('../lib/sha256.js', () => ({ sha256Hex: async () => 'c'.repeat(64) }))
import ProgressPhotos from './ProgressPhotos.jsx'

it('does not reuse a previous account photo URL when the next profile has the same photo ID', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  const photo = hash => ({ id: 'same', hash: hash.repeat(64), date: '2026-11-01', pose: 'front' })
  fixture.state = { user: { id: 'a' }, S: { progressPhotos: [photo('a')] } }
  fixture.url.mockResolvedValue('blob:account-a')
  try {
    await act(async () => { root.render(<React.StrictMode><MemoryRouter><ProgressPhotos /></MemoryRouter></React.StrictMode>) })
    expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:account-a')
    fixture.state = { user: { id: 'b' }, S: { progressPhotos: [photo('b')] } }
    fixture.url.mockReturnValueOnce(new Promise(() => {}))
    await act(async () => { root.render(<React.StrictMode><MemoryRouter><ProgressPhotos /></MemoryRouter></React.StrictMode>) })
    expect(host.querySelector('img')).toBeNull()
  } finally { act(() => root.unmount()); host.remove() }
})

it('discards photo processing started in a different account before it can update the new profile', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  let finishBitmap
  vi.stubGlobal('createImageBitmap', vi.fn(() => new Promise(resolve => { finishBitmap = resolve })))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage() {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(fn => fn(new Blob(['photo'])))
  fixture.update.mockClear(); fixture.put.mockClear()
  fixture.state = { user: { id: 'a' }, S: { progressPhotos: [] } }
  try {
    await act(async () => { root.render(<React.StrictMode><MemoryRouter><ProgressPhotos /></MemoryRouter></React.StrictMode>) })
    const input = host.querySelector('input[type=file]')
    Object.defineProperty(input, 'files', { value: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    fixture.state = { user: { id: 'b' }, S: { progressPhotos: [] } }
    await act(async () => { root.render(<React.StrictMode><MemoryRouter><ProgressPhotos /></MemoryRouter></React.StrictMode>) })
    await act(async () => { finishBitmap({ width: 10, height: 10, close() {} }) })
    expect(fixture.update).not.toHaveBeenCalled()
    expect(fixture.put).not.toHaveBeenCalled()
  } finally { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() }
})

it('retains a photo file newly referenced while deletion waits for the stash check', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  let finishStashes
  fixture.stashedMediaHashes = () => new Promise(resolve => { finishStashes = resolve })
  const hash = 'd'.repeat(64)
  fixture.state = { user: { id: 'a' }, S: { progressPhotos: [{ id: 'old', hash, date: '2026-11-01', pose: 'front' }] } }
  fixture.url.mockResolvedValue('blob:photo')
  fixture.remove.mockClear()
  fixture.update.mockImplementation(fn => { const S = structuredClone(fixture.state.S); fn(S); fixture.state = { ...fixture.state, S } })
  const confirm = window.confirm; window.confirm = () => true
  try {
    await act(async () => { root.render(<MemoryRouter><ProgressPhotos /></MemoryRouter>) })
    await act(async () => { host.querySelector('button[aria-label^="Delete"]').click() })
    fixture.state = { ...fixture.state, S: { progressPhotos: [{ id: 'new', hash, date: '2026-11-02', pose: 'front' }] } }
    await act(async () => { finishStashes(new Set()) })
    expect(fixture.remove).not.toHaveBeenCalled()
  } finally { act(() => root.unmount()); host.remove(); window.confirm = confirm; fixture.update.mockReset() }
})
