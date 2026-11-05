import {expect,it} from 'vitest'
import {cancelPlan,editPlanSession} from './plan-management.js'
it('cancels future scheduling while preserving history and active work',()=>{
 const s={routines:[{id:'a'},{id:'b'}],dayPlan:{'2026-11-03':['a'],'2026-11-05':['a','b']},workouts:[{id:'saved',routineId:'a'}],active:{id:'live',routineIds:['a']}}
 cancelPlan(s,['a'],'2026-11-04')
 expect(s.dayPlan['2026-11-05']).toEqual(['b']);expect(s.dayPlan['2026-11-03']).toEqual(['a']);expect(s.workouts).toHaveLength(1);expect(s.active.id).toBe('live');expect(s.routines[0].cancelledAt).toBeTruthy()
})
it('edits a routine without rewriting completed history and drops stale custom prescriptions',()=>{
 const s={routines:[{id:'a',name:'Old',ex:[{id:'x',sets:3,reps:8}],customPrescription:[]}],workouts:[{name:'Old'}]}
 editPlanSession(s,'a',{name:'New',note:'Slow tempo',ex:[{id:'x',sets:4,reps:10,weight:20,rest:60}]})
 expect(s.routines[0].name).toBe('New');expect(s.routines[0].customPrescription).toBeUndefined();expect(s.workouts[0].name).toBe('Old')
})
it('keeps per-set prescriptions when only the session name changes',()=>{
 const r={id:'a',name:'Old',ex:[{id:'x',sets:2,reps:8}],customPrescription:[{id:'x',sets:[{r:8,w:20},{r:6,w:25}]}]};const s={routines:[r]}
 editPlanSession(s,'a',{...r,name:'New'})
 expect(s.routines[0].customPrescription[0].sets).toHaveLength(2)
})
it('rejects an empty set count without editing the routine',()=>{
 const s={routines:[{id:'a',name:'Old',ex:[{id:'x',sets:2}]}]}
 expect(()=>editPlanSession(s,'a',{name:'New',ex:[{id:'x',sets:''}]})).toThrow()
 expect(s.routines[0].name).toBe('Old')
})
import {programSessionMatches} from './plan-management.js'
import {plannedMuscleCoverage} from './analysis.js'
import {hasWeeklyPlan} from './home-insights.js'
it('finds renamed enrolled sessions by stable program coordinates',()=>{
 expect(programSessionMatches({programId:'p',week:1,sessionIndex:0,name:'My renamed day'},'p',1,0,'Original')).toBe(true)
})
it('does not treat cancelled routines as current unscheduled training',()=>{
 const routines=[{id:'a',cancelledAt:1,programId:'p',ex:[{id:'x',sets:3}]}]
 expect(plannedMuscleCoverage(routines,{}, {x:{tg:'chest',sm:[]}},'2026-11-04').templates.chest).toEqual([])
 expect(hasWeeklyPlan({routines,dayPlan:{}})).toBe(false)
})
