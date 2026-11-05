import { it, expect } from 'vitest'
import { plannedMuscleCoverage } from './analysis.js'
it('credits planned muscles only after 3 aggregated working sets on a date and ignores warmup prescriptions',()=>{
 const routines=[{id:'a',ex:[{id:'x',sets:1}]},{id:'b',ex:[{id:'x',sets:2},{id:'x',sets:4,phase:'warmup'}]},{id:'template',ex:[{id:'x',sets:3}]}]
 const result=plannedMuscleCoverage(routines,{'2026-11-03':['a','b'],'2026-11-04':['a']},{x:{tg:'chest'}},'2026-11-04')
 expect(result.planned.chest).toEqual(['2026-11-03'])
 expect(result.templates.chest).toEqual(['template'])
})
