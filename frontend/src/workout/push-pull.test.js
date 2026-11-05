import {it,expect} from 'vitest'
import {EXDB} from '../lib/exercises-data.js'
import programs from './programs.json'
import {matchesExerciseSearch,trainingGroup} from './exercise-search.js'
import {parseWorkoutRequest,buildWorkout} from './builder.js'
it('offers exactly two push and two pull plans with valid target exercises',()=>{
 for(const focus of ['push','pull']){
  const plans=programs.filter(p=>p.sport===focus)
  expect(plans).toHaveLength(2)
  for(const p of plans){expect(p.weeks).toHaveLength(4);for(const w of p.weeks)for(const s of w.sessions)for(const section of s.sections)for(const e of section.exercises){const exercise=EXDB.find(x=>x.id===e.id);expect(exercise).toBeTruthy();expect(trainingGroup(exercise)).toBe(focus)}}
 }
})
it.each(['push','pull'])('supports %s search and generation',focus=>{
 const found=EXDB.filter(e=>matchesExerciseSearch(e,focus+' dumbbell'))
 expect(found.length).toBeGreaterThan(0)
 expect(found.every(e=>e.eq==='dumbbell'||e.n.includes('dumbbell'))).toBe(true)
 const constraints=parseWorkoutRequest(`30 minutes ${focus} workout`)
 expect(constraints.focus).toBe(focus)
 const result=buildWorkout(EXDB,constraints)
 expect(result.exercises.length).toBeGreaterThan(0)
 expect(result.exercises.every(e=>trainingGroup(EXDB.find(x=>x.id===e.id))===focus)).toBe(true)
})
