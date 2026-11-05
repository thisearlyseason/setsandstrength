// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest'
vi.hoisted(() => { vi.stubEnv('VITE_MOBILE', '1'); vi.stubEnv('VITE_WORKOUT', '1') })
vi.mock('../lib/api.js', () => ({ api: vi.fn(async () => ({})) }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: true, initReminderSync() {}, nativeLoad: async () => null, nativeSave: async () => true, onAppActive() {}, readJsonFile: async () => null, syncReminder() {}, writeAutoBackup() {}, writeJsonFile: async () => true }))
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true }, registerPlugin: () => ({}) }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast() {} }) } }))
import { api } from '../lib/api.js'
import { useStore, DEF } from './useStore.js'
import { localReferencedHashes, referencedHashes } from '../lib/media-refs.js'

it('switches accounts without exposing previous progress-photo metadata or local file references', async () => {
  localStorage.clear()
  const hash = 'a'.repeat(64)
  const stateA = { ...structuredClone(DEF), progressPhotos: [{ id: 'same-id', hash, date: '2026-11-01', pose: 'front' }] }
  useStore.setState({ S: stateA, user: { id: 'account-a' } })
  localStorage.setItem('gym_owner', 'account-a')
  useStore.getState().setUser({ id: 'account-b' })
  expect(useStore.getState().S.progressPhotos || []).toEqual([])
  expect(localReferencedHashes(useStore.getState().S).has(hash)).toBe(false)
  expect(referencedHashes(stateA).has(hash)).toBe(false)
  expect(stateA.progressPhotos[0].hash).toBe(hash)
  expect([...await useStore.getState().stashedMediaHashes({ localOnly: true })]).toContain(hash)
})

it('keeps both local-only photo files through normal A sign-out, B sign-out, and A sign-in', async () => {
  const { createMediaStore, memoryBackend, _setMediaStore } = await import('../lib/media-store.js')
  const media = createMediaStore(memoryBackend(), { now: () => Date.now() - 10_000 })
  _setMediaStore(media)
  localStorage.clear()
  const hashes = ['b'.repeat(64), 'c'.repeat(64)]
  for (const hash of hashes) await media.put(hash, new Blob(['synthetic photo']), { mime: 'image/png', pending: false })
  const photos = hashes.map((hash, i) => ({ id: `photo-${i}`, hash, date: `2026-11-0${i + 3}`, pose: 'front' }))
  const savedA = { ...structuredClone(DEF), progressPhotos: photos }
  const originalPush = useStore.getState().pushState, originalUnsynced = useStore.getState().unsyncedChanges
  const push = vi.fn(async () => {})
  useStore.setState({ S: structuredClone(savedA), user: { id: 'account-a' }, pushState: push, unsyncedChanges: () => ({ owed: false, count: 0 }) })
  localStorage.setItem('gym_owner', 'account-a')
  try {
    expect(await useStore.getState().signOut()).toEqual({ owed: false })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect((await media.list()).map(x => x.hash).sort()).toEqual(hashes)
    const askB = vi.fn()
    api.mockImplementation(async path => path === '/api/data' ? { state: structuredClone(DEF), rev: 1 } : {})
    useStore.getState().setUser({ id: 'account-b' }, { adopt: true })
    await useStore.getState().adoptProfile(askB)
    expect(askB).not.toHaveBeenCalled()
    expect(useStore.getState().S.progressPhotos || []).toEqual([])
    expect(await useStore.getState().keptChanges()).toEqual([])
    expect([...await useStore.getState().stashedMediaHashes({ localOnly: true })].sort()).toEqual(hashes)
    expect(await useStore.getState().signOut()).toEqual({ owed: false })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect((await media.list()).map(x => x.hash).sort()).toEqual(hashes)
    api.mockImplementation(async path => path === '/api/data' ? { state: structuredClone(savedA), rev: 1 } : {})
    push.mockClear()
    const ask = vi.fn()
    useStore.getState().setUser({ id: 'account-a' }, { adopt: true })
    await useStore.getState().adoptProfile(ask)
    expect(ask).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(useStore.getState().sync.pending).toBe(false)
    for (const hash of hashes) expect((await media.get(hash))?.blob.size).toBeGreaterThan(0)
    expect([...await useStore.getState().stashedMediaHashes()]).toEqual([])
    useStore.getState().update(S => { S.progressPhotos = [] }, false)
    expect(await useStore.getState().signOut()).toEqual({ owed: false })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(await media.list()).toEqual([])
  } finally {
    useStore.setState({ pushState: originalPush, unsyncedChanges: originalUnsynced })
    _setMediaStore(null)
    api.mockImplementation(async () => ({}))
  }
})

it('consumes photo-only retention references without restoring metadata deleted in the account', async () => {
  localStorage.clear()
  const hash = 'd'.repeat(64)
  localStorage.setItem('gym_stash', JSON.stringify({ '|account-a': { uid: 'account-a', localPhotosOnly: true, state: { progressPhotos: [{ id: 'deleted-elsewhere', hash }] } } }))
  const originalPush = useStore.getState().pushState
  const push = vi.fn(async () => {})
  useStore.setState({ S: structuredClone(DEF), user: null, pushState: push })
  api.mockImplementation(async path => path === '/api/data' ? { state: structuredClone(DEF), rev: 1 } : {})
  try {
    useStore.getState().setUser({ id: 'account-a' }, { adopt: true })
    await useStore.getState().adoptProfile(vi.fn())
    expect(useStore.getState().S.progressPhotos || []).toEqual([])
    expect([...await useStore.getState().stashedMediaHashes()]).toEqual([])
    expect(push).not.toHaveBeenCalled()
    expect(useStore.getState().sync.pending).toBe(false)
  } finally { useStore.setState({ pushState: originalPush }); api.mockImplementation(async () => ({})) }
})
