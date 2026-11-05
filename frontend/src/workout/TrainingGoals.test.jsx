// @vitest-environment happy-dom
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
const h=vi.hoisted(()=>({S:null}))
vi.mock('../store/useStore.js',()=>({useStore:{getState:()=>({update:fn=>fn(h.S)})}}))
import TrainingGoals from './TrainingGoals.jsx'
it('does not round a hidden body-weight goal when saving another goal in changed units',()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 h.S={unit:'kg',trainingGoals:{unit:'lb',focus:'fitness',minutes:90,weight:180.2},routines:[],workouts:[],bodyweight:[],exWeights:{}}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 act(()=>root.render(<TrainingGoals S={h.S} requireUser={()=>true}/>))
 act(()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Set goals').click())
 act(()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(h.S.trainingGoals.weight).toBeCloseTo(180.2*0.45359237,8)
 act(()=>root.unmount());host.remove()
})
