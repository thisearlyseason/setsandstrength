// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { editCompletedSession, saveWorkoutEdit } from '../lib/session-edit.js'
import SavedSessionEditor from './SavedSessionEditor.jsx'

const mock = vi.hoisted(()=>({snapshot:null,listeners:new Set(),api:null}))
vi.mock('../store/useStore.js',async()=>{
 const {useSyncExternalStore}=await import('react')
 const useStore=selector=>selector(useSyncExternalStore(cb=>{mock.listeners.add(cb);return()=>mock.listeners.delete(cb)},()=>mock.snapshot))
 useStore.getState=()=>mock.api
 return {useStore}
})
let cleanup
function setup(entries){
 const S={unit:'lb',speedUnit:'mph',customEx:[],routines:[],exWeights:{},active:null,workouts:[{id:'saved',name:'Imported session',d:'2026-10-01',start:1000,end:9000,entries}]}
 editCompletedSession(S,'saved')
 const update=fn=>{const next=structuredClone(mock.snapshot.S);fn(next);mock.snapshot={S:next};mock.listeners.forEach(fn=>fn())}
 mock.snapshot={S};mock.api={update,saveHistoryEdit:vi.fn(()=>{let record;update(s=>{record=saveWorkoutEdit(s)});return record}),discardHistoryEdit:vi.fn(()=>update(s=>{s.active=null}))}
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 const Modal=({title,onClose,children})=><section role="dialog" aria-label={title}><button onClick={onClose}>Close review</button>{children}</section>
 const Location=()=>{const location=useLocation();return <p data-location>{location.pathname}{location.hash}</p>}
 act(()=>root.render(<MemoryRouter initialEntries={['/player']}><SavedSessionEditor Modal={Modal} onNotice={vi.fn()}/><Location/></MemoryRouter>))
 cleanup=()=>{act(()=>root.unmount());host.remove();mock.listeners.clear()}
 return host
}
afterEach(()=>cleanup?.())
const input=(host,label,value)=>{const node=host.querySelector(`[aria-label="${label}"]`);expect(node).not.toBeNull();act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}))})}
const click=(host,text)=>{const button=[...host.querySelectorAll('button')].find(b=>b.textContent===text);expect(button).not.toBeUndefined();act(()=>button.click())}
it('edits only the draft then reviews and explicitly saves through existing core API preserving identity and timing',()=>{
 const host=setup([{id:'0025',sets:[{done:true,w:20,r:8,opaque:'kept'}]}])
 const original=structuredClone(mock.snapshot.S.workouts)
 input(host,'Exercise 1 set 1 weight (lb)',25)
 expect(mock.snapshot.S.workouts).toEqual(original)
 click(host,'Review changes')
 expect(host.querySelector('[role="dialog"]').textContent).toContain('160')
 expect(host.querySelector('[role="dialog"]').textContent).toContain('200')
 expect(mock.api.saveHistoryEdit).not.toHaveBeenCalled()
 click(host,'Save changes')
 expect(mock.api.saveHistoryEdit).toHaveBeenCalledTimes(1)
 expect(mock.snapshot.S.workouts).toHaveLength(1)
 expect(mock.snapshot.S.workouts[0]).toMatchObject({id:'saved',d:'2026-10-01',start:1000,end:9000,entries:[{sets:[{w:25,r:8,opaque:'kept'}]}]})
 expect(host.querySelector('[data-location]').textContent).toBe('/progress#workout-saved')
})
it('keeps cardio, timed aliases, partial sides, warmups and opaque data editable without aggregate-only edits',()=>{
 const host=setup([{id:'0025',sets:[{done:false,w:20,r:16,opaque:'row',sides:{L:{done:true,w:10,r:8,feel:4,opaque:'left'},R:{done:false,w:20,r:8,opaque:'right'}}}]},{id:'3666',sets:[{done:true,mode:'cardio',min:12,speed:16.09344,distance:3,distanceUnit:'km',opaque:'cardio'}]},{id:'0025',sets:[{done:true,mode:'time',durationSec:45}]}])
 input(host,'Exercise 1 set 1 weight (lb) Left',12)
 input(host,'Exercise 2 set 1 speed (mph)',5)
 input(host,'Exercise 3 set 1 duration (sec)',60)
 const side=mock.snapshot.S.active.entries[0].sets[0]
 expect(side).toMatchObject({done:false,w:20,r:16,opaque:'row',sides:{L:{w:12,done:true,feel:4,opaque:'left'},R:{w:20,done:false,opaque:'right'}}})
 expect(mock.snapshot.S.active.entries[1].sets[0]).toMatchObject({speed:8.05,distance:3,distanceUnit:'km',opaque:'cardio'})
 expect(mock.snapshot.S.active.entries[2].sets[0]).toMatchObject({durationSec:60})
 const warmup=host.querySelector('[aria-label="Exercise 1 set 1 warmup"]');act(()=>warmup.click())
 expect(mock.snapshot.S.active.entries[0].sets[0]).toMatchObject({phase:'warmup',warmup:true})
 click(host,'Cancel edits');expect(host.querySelector('[role="dialog"]')).not.toBeNull()
 click(host,'Discard changes')
 expect(mock.api.discardHistoryEdit).toHaveBeenCalledTimes(1)
 expect(mock.snapshot.S.workouts[0].entries[0].sets[0].sides.L.w).toBe(10)
})
it('blocks saving when no side or row remains completed without deleting the saved record',()=>{
 const host=setup([{id:'0025',sets:[{done:true,w:20,r:8}]}])
 act(()=>host.querySelector('[aria-label="Exercise 1 set 1 completed"]').click())
 click(host,'Review changes')
 expect(host.textContent).toContain('Keep at least one completed set')
 expect(mock.api.saveHistoryEdit).not.toHaveBeenCalled()
 expect(mock.snapshot.S.workouts).toHaveLength(1)
})
it('saves imported modalities and a partial side faithfully while retaining a concurrently synced note',()=>{
 const host=setup([{id:'0025',opaque:'entry',sets:[{done:false,w:20,r:16,sides:{L:{done:true,w:10,r:8,feel:4,opaque:'left'},R:{done:false,w:20,r:8,opaque:'right'}}}]},{id:'3666',sets:[{done:true,mode:'cardio',min:12,speed:16.09344,distance:3,distanceUnit:'km',opaque:'cardio'}]},{id:'0025',sets:[{done:true,mode:'time',seconds:45,opaque:'timed'}]}])
 input(host,'Exercise 1 set 1 weight (lb) Left',12)
 input(host,'Exercise 2 set 1 speed (mph)',5)
 input(host,'Exercise 3 set 1 duration (sec)',60)
 act(()=>mock.api.update(s=>{s.workouts[0].note='Synced from another device'}))
 click(host,'Review changes');click(host,'Save changes')
 const saved=mock.snapshot.S.workouts[0]
 expect(saved).toMatchObject({id:'saved',note:'Synced from another device',d:'2026-10-01',start:1000,end:9000})
 expect(saved.entries[0]).toMatchObject({opaque:'entry',sets:[{sides:{L:{done:true,w:12,feel:4,opaque:'left'},R:{done:false,w:20,opaque:'right'}}}]})
 expect(saved.entries[1].sets[0]).toMatchObject({min:12,speed:8.05,distance:3,distanceUnit:'km',opaque:'cardio'})
 expect(saved.entries[2].sets[0]).toMatchObject({seconds:60,opaque:'timed'})
})
it('leaves the draft available when the existing save API reports a concurrent deletion',()=>{
 const host=setup([{id:'0025',sets:[{done:true,w:20,r:8}]}])
 input(host,'Exercise 1 set 1 weight (lb)',25)
 mock.api.saveHistoryEdit.mockImplementation(()=>{throw Error('Workout deleted on another device. Your edits are still here.')})
 click(host,'Review changes');click(host,'Save changes')
 expect(host.querySelector('[role="alert"]').textContent).toContain('Your edits are still here')
 expect(mock.snapshot.S.active.entries[0].sets[0].w).toBe(25)
 expect(mock.snapshot.S.workouts[0].entries[0].sets[0].w).toBe(20)
 expect(mock.api.discardHistoryEdit).not.toHaveBeenCalled()
})
it.each([['Exercise 1 set 1 weight (lb)',-5,'w'],['Exercise 1 set 1 weight (lb)','1e309','w']])('rejects invalid numeric input %s without writing it and allows correction', (label,value,field)=>{
 const host=setup([{id:'0025',sets:[{done:true,w:20,r:8}]}])
 input(host,label,value)
 click(host,'Review changes')
 expect(mock.api.saveHistoryEdit).not.toHaveBeenCalled()
 expect(mock.snapshot.S.active.entries[0].sets[0][field]).toBe(20)
 expect(host.querySelector('[role="dialog"]')).toBeNull()
 expect(host.querySelector('[role="alert"]').textContent).toContain('finite')
 input(host,label,25)
 click(host,'Review changes');click(host,'Save changes')
 expect(mock.api.saveHistoryEdit).toHaveBeenCalledTimes(1)
 expect(mock.snapshot.S.workouts[0].entries[0].sets[0].w).toBe(25)
})
it('rejects negative converted cardio speed until it is corrected',()=>{
 const host=setup([{id:'3666',sets:[{done:true,mode:'cardio',min:12,speed:16.09344}]}])
 input(host,'Exercise 1 set 1 speed (mph)',-5)
 click(host,'Review changes')
 expect(host.querySelector('[role="dialog"]')).toBeNull()
 expect(mock.snapshot.S.active.entries[0].sets[0].speed).toBe(16.09344)
 input(host,'Exercise 1 set 1 speed (mph)',5)
 click(host,'Review changes');click(host,'Save changes')
 expect(mock.snapshot.S.workouts[0].entries[0].sets[0].speed).toBe(8.05)
})
