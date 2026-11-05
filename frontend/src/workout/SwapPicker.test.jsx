import { describe, expect, it } from 'vitest'
import { filterSwapOptions } from './SwapPicker.jsx'
const options = [
 {id:'1', n:'incline dumbbell press', eq:'dumbbell', tg:'pectorals', bp:'chest'},
 {id:'2', n:'barbell bench press', eq:'barbell', tg:'pectorals', bp:'chest'},
]
describe('swap search', () => {
 it('matches case-insensitive words across exercise and muscle metadata', () => {
  expect(filterSwapOptions(options, ' CHEST incline ', '').map(e=>e.id)).toEqual(['1'])
 })
 it('combines search with equipment without changing the eligible catalog', () => {
  expect(filterSwapOptions(options, 'press', 'barbell').map(e=>e.id)).toEqual(['2'])
  expect(filterSwapOptions(options, 'squat', '')).toEqual([])
  expect(filterSwapOptions(options, '', '')).toHaveLength(2)
 })
})
