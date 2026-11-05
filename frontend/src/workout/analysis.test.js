import { describe, expect, it } from 'vitest'
import { exerciseProgress, muscleCoverage, monthlyComparison, comparableLiftChanges } from './analysis.js'

describe('logged training analysis', () => {
  it('uses completed work sets once per local day and excludes warmups', () => {
    const workouts = [
      { id: 'a', d: '2026-11-03', entries: [{ id: 'x', sets: [{ done: true, w: 20, r: 5 }, { done: true, warmup: true, w: 50, r: 2 }] }] },
      { id: 'b', d: '2026-11-03', entries: [{ id: 'x', sets: [{ done: true, w: 20, r: 5 }, { done: true, w: 20, r: 5 }] }] },
    ]
    expect(muscleCoverage(workouts, { x: { tg: 'chest', sm: ['triceps'] } }, '2026-11-04').actual.chest).toEqual(['2026-11-03'])
  })

  it('reports performed exercise sessions, measured max and load volume', () => {
    expect(exerciseProgress([{ d: '2026-11-01', entries: [{ id: 'x', sets: [{ done: true, w: 40, r: 8 }] }] }], 'x')).toMatchObject({ sessions: 1, maxLoad: 40, volume: 320, estimated1RM: 50.67 })
  })

  it('uses recorded reps and time for bodyweight or timed exercises without inventing a load', () => {
    expect(exerciseProgress([{ d: '2026-11-01', entries: [{ id: 'x', sets: [{ done: true, r: 12, sec: 45 }] }] }], 'x')).toMatchObject({ maxLoad: null, recentMax: null, maxReps: 12, maxDurationSec: 45 })
  })

  it('reports rated-set coverage and average effort only when ratings exist', () => {
    expect(exerciseProgress([{ d: '2026-11-01', entries: [{ id: 'x', sets: [{ done: true, w: 20, r: 8, rir: 2, feel: 4 }, { done: true, w: 20, r: 8 }] }] }], 'x')).toMatchObject({ ratedSets: 1, ratingCoverage: 0.5, averageRir: 2, averageFeel: 4 })
  })

  it('marks month comparisons with no prior baseline as unavailable', () => {
    expect(monthlyComparison([{ d: '2026-11-01', entries: [{ sets: [{ done: true, w: 20, r: 5 }] }] }], '2026-11-04')).toMatchObject({ sessions: { current: 1, previous: 0, changePct: null } })
  })

  it('compares dated weight change when at least two readings exist in each period', () => {
    const weights = [{ d: '2026-09-10', w: 80 }, { d: '2026-10-01', w: 79 }, { d: '2026-10-10', w: 78 }, { d: '2026-11-01', w: 77 }]
    expect(monthlyComparison([], '2026-11-04', weights).weightChange).toEqual({ current: -1, previous: -1, change: 0 })
  })
})

it('compares identical rep counts across at least three separate dates without warmups', () => {
 const workouts = [20, 22, 24].map((w, i) => ({ id: `s${i}`, d: `2026-11-0${i+1}`, entries: [{ id: 'lift', sets: [{ done: true, w, r: 8 }, { done: true, warmup: true, w: 100, r: 8 }] }] }))
 const changes = comparableLiftChanges(workouts, { lift: { cat: 'strength', n: 'row', eq: 'dumbbell' } }, '2026-11-04')
 expect(changes[0]).toMatchObject({ reps: 8, sampleSize: 3, change: 4, changePct: 20 })
 expect(comparableLiftChanges(workouts.slice(0, 2), { lift: { cat: 'strength' } }, '2026-11-04')).toEqual([])
})

it('uses least recorded assistance as the best assisted load and never estimates assisted 1RM', () => {
  const result = exerciseProgress([{ d: '2026-11-04', entries: [{ id: 'assisted', sets: [{ done: true, w: 40, r: 8 }, { done: true, w: 20, r: 8 }] }] }], 'assisted', { assisted: true })
  expect(result.bestLoad).toBe(20)
  expect(result.maxLoad).toBe(40)
  expect(result.estimated1RM).toBe(null)
})

it('excludes every legacy and explicit warmup marker from all analysis', () => {
  const warmups = [{ phase: 'warmup' }, { type: 'warm-up' }, { kind: 'warm_up' }, { warmup: true }].map((s) => ({ ...s, done: true, w: 999, r: 10 }))
  const p = exerciseProgress([{ d: '2026-11-04', entries: [{ id: 'x', sets: [...warmups, { done: true, w: 20, r: 5 }] }] }], 'x')
  expect(p.volume).toBe(100)
  expect(p.maxLoad).toBe(20)
})

it('sorts sessions chronologically and separates recent cardio values from records and units', () => {
 const p = exerciseProgress([
 {d:'2026-11-04',entries:[{id:'x',sets:[{done:true,min:12,speed:8,distance:1.5,distanceUnit:'km'}]}]},
 {d:'2026-11-01',entries:[{id:'x',sets:[{done:true,min:20,speed:10,distance:3,distanceUnit:'km'}]}]},
 ],'x')
 expect(p.recentDurationSec).toBe(720)
 expect(p.recentDistance).toBe(1.5)
 expect(p.recentSpeed).toBe(8)
 expect(p.metrics.find((x)=>x.key==='speed')).toMatchObject({unit:'km/h', recent:8,best:10})
 expect(p.metrics.find((x)=>x.key==='distance:km')).toMatchObject({unit:'km',recent:1.5,best:3})
})

it('does not treat absent effort as zero, normalizes RPE, and maximizes estimates across eligible sets', () => {
 const p=exerciseProgress([{d:'2026-11-01',entries:[{id:'x',sets:[{done:true,w:50,r:1,rir:2},{done:true,w:40,r:15,feel:4},{done:true,w:40,r:8,rpe:8}]}]}],'x')
 expect(p.averageRir).toBe(2)
 expect(p.estimated1RM).toBe(60)
})
it('retains zero assistance and does not combine distances in different units',()=>{
 const p=exerciseProgress([{d:'2026-11-04',entries:[{id:'x',sets:[{done:true,w:20,r:8,distance:3,distanceUnit:'km'},{done:true,w:0,r:8,distance:2,distanceUnit:'mi'}]}]}],'x',{assisted:true})
 expect(p.bestLoad).toBe(0)
 expect(p.metrics.filter(x=>x.key.startsWith('distance:')).map(x=>[x.unit,x.best])).toEqual([['km',3],['mi',2]])
})
it('keeps unrated values out of effort averages when feel is logged alone',()=>{
 expect(exerciseProgress([{d:'2026-11-04',entries:[{id:'x',sets:[{done:true,rir:null,feel:4},{done:true,rir:2,feel:null}]}]}],'x')).toMatchObject({averageRir:2,averageFeel:4})
})
it('calculates canonical cardio distance from stored km/h and minutes without calling it measured',()=>{
 const p=exerciseProgress([{d:'2026-11-04',entries:[{id:'x',sets:[{done:true,min:12,speed:10}]}]}],'x')
 expect(p.metrics.find(m=>m.key==='calculatedDistance:km')).toMatchObject({best:2,recent:2,unit:'km',derived:true})
})
it('sums asymmetric completed sides without the scalar max-load approximation',()=>{
 const row={done:true,w:20,r:16,sides:{L:{done:true,w:10,r:8,rir:3},R:{done:true,w:20,r:8,rir:1}}}
 const workouts=[{d:'2026-11-04',entries:[{id:'x',sets:[row]}]}]
 expect(exerciseProgress(workouts,'x')).toMatchObject({volume:240,maxLoad:20,maxReps:8,workingSets:1,estimated1RM:25.33})
 expect(monthlyComparison(workouts,'2026-11-04').volume.current).toBe(240)
 expect(row.r).toBe(16)
})
it('retains completed single-side work and excludes the unfinished side from metrics and ratings',()=>{
 const row={done:false,w:40,r:28,rir:0,sides:{L:{done:true,w:10,r:8,rir:3,feel:4},R:{done:false,w:40,r:20,rir:0,feel:1}}}
 const workouts=[{id:'a',d:'2026-11-04',entries:[{id:'x',sets:[row]}]}]
 expect(exerciseProgress(workouts,'x')).toMatchObject({volume:80,maxLoad:10,maxReps:8,workingSets:1,ratedSets:1,averageRir:3,averageFeel:4})
 expect(muscleCoverage(workouts,{x:{tg:'chest'}},'2026-11-04').evidence['chest:2026-11-04']).toEqual(['a'])
})
