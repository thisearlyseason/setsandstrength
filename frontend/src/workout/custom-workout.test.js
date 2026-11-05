import { expect, it } from 'vitest'
import { newCustomDraft, saveCustomWorkout } from './custom-workout.js'
const state=()=>({unit:'kg',customEx:[],routines:[],workouts:[],exWeights:{},dayPlan:{},active:{id:'live',entries:[]}})
const draft=()=>({name:'My strength',date:'2026-11-03',minutes:30,sessions:[{name:'Day one',exercises:[{id:'x',mode:'reps',sets:[{r:8,w:20},{r:6,w:22}]}]}]})
const catalog=[{id:'x',n:'Press',cat:'strength'}]
it('saves a completed workout without touching the live session or inventing PRs',()=>{
 const s=state(),active=structuredClone(s.active)
 saveCustomWorkout(s,draft(),'log',catalog,'2026-11-04')
 expect(s.active).toEqual(active)
 expect(s.routines).toHaveLength(0)
 expect(s.workouts[0]).toMatchObject({d:'2026-11-03',name:'My strength',prs:[]})
 expect(s.workouts[0].entries[0].sets.every(r=>r.done)).toBe(true)
 expect(s.workouts[0].end-s.workouts[0].start).toBe(1800000)
})
it('saves a grouped plan without marking anything complete',()=>{
 const s=state(),d=draft();d.sessions.push({...d.sessions[0],name:'Day two'})
 saveCustomWorkout(s,d,'plan',catalog,'2026-11-04')
 expect(s.routines).toHaveLength(2)
 expect(s.routines[0].planGroupId).toBe(s.routines[1].planGroupId)
 expect(s.workouts).toHaveLength(0)
 expect(s.routines[0].ex[0].reps).toBe(8)
})
it.each([d=>d.date='2026-11-05',d=>d.date='2026-02-30',d=>d.sessions[0].exercises[0].sets[0].w=-1,d=>d.sessions[0].exercises[0].sets[0].r=NaN,d=>d.sessions[0].exercises[0].id='missing',d=>d.sessions=[]])('rejects invalid logs atomically',change=>{
 const s=state(),before=JSON.stringify(s),d=draft();change(d)
 expect(()=>saveCustomWorkout(s,d,'log',catalog,'2026-11-04')).toThrow()
 expect(JSON.stringify(s)).toBe(before)
})

import { startSession } from './training.js'
it('starts saved per-set prescriptions with their original values and converts units',()=>{
 const s=state();s.active=null;s.restSec=90;s.customEx=[{id:'x',n:'Press',cat:'strength',eq:'barbell'}]
 saveCustomWorkout(s,draft(),'workout',catalog,'2026-11-04')
 Object.assign(s,convertStateUnit(s,'lb'))
 startSession(s,s.routines[0])
 expect(s.active.entries[0].sets).toMatchObject([{r:8,w:44,done:false},{r:6,w:48.5,done:false}])
})

import { convertStateUnit } from '../lib/units.js'
import { applyExerciseMerge } from './exercise-merge.js'
it('honors later plan edits instead of restoring stale custom rows',()=>{
 const s=state();s.active=null;s.restSec=90;s.customEx=[{id:'x',n:'Press',cat:'strength',eq:'barbell'}]
 saveCustomWorkout(s,draft(),'workout',catalog,'2026-11-04')
 s.routines[0].ex[0].reps=12;s.routines[0].ex[0].weight=30
 startSession(s,s.routines[0])
 expect(s.active.entries[0].sets[0]).toMatchObject({r:12,w:30})
})
it('preserves all custom rows after two exercise IDs are merged',()=>{
 const s=state();s.active=null;s.restSec=90;s.customEx=[{id:'x',n:'Press',cat:'strength'},{id:'y',n:'Press duplicate',cat:'strength'}]
 const d=draft();d.sessions[0].exercises.push({id:'y',mode:'reps',sets:[{r:10,w:15}]})
 saveCustomWorkout(s,d,'workout',s.customEx,'2026-11-04');applyExerciseMerge(s,'y','x');startSession(s,s.routines[0])
 expect(s.active.entries[0].sets).toMatchObject([{r:8,w:20},{r:6,w:22},{r:10,w:15}])
})

it('keeps the default date and time consistent across midnight',()=>{
 expect(newCustomDraft(+new Date('2026-11-04T00:10:00'))).toMatchObject({date:'2026-11-03',time:'23:40'})
})
it('rejects malformed times before writing a completed record',()=>{
 const s=state(),d=draft();d.time='25:99'
 expect(()=>saveCustomWorkout(s,d,'log',catalog,'2026-11-04')).toThrow('start time')
 expect(s.workouts).toHaveLength(0)
})
it('saves a free-written exercise and its detailed notes as reusable profile data',()=>{
 const s=state(),d=draft();d.note='Outdoor workout';d.sessions[0].exercises=[{id:'custom-written',name:'Hill carry',custom:true,mode:'time',note:'Sandbag uphill, easy walk down',sets:[{sec:60}]}]
 saveCustomWorkout(s,d,'log',catalog,'2026-11-04')
 expect(s.customEx[0]).toMatchObject({id:'custom-written',n:'Hill carry'})
 expect(s.workouts[0].entries[0].note).toBe('Sandbag uphill, easy walk down')
 expect(s.workouts[0].note).toBe('Outdoor workout')
})
it('carries workout and exercise notes into a newly started custom session',()=>{
 const s=state();s.active=null;s.restSec=90;s.customEx=[{id:'x',n:'Press',cat:'strength'}]
 const d=draft();d.note='Take it easy';d.sessions[0].exercises[0].note='Three second lowering'
 saveCustomWorkout(s,d,'workout',catalog,'2026-11-04');startSession(s,s.routines[0])
 expect(s.active.note).toBe('Take it easy');expect(s.active.entries[0].note).toBe('Three second lowering')
})
