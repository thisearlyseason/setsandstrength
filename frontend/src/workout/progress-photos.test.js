import { describe, expect, it } from 'vitest'
import { matchingPhotoPairs, validProgressPhoto, resolvePhotoComparison } from './progress-photos.js'

describe('private progress photo records', () => {
  it('only offers two-date comparisons for the same pose', () => {
    const photos = [{ id: 'a', hash: 'a'.repeat(64), date: '2026-01-01', pose: 'front' }, { id: 'b', hash: 'b'.repeat(64), date: '2026-02-01', pose: 'front' }, { id: 'c', hash: 'c'.repeat(64), date: '2026-02-01', pose: 'side' }]
    expect(matchingPhotoPairs(photos, 'front')).toHaveLength(1)
    expect(matchingPhotoPairs(photos, 'front')[0].map((x) => x.id)).toEqual(['a', 'b'])
  })
  it('rejects malformed dates, poses, and missing local blob hashes', () => {
    expect(validProgressPhoto({ id: 'a', hash: 'not-hash', date: 'yesterday', pose: 'front' })).toBe(false)
  })
})

it('hides an old selection when its pose filter changes or a local file is unavailable', () => {
  const photos = [{ id: 'a', hash: 'a'.repeat(64), date: '2026-11-03', pose: 'front' }, { id: 'b', hash: 'b'.repeat(64), date: '2026-11-04', pose: 'front' }]
  const urls = { a: 'local:a', b: 'local:b' }
  const pairs = matchingPhotoPairs(photos, 'front')
  expect(resolvePhotoComparison(pairs, ['a', 'b'], urls)).toEqual(pairs[0])
  expect(resolvePhotoComparison(matchingPhotoPairs(photos, 'side'), ['a', 'b'], urls)).toBeNull()
  expect(resolvePhotoComparison(pairs, ['a', 'b'], { a: 'local:a' })).toBeNull()
  expect(resolvePhotoComparison(pairs, ['a', 'missing'], urls)).toBeNull()
})
