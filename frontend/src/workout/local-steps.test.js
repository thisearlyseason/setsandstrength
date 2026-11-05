import { it, expect, vi } from 'vitest'
import { readLocalSteps, localDayWindow } from './local-steps.js'
it('does not read health data or request permission before explicit connection', async()=>{
 const HC={status:vi.fn(),requestPermissions:vi.fn(),readSteps:vi.fn()}
 expect(await readLocalSteps({adapter:{HC,platform:'android'},enabled:false})).toMatchObject({state:'disconnected',count:null})
 expect(HC.status).not.toHaveBeenCalled();expect(HC.readSteps).not.toHaveBeenCalled()
})
it('requests only steps and preserves missing versus measured zero', async()=>{
 const HC={status:async()=>({status:'available',read:{steps:true}}),requestPermissions:vi.fn(async()=>({})),readSteps:vi.fn(async()=>({count:0}))}
 expect(await readLocalSteps({adapter:{HC,platform:'android'},enabled:true,request:true})).toMatchObject({state:'ready',count:0})
 expect(HC.requestPermissions).toHaveBeenCalledWith({read:['steps'],write:[]})
 HC.readSteps.mockResolvedValue({count:null})
 expect(await readLocalSteps({adapter:{HC,platform:'ios'},enabled:true})).toMatchObject({state:'no-data',count:null})
})
it('handles denied permission without inventing a step count',async()=>{
 const HC={status:async()=>({status:'available',read:{steps:false}}),readSteps:vi.fn()}
 expect(await readLocalSteps({adapter:{HC,platform:'android'},enabled:true})).toMatchObject({state:'permission',count:null})
 expect(HC.readSteps).not.toHaveBeenCalled()
 expect(await readLocalSteps({adapter:null,enabled:true})).toMatchObject({state:'unsupported',count:null})
})
it('uses local midnight through now for today, not a rolling 24 hours',()=>{
 const now=new Date(2026,10,4,13,30).getTime(),range=localDayWindow(now)
 expect(new Date(range.from).getHours()).toBe(0)
 expect(new Date(range.from).getDate()).toBe(4)
 expect(range.to).toBe(now)
})
