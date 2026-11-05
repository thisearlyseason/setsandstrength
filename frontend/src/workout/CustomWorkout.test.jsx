// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
const fixture=vi.hoisted(()=>({S:null}))
vi.mock('../store/useStore.js',()=>({useStore:Object.assign(selector=>selector({S:fixture.S}),{getState:()=>({update:fn=>fn(fixture.S)})})}))
vi.mock('../lib/exercises.js',async importOriginal=>({...await importOriginal(),allExercises:()=>[{id:'x',n:'Chest press',eq:'dumbbell',tg:'chest',cat:'strength'}],isAssisted:()=>false,beatsWeight:(_,n,old)=>n>old}))
import CustomWorkout from './CustomWorkout.jsx'
it('adds chosen sets to dated history and leaves the current session intact',()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 fixture.S={unit:'kg',customEx:[],workouts:[],routines:[],exWeights:{},active:{id:'live',entries:[]}}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 act(()=>root.render(<MemoryRouter initialEntries={['/create-workout?type=log']}><CustomWorkout requireUser={()=>true}/></MemoryRouter>))
 const input=host.querySelector('input[placeholder="e.g. Upper-body strength"]')
 act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Evening strength');input.dispatchEvent(new Event('input',{bubbles:true}))})
 act(()=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes('Chest press')).click())
 act(()=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes('Add set')).click())
 act(()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(host.querySelector('[role="alert"]')?.textContent).toBeUndefined()
 expect(fixture.S.workouts).toHaveLength(1)
 expect(fixture.S.workouts[0].name).toBe('Evening strength')
 expect(fixture.S.workouts[0].entries[0].sets).toHaveLength(2)
 expect(fixture.S.active.id).toBe('live')
 act(()=>root.unmount());host.remove()
})
