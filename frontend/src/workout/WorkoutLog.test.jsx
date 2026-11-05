// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import WorkoutLog, { loggedRows } from './WorkoutLog.jsx'
describe('Workout log completed rows', () => {
  it('retains the original set numbers and omits unfinished prescriptions', () => {
    expect(
      loggedRows({
        sets: [
          { r: 8, w: 20, done: false },
          { r: 7, w: 22.5, done: true },
          { sec: 45, done: true },
        ],
      }),
    ).toEqual([
      { r: 7, w: 22.5, done: true, number: 2, side: '' },
      { sec: 45, done: true, number: 3, side: '' },
    ])
  })
  it('shows each completed side once, including a partly completed pair', () => {
    const rows = loggedRows({
      sets: [
        {
          sides: {
            L: { done: true, w: 10, r: 8 },
            R: { done: false, w: 12, r: 6 },
          },
        },
      ],
    })
    expect(rows).toEqual([{ done: true, w: 10, r: 8, number: 1, side: 'Left' }])
  })
})


it.each([{phase:'warmup'},{warmup:true},{kind:'warm_up'},{type:'warm-up'}])('retains a parent warmup marker on completed sides (%j)',marker=>{
 const row={...marker,sides:{L:{done:true,w:10,r:8},R:{done:false,w:15,r:8}}}
 expect(loggedRows({sets:[row]})).toEqual([{done:true,w:10,r:8,number:1,side:'Left',warmup:true}])
 expect(row.sides.L.warmup).toBeUndefined()
})

const savedSession=(id,name)=>({id,name,d:'2026-11-04',entries:[{id:'x',sets:[{done:true,w:10,r:8,phase:'warmup'}]}]})
function mountLog(S,onEdit){
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const host=document.createElement('div');document.body.append(host)
 const root=createRoot(host)
 act(()=>root.render(<MemoryRouter><WorkoutLog S={S} onEdit={onEdit}/></MemoryRouter>))
 return {host,close:()=>{act(()=>root.unmount());host.remove()}}
}
it('offers an edit action for the selected saved session without modifying the saved records',()=>{
 const S={unit:'kg',customEx:[],workouts:[savedSession('a','First'),savedSession('b','Second')]}
 const before=JSON.stringify(S),onEdit=vi.fn(),view=mountLog(S,onEdit)
 try{
  const button=view.host.querySelector('button[aria-label="Edit saved session Second on 2026-11-04"]')
  expect(button).not.toBeNull()
  act(()=>button.closest('details').open=true)
  expect(button.textContent).toContain('Edit session')
  act(()=>button.click())
  expect(onEdit).toHaveBeenCalledExactlyOnceWith('b')
  expect(JSON.stringify(S)).toBe(before)
  expect(view.host.querySelector('tbody').textContent).toContain('Warm-up')
 }finally{view.close()}
})
it('disables saved-session editing while a workout is active and explains how to continue',()=>{
 const S={unit:'kg',customEx:[],workouts:[savedSession('a','First')],active:{id:'live'}}
 const before=JSON.stringify(S),onEdit=vi.fn(),view=mountLog(S,onEdit)
 try{
  const button=view.host.querySelector('button[aria-label="Edit saved session First on 2026-11-04"]')
  expect(button).not.toBeNull()
  expect(button.disabled).toBe(true)
  act(()=>button.click())
  expect(onEdit).not.toHaveBeenCalled()
  expect(view.host.textContent).toContain('Finish or cancel your current session')
  expect(JSON.stringify(S)).toBe(before)
 }finally{view.close()}
})
