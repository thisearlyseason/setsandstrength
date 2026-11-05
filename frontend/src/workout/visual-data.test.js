import { expect, it } from 'vitest'
import { ringProgress, measurementTrend } from './visual-data.js'
it('clamps rings while preserving no-target and missing-data states',()=>{
 expect(ringProgress(5,3)).toBe(1)
 expect(ringProgress(2,4)).toBe(.5)
 expect(ringProgress(null,4)).toBe(null)
 expect(ringProgress(2,0)).toBe(null)
 expect(ringProgress(NaN,5)).toBe(null)
})
it('compares the latest two available readings without treating gaps as zero',()=>{
 expect(measurementTrend([{d:'2026-11-01',waist:80},{d:'2026-11-03',waist:null},{d:'2026-11-04',waist:78}], 'waist')).toMatchObject({value:78,delta:-2,date:'2026-11-04',direction:'decrease'})
 expect(measurementTrend([], 'waist')).toMatchObject({value:null,delta:null,direction:'unknown'})
 expect(measurementTrend([{d:'2026-11-01',waist:80}], 'waist').delta).toBe(null)
})
