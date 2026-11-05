// @vitest-environment happy-dom
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {it,expect,vi} from 'vitest'
const h=vi.hoisted(()=>({user:{id:'a'},S:null,finish:null,pause:null}))
vi.mock('../store/useStore.js',()=>{const useStore=fn=>fn({S:h.S,user:h.user});useStore.getState=()=>({S:h.S,user:h.user,update:fn=>fn(h.S)});return {useStore}})
vi.mock('react-router-dom',()=>({Link:({to,children})=><a href={to}>{children}</a>}))
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true}}))
vi.mock('@capacitor/app',()=>({App:{addListener:async (name,fn)=>{h.pause=fn;return {remove(){}}}}}))
vi.mock('./local-inference.js',()=>({inferenceProvider:{availability:async()=>({state:'ready'}),generate:(_text,{signal}={})=>new Promise((r,j)=>{h.finish=r;signal?.addEventListener('abort',()=>j(Error('interrupted')),{once:true})})}}))
import LocalCoach from './LocalCoach.jsx'
it('does not show an earlier account answer after a profile switch',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear()
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 h.user={id:'a'};h.S={workouts:[{id:'a-secret',d:'2026-11-04',name:'A private workout',entries:[]}]}
 await act(async()=>root.render(<LocalCoach/>))
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='What changed recently?').click())
 h.user={id:'b'};h.S={workouts:[]}
 await act(async()=>root.render(<LocalCoach/>))
 await act(async()=>h.finish('keep_logging'))
 expect(host.textContent).not.toContain('A private workout')
 expect(host.querySelector('a[href*="a-secret"]')).toBeNull()
 act(()=>root.unmount());host.remove()
})
it('handles future-only imported logs without locking the guide',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.setItem('ss.local-inference.enabled','0')
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 h.user={id:'future'};h.S={workouts:[{id:'future',d:'2999-11-04',name:'Future workout',entries:[]}]}
 await act(async()=>root.render(<LocalCoach/>))
 const input=host.querySelector('#coach-question')
 act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'hello');input.dispatchEvent(new Event('input',{bubbles:true}))})
 await act(async()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(host.textContent).toContain('There is no training history yet')
 expect(host.querySelector('button[type="submit"]').disabled).toBe(false)
 act(()=>root.unmount());host.remove()
})

it('interrupts pending model work on native app pause and keeps calculated facts',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear()
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 h.user={id:'pause'};h.S={workouts:[]};h.pause=null
 await act(async()=>root.render(<LocalCoach/>))
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='What changed recently?').click())
 expect(typeof h.pause).toBe('function')
 await act(async()=>h.pause({isActive:false}))
 expect(host.textContent).toContain('The model request was interrupted')
 expect(host.textContent).toContain('In the last 30 days')
 expect(host.querySelector('button[type="submit"]').disabled).toBe(false)
 act(()=>root.unmount());host.remove()
})
it('recomputes the local comparison window when asking after midnight',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,10,4,12))
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.setItem('ss.local-inference.enabled','0')
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 try{
 h.user={id:'midnight'};h.S={workouts:[{id:'boundary',d:'2026-10-06',name:'Boundary',entries:[]}]}
 await act(async()=>root.render(<LocalCoach/>))
 const ask=()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='What changed recently?').click()
 await act(async()=>ask())
 expect(host.textContent).toContain('you logged 1 sessions')
 vi.setSystemTime(new Date(2026,10,5,12))
 await act(async()=>ask())
 expect(host.textContent).toContain('you logged 0 sessions')
 }finally{act(()=>root.unmount());host.remove();vi.useRealTimers()}
})
it('orders same-day source sessions by recorded start time',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.setItem('ss.local-inference.enabled','0')
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 h.user={id:'same-day'};h.S={workouts:[{id:'older',d:'2026-11-04',start:1000,name:'Earlier workout',entries:[]},{id:'newer',d:'2026-11-04',start:2000,name:'Later workout',entries:[]}]}
 await act(async()=>root.render(<LocalCoach/>))
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='What did I train last?').click())
 expect(host.textContent).toContain('Your latest logged session was Later workout')
 act(()=>root.unmount());host.remove()
})
