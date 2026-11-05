// @vitest-environment happy-dom
import React, {act} from 'react'
import {createRoot} from 'react-dom/client'
import {it, expect, vi} from 'vitest'
import BodyGoal from './BodyGoal.jsx'
it('previews a body target and saves only a submitted edit', () => {
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),save=vi.fn()
 act(()=>root.render(<BodyGoal S={{unit:'kg',bodyweight:[{d:'2026-11-04',w:82}],targetW:80}} onSave={save}/>))
 expect(host.textContent).toContain('2 kg above target')
 act(()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Edit weight goal').click())
 expect(save).not.toHaveBeenCalled()
 const input=host.querySelector('input');act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'79.2');input.dispatchEvent(new Event('input',{bubbles:true}))})
 act(()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(save).toHaveBeenCalledWith('79.2')
 act(()=>root.unmount());host.remove()
})
