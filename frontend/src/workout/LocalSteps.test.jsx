// @vitest-environment happy-dom
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {it,expect,vi} from 'vitest'
const at=new Date(2026,10,3,10).getTime()
vi.mock('./local-steps.js',()=>({nativeStepAdapter:async()=>({}),readLocalSteps:async()=>({state:'ready',count:1234,at:new Date(2026,10,3,10).getTime(),source:'Test health store'})}))
import LocalSteps from './LocalSteps.jsx'
it('labels a retained reading by its actual local date',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 act(()=>root.render(<LocalSteps/>))
 await act(async()=>host.querySelector('button').click())
 expect(host.querySelector('h2').textContent).toBe(`Steps for ${new Date(at).toLocaleDateString()}`)
 act(()=>root.unmount());host.remove()
})
