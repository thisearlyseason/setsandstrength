// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { homeWeek, weightGoal, writeWeightGoal, hasWeeklyPlan } from './home-insights.js'
describe('Home persisted facts', () => {
  it('counts only the current local calendar week through today and uses the saved goal', () => {
    const S = { workouts: [{d:'2026-11-01'}, {d:'2026-11-02'}, {d:'2026-11-04'}, {d:'2026-11-05'}], trainingGoals: {sessions:4} }
    expect(homeWeek(S,'2026-11-04')).toMatchObject({start:'2026-11-02', count:2, target:4})
    expect(homeWeek({workouts:[]},'2026-11-01')).toMatchObject({start:'2026-10-26', target:3})
  })
  it('uses dated weight precision and a canonical goal without unit drift', () => {
    const S = {unit:'lb', bodyweight:[{d:'2026-11-04',w:180.2},{d:'2026-11-03',w:181}], trainingGoals:{weight:170,unit:'lb'}}
    expect(weightGoal(S).latest).toBe(180.2)
    expect(weightGoal(S).target).toBe(170)
    writeWeightGoal(S, '175.3')
    const kg = S.bodyGoalKg
    S.unit='kg'; S.bodyweight=[]
    expect(weightGoal(S).target).toBeCloseTo(79.5,1)
    S.unit='lb'
    expect(weightGoal(S).target).toBe(175.3)
    expect(S.bodyGoalKg).toBe(kg)
    expect(weightGoal(S).delta).toBeNull()
    writeWeightGoal(S,'')
    expect(weightGoal(S).target).toBeNull()
  })
  it('does not equate a single saved workout with a weekly plan', () => {
    expect(hasWeeklyPlan({routines:[{id:'one'}],dayPlan:{}})).toBe(false)
    expect(hasWeeklyPlan({routines:[{id:'one'}],dayPlan:{'2026-11-04':['one'],'2026-11-06':['one']}})).toBe(true)
  })
})
it('keeps a retained strength target in its original unit when setting a body goal',()=>{
 const S={unit:'lb',trainingGoals:{unit:'kg',strength:100,weight:80}}
 writeWeightGoal(S,'175.3')
 expect(S.trainingGoals.unit).toBe('kg')
 expect(S.trainingGoals.strength).toBe(100)
 expect(S.trainingGoals.weight).toBeCloseTo(79.515,2)
 expect(weightGoal(S).target).toBe(175.3)
})
it('keeps a legacy target precise through unit switches before it is edited', async()=>{
 const {convertStateUnit}=await import('../lib/units.js')
 let S={unit:'lb',targetW:180.2,workouts:[],routines:[],bodyweight:[]}
 S=convertStateUnit(convertStateUnit(S,'kg'),'lb')
 expect(weightGoal(S).target).toBe(180.2)
})
it('respects a goal subsequently edited by an older client',()=>{
 const S={unit:'kg',trainingGoals:{weight:80,unit:'kg'}}
 writeWeightGoal(S,'81')
 S.trainingGoals.weight=82
 expect(weightGoal(S).target).toBe(82)
})
