import { Capacitor, registerPlugin } from '@capacitor/core'

const NativeAI = registerPlugin('OnDeviceAI')
const STATES = new Set(['unsupported', 'download-needed', 'ready', 'interrupted'])

export function createInferenceProvider({ native = false, adapter = null } = {}) {
  return {
    async availability() {
      if (!native || !adapter) return { state: 'unsupported' }
      try { const result = await adapter.availability(); return { state: STATES.has(result?.state) ? result.state : 'interrupted' } }
      catch { return { state: 'interrupted' } }
    },
    async download() {
      if (!native || !adapter) return { state: 'unsupported' }
      try { const result = await adapter.download(); return { state: STATES.has(result?.state) ? result.state : 'interrupted' } }
      catch { return { state: 'interrupted' } }
    },
    async generate(prompt, { signal } = {}) {
      if (!native || !adapter) throw new Error('On-device inference is unavailable on this platform.')
      if (signal?.aborted) throw new Error('On-device inference was interrupted.')
      return new Promise((resolve, reject) => {
        let settled = false
        const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(value) }
        const abort = () => finish(reject, new Error('On-device inference was interrupted.'))
        const timer = setTimeout(abort, 45000)
        signal?.addEventListener('abort', abort, { once: true })
        ;(async () => {
          const state = await this.availability()
          if (signal?.aborted || settled) return
          if (state.state !== 'ready') throw new Error(`On-device model ${state.state}.`)
          const result = await adapter.generate({ prompt })
          finish(resolve, String(result?.text || ''))
        })().catch((error) => finish(reject, new Error(error?.message?.startsWith('On-device model ') ? error.message : 'On-device inference was interrupted.')))
      })
    },
  }
}

export const inferenceProvider = createInferenceProvider({
  native: Capacitor.isNativePlatform(), adapter: NativeAI,
})
