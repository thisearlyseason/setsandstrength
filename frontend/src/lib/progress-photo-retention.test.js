import { it, expect } from 'vitest'
import { localReferencedHashes, referencedHashes, referencedFiles } from './media-refs.js'
it('retains progress photos locally without introducing cloud upload references', () => {
  const hash = 'a'.repeat(64)
  const state = { progressPhotos: [{ hash }] }
  expect(localReferencedHashes(state).has(hash)).toBe(true)
  expect(referencedHashes(state).has(hash)).toBe(false)
  expect([...referencedFiles(state)]).toHaveLength(0)
})
