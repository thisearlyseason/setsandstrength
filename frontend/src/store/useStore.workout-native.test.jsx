// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest'
vi.hoisted(() => { vi.stubEnv('VITE_MOBILE', '1'); vi.stubEnv('VITE_WORKOUT', '1') })
vi.mock('../lib/api.js', () => ({ api: vi.fn() }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: true, initReminderSync() {}, nativeLoad: async () => null, nativeSave: async () => true, onAppActive() {}, readJsonFile: async () => null, syncReminder() {}, writeAutoBackup() {}, writeJsonFile: async () => true }))
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true }, registerPlugin: () => ({}) }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast() {} }) } }))
import { api } from '../lib/api.js'
import { useStore, DEF } from './useStore.js'
it('authenticates the Sets & Strength mobile profile instead of entering upstream local-mobile mode', async () => {
  localStorage.clear()
  useStore.setState({ S: structuredClone(DEF), user: null, ready: false })
  api.mockImplementation(async (path) => {
    if (path === '/api/config') return { allow_guest: false }
    if (path === '/api/me') return { user: { id: 'native-test-profile', name: 'Native test' } }
    return { state: structuredClone(DEF), rev: 0 }
  })
  await useStore.getState().boot()
  expect(api).toHaveBeenCalledWith('/api/me')
  expect(useStore.getState().user?.id).toBe('native-test-profile')
  expect(useStore.getState().ready).toBe(true)
})
