import { it, expect } from 'vitest'
import { myWorkouts, deleteMyWorkout } from './my-workouts.js'
it('keeps explicit opt-outs and programs out of the reusable collection',()=>{
 expect(myWorkouts([{id:'old'},{id:'saved',inMyWorkouts:true},{id:'once',inMyWorkouts:false},{id:'plan',programId:'p'},{id:'cancelled',cancelledAt:1}]).map(r=>r.id)).toEqual(['old','saved'])
})
it('deletes a template and schedule references without deleting training evidence',()=>{
 const state={routines:[{id:'a'},{id:'b'}],dayPlan:{'2026-11-04':['a','b']},workouts:[{routineIds:['a']}],active:{routineIds:['a'],entries:[]}}
 const history=structuredClone(state.workouts), active=structuredClone(state.active)
 deleteMyWorkout(state,'a')
 expect(state.routines.map(r=>r.id)).toEqual(['b']);expect(state.dayPlan['2026-11-04']).toEqual(['b'])
 expect(state.workouts).toEqual(history);expect(state.active).toEqual(active)
})
