// @vitest-environment happy-dom
import React, {act} from 'react'
import {createRoot} from 'react-dom/client'
import {it, expect, vi} from 'vitest'
const state=vi.hoisted(()=>({S:{unit:'kg',routines:[{id:'a',name:'Reusable',ex:[{id:'x',sets:3,reps:8,weight:0,rest:60}]}]}}))
vi.mock('../store/useStore.js',()=>{const useStore=fn=>fn(state);useStore.getState=()=>({update:fn=>fn(state.S)});return {useStore}})
vi.mock('../lib/exercises.js',()=>({allExercises:()=>[{id:'x',n:'Row'}]}))
import ManagePlans from './ManagePlans.jsx'
it('opens the reusable workout editor directly and saves without changing its identity',()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const host=document.createElement('div'),root=createRoot(host),done=vi.fn()
 const Modal=({children})=><div role="dialog">{children}</div>
 try{
  act(()=>root.render(<ManagePlans initialWorkout={state.S.routines[0]} Modal={Modal} requireUser={()=>true} onDone={done}/>))
  expect(host.querySelector('[role="dialog"]')).toBeTruthy()
  expect(host.querySelector('input').value).toBe('Reusable')
  act(()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
  expect(done).toHaveBeenCalledOnce();expect(state.S.routines[0].id).toBe('a')
 }finally{act(()=>root.unmount())}
})
