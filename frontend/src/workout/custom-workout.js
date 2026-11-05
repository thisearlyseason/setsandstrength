import { resolveMergedExerciseId } from './exercise-merge.js'
import { insertChronological } from '../lib/backfill.js'
import { rebuildPrHistory } from '../lib/workout-date.js'
import { beatsWeight } from '../lib/exercises.js'
import { buildCompletedWorkout } from '../lib/finish-workout.js'
import { workoutVolume, bestWeightForEntry } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
const number=(value,label,min=0,max=100000)=>{
 const n=Number(value)
 if(value==='' || value==null || !Number.isFinite(n)||n<min||n>max) throw Error(`Enter a valid ${label}.`)
 return n
}
export function saveCustomWorkout(S,draft,kind,catalog,today=todayISO()) {
 if(!['log','workout','plan'].includes(kind)) throw Error('Choose a workout type.')
 const name=draft.name?.trim()
 if(!name || name.length>80) throw Error('Enter a name of up to 80 characters.')
 if(!draft.sessions?.length || draft.sessions.length>7 || (kind!=='plan' && draft.sessions.length!==1)) throw Error('Choose one session, or up to seven for a plan.')
 const index=new Map(catalog.map(e=>[e.id,e])), additions=[]
 const note=String(draft.note||'').slice(0,2000)
 const sessions=draft.sessions.map((session,i)=>{
  if(!session.exercises?.length || session.exercises.length>40) throw Error(`Add 1–40 exercises to session ${i+1}.`)
  const seen=new Set()
  const entries=session.exercises.map(input=>{
   const ex={...input,id:resolveMergedExerciseId(input.id,S.exerciseIdAliases)}
   if(ex.custom && !index.has(ex.id)) {
    const n=String(ex.name||'').trim()
    if(!n || n.length>100 || !String(ex.id).startsWith('custom-')) throw Error('Give your custom exercise a name of up to 100 characters.')
    const created={id:ex.id,n,custom:true,eq:'',bp:'',tg:'',sm:[],cat:ex.mode==='cardio'?'cardio':'strength',desc:String(ex.note||'').slice(0,2000)}
    additions.push(created);index.set(ex.id,created)
   }
   if(!index.has(ex.id)||seen.has(ex.id)) throw Error('Choose each exercise once per session.')
   seen.add(ex.id)
   if(!['reps','time','cardio'].includes(ex.mode)) throw Error('Choose a valid exercise mode.')
   if(!ex.sets?.length||ex.sets.length>30) throw Error('Use 1–30 sets per exercise.')
   const sets=ex.sets.map(row=>{
    const values=ex.mode==='reps' ? {r:number(row.r,'reps',1,1000),w:number(row.w,'load',0,10000)} : ex.mode==='time' ? {sec:number(row.sec,'seconds',1,86400)} : {min:number(row.min,'minutes',.1,1440)}
    if(ex.mode==='reps'&&!Number.isInteger(values.r)) throw Error('Reps must be whole numbers.')
    return {...values,done:true,mode:ex.mode}
   })
   return {id:ex.id,note:String(ex.note||'').slice(0,2000),sets,target:{mode:ex.mode,prog:'off',sets:sets.length}}
  })
  return {name:session.name?.trim() || `Day ${i+1}`,entries}
 })
 if(kind==='log') {
  const date=new Date(`${draft.date}T12:00:00`)
  if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||!Number.isFinite(+date)||date.getFullYear()!==Number(draft.date.slice(0,4))||date.getMonth()+1!==Number(draft.date.slice(5,7))||date.getDate()!==Number(draft.date.slice(8,10))||draft.date>today) throw Error('Choose a valid date today or earlier.')
  const time=draft.time || '12:00'
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Choose a valid start time.')
  const start=+new Date(`${draft.date}T${time}:00`)
  const minutes=number(draft.minutes,'session duration',1,1440), end=start+minutes*60000
  if(end>Date.now()) throw Error('A completed workout must end in the past. Check its start time and duration.')
  const w=buildCompletedWorkout({id:crypto.randomUUID(),name,note,d:draft.date,start,entries:sessions[0].entries},{end,prs:[]})
  w.vol=workoutVolume(w)
  S.customEx=[...(S.customEx||[]),...additions]
  S.workouts=rebuildPrHistory(insertChronological(S.workouts,w),w.entries.map(e=>e.id))
  for(const e of w.entries){const weight=bestWeightForEntry(e);if(weight>0 && beatsWeight(e.id,weight,Number(S.exWeights[e.id]?.w || 0))) S.exWeights[e.id]={w:weight,d:w.d}}
  return {workoutId:w.id}
 }
 const group=kind==='plan' ? crypto.randomUUID() : null
 const routines=sessions.map(session=>({id:crypto.randomUUID(),note,name:group ? `${name} · ${session.name}` : name,...(group ? {planGroupId:group}:{}),ex:session.entries.map(e=>({id:e.id,note:e.note,sets:e.sets.length,mode:e.target.mode,prog:'off',reps:e.sets[0].r,sec:e.sets[0].sec,min:e.sets[0].min,weight:e.sets[0].w,rest:90})),customPrescriptionUnit:S.unit,customPrescription:session.entries.map(e=>({id:e.id,config:{sets:e.sets.length,mode:e.target.mode,prog:'off',reps:e.sets[0].r,sec:e.sets[0].sec,min:e.sets[0].min,weight:e.sets[0].w},sets:e.sets.map(({done,...row})=>row)}))}))
 S.customEx=[...(S.customEx||[]),...additions]
 S.routines.push(...routines)
 return {routineIds:routines.map(r=>r.id)}
}

export function newCustomDraft(now=Date.now()) {
 const start=new Date(now-30*60000)
 const pad=n=>String(n).padStart(2,'0')
 return {name:'',date:`${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`,time:`${pad(start.getHours())}:${pad(start.getMinutes())}`,minutes:30,sessions:[{name:'',exercises:[]}]}
}
