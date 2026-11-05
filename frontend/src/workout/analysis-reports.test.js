import { expect, it } from 'vitest'
import { trainingReport, ratingReport } from './analysis.js'
const set = { done:true,w:20,r:8,rir:1,feel:4 }
it('recovery evidence changes with recent workload and reports rated coverage; never invents durations or energy',()=>{
 const workouts=[{id:'a',d:'2026-11-04',entries:[{id:'x',sets:Array.from({length:6},()=>({...set}))}]}]
 const r=trainingReport(workouts,{x:{tg:'chest'}},'2026-11-04')
 expect(r.muscles.chest).toMatchObject({workingSets:6,recentSets:6,ratedSets:6,hardSets:6,loggedSeconds:null})
 expect(r.muscles.chest.recovery).toContain('6')
 expect(r.cardioSeconds).toBe(null)
 expect(r.energyKcal).toBe(null)
 expect(r.ratings.sessions[0]).toMatchObject({id:'a',ratedSets:6})
 expect(r.ratings.exercises[0]).toMatchObject({id:'x',ratedSets:6})
})
it('counts only logged cardio and muscle time and supported energy fields',()=>{
 const r=trainingReport([{id:'a',d:'2026-11-04',entries:[{id:'x',sets:[{done:true,mode:'cardio',min:10,kcal:50},{done:true,phase:'warmup',min:100,kcal:500}]}]}],{x:{tg:'quads'}},'2026-11-04')
 expect(r.cardioSeconds).toBe(600)
 expect(r.muscles.quads.loggedSeconds).toBe(600)
 expect(r.energyKcal).toBe(50)
})
it('suppresses radar for sparse ratings and exposes defined axes only with enough logged coverage',()=>{
 expect(ratingReport([set]).radar).toBe(null)
 const r=ratingReport([...Array(5)].map(()=>({...set})))
 expect(r.radar).toHaveLength(3)
 expect(r.radar.every(a=>a.value>=0&&a.value<=100&&a.definition)).toBe(true)
 expect(r.progression).toContain('1')
})
it('retains old last-training evidence even when current-week workload is empty',()=>{
 const r=trainingReport([{id:'old',d:'2026-10-01',entries:[{id:'x',sets:[set]}]}],{x:{tg:'chest'}},'2026-11-04')
 expect(r.muscles.chest).toMatchObject({lastDate:'2026-10-01',daysSince:34,workingSets:0})
 expect(r.muscles.chest.recovery).toContain('34')
})
it('credits unilateral work once per row and uses only completed limb ratings',()=>{
 const row={done:false,rir:0,sides:{L:{done:true,w:10,r:8,rir:3},R:{done:false,w:20,r:8,rir:0}}}
 const report=trainingReport([{id:'a',d:'2026-11-04',entries:[{id:'x',sets:[row,row,row]}]}],{x:{tg:'chest'}},'2026-11-04')
 expect(report.workingSets).toBe(3)
 expect(report.muscles.chest).toMatchObject({workingSets:3,ratedSets:3,averageRir:3})
})
it('says No training logged for a muscle with no history',()=>{
 expect(trainingReport([],{},'2026-11-04').muscles.chest.recovery).toContain('No training logged')
})
it('includes logged timed cardio from catalog category without treating timed strength as cardio',()=>{
 const workouts=[{id:'a',d:'2026-11-04',entries:[{id:'run',sets:[{done:true,mode:'time',sec:600}]},{id:'hold',sets:[{done:true,mode:'time',sec:60}]}]}]
 const report=trainingReport(workouts,{run:{cat:'cardio'},hold:{cat:'isometric'}},'2026-11-04')
 expect(report.cardioSeconds).toBe(600)
})
