// @vitest-environment happy-dom
import { act,useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach,expect,it,vi } from 'vitest'
import { completedVolumeOf } from '../lib/workout-model.js'
import AdvancedSetRow from './AdvancedSetRow.jsx'
let cleanup
function setup(row,target={}){
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),onChange=vi.fn()
 function View(){const [current,setCurrent]=useState(row);return <AdvancedSetRow entry={{target}} row={current} entryIndex={0} setIndex={0} S={{unit:'lb',speedUnit:'mph'}} onChange={next=>{onChange(next);setCurrent(next)}}/>}
 act(()=>root.render(<View/>));cleanup=()=>{act(()=>root.unmount());host.remove()}
 return {host,onChange}
}
afterEach(()=>cleanup?.())
function input(host,label,value){const node=host.querySelector(`[aria-label="${label}"]`);expect(node).not.toBeNull();act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}))})}
it('logs actual cardio minutes and profile speed while preserving canonical km/h and unknown fields',()=>{
 const row={done:false,min:12,speed:16.09344,opaque:'keep'}, {host,onChange}=setup(row,{mode:'cardio'})
 input(host,'Set 1 duration (minutes)',15)
 input(host,'Set 1 speed (mph)',5)
 act(()=>host.querySelector('[aria-label="Set 1 complete"]').click())
 expect(onChange.mock.lastCall[0]).toMatchObject({min:15,speed:8.05,done:true,opaque:'keep'})
 expect(row).toEqual({done:false,min:12,speed:16.09344,opaque:'keep'})
})
it('edits actual limbs and completion independently while deriving scalar mirrors and retaining opaque fields',()=>{
 const row={done:false,w:20,r:16,opaque:'row',sides:{L:{done:true,w:10,r:8,feel:4,opaque:'left'},R:{done:false,w:20,r:8,opaque:'right'}}}, {host,onChange}=setup(row,{mode:'reps'})
 input(host,'Left set 1 weight (lb)',12)
 input(host,'Left set 1 weight (lb)',10)
 let next=onChange.mock.lastCall[0]
 expect(completedVolumeOf(next)).toBe(80)
 expect(next).toMatchObject({done:false,w:20,r:16,sides:{L:{feel:4,opaque:'left'},R:{done:false,opaque:'right'}}})
 act(()=>host.querySelector('[aria-label="Right set 1 complete"]').click())
 next=onChange.mock.lastCall[0]
 expect(next.done).toBe(true)
 expect(completedVolumeOf(next)).toBe(240)
})
it('rejects negative or nonfinite numbers without calling onChange until corrected',()=>{
 const {host,onChange}=setup({done:false,min:12,speed:16.09344},{mode:'cardio'})
 input(host,'Set 1 speed (mph)',-2)
 expect(onChange).not.toHaveBeenCalled()
 expect(host.querySelector('[role="alert"]').textContent).toContain('finite')
 input(host,'Set 1 speed (mph)','1e309')
 expect(onChange).not.toHaveBeenCalled()
 input(host,'Set 1 speed (mph)',5)
 expect(onChange).toHaveBeenCalledTimes(1)
 expect(onChange.mock.lastCall[0].speed).toBe(8.05)
 expect(host.querySelector('[role="alert"]')).toBeNull()
})
