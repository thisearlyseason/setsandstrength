import { describe, expect, it, vi } from 'vitest'
import { createInferenceProvider } from './local-inference.js'

describe('on-device inference boundary', () => {
  it('never attempts inference from the web landing page', async () => {
    const adapter = { availability: vi.fn(), generate: vi.fn() }
    const provider = createInferenceProvider({ native: false, adapter })
    expect(await provider.availability()).toEqual({ state: 'unsupported' })
    await expect(provider.generate('private prompt')).rejects.toThrow(/unavailable/)
    expect(adapter.availability).not.toHaveBeenCalled()
    expect(adapter.generate).not.toHaveBeenCalled()
  })
  it('will only generate after the native device reports ready', async () => {
    const adapter = { availability: vi.fn().mockResolvedValue({ state: 'download-needed' }), generate: vi.fn() }
    const provider = createInferenceProvider({ native: true, adapter })
    await expect(provider.generate('ask')).rejects.toThrow(/download-needed/)
    expect(adapter.generate).not.toHaveBeenCalled()
  })
  it('returns a local response without sending it to any service', async () => {
    const adapter = { availability: vi.fn().mockResolvedValue({ state: 'ready' }), generate: vi.fn().mockResolvedValue({ text: 'Local answer' }) }
    const provider = createInferenceProvider({ native: true, adapter })
    await expect(provider.generate('question')).resolves.toBe('Local answer')
    expect(adapter.generate).toHaveBeenCalledWith({ prompt: 'question' })
  })
})

it('interrupts a local request when aborted and ignores its late completion', async () => {
  let finish
  const adapter={ availability:async()=>({state:'ready'}),generate:()=>new Promise(r=>{finish=r}) }
  const provider=createInferenceProvider({native:true,adapter}),controller=new AbortController()
  const result=provider.generate('private local question',{signal:controller.signal})
  await Promise.resolve();await Promise.resolve()
  controller.abort()
  await expect(result).rejects.toThrow(/interrupted/)
  finish?.({text:'late'})
})
