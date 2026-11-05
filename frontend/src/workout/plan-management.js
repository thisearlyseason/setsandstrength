export function cancelPlan(S,ids,today) {
 const chosen=new Set(ids)
 for(const r of S.routines) if(chosen.has(r.id)) r.cancelledAt=Date.now()
 for(const date of Object.keys(S.dayPlan||{})) if(date>=today) S.dayPlan[date]=S.dayPlan[date].filter(id=>!chosen.has(id))
}
export function editPlanSession(S,id,draft) {
 const current=S.routines.find(r=>r.id===id)
 if(!current) throw Error('This session is no longer available.')
 const name=draft.name?.trim()
 if(!name||name.length>100) throw Error('Enter a session name of up to 100 characters.')
 if(!draft.ex?.length) throw Error('Keep at least one exercise.')
 const ex=draft.ex.map(e=>{
  const copy={...e}
  if(e.sets==null||e.sets==='') throw Error('Enter a set count for every exercise.')
  for(const key of ['reps','weight','sec','min','rest']) if(copy[key]==='') delete copy[key]
  for(const [key,min,max] of [['sets',1,30],['reps',1,1000],['weight',0,10000],['sec',1,86400],['min',.1,1440],['rest',0,3600]]) if(e[key]!=null&&e[key]!==''){
   const n=Number(e[key]);if(!Number.isFinite(n)||n<min||n>max||(['sets','reps'].includes(key)&&!Number.isInteger(n))) throw Error(`Enter valid ${key} for every exercise.`);copy[key]=n
  }
  return copy
 })
 const changed=JSON.stringify(current.ex)!==JSON.stringify(ex)
 current.name=name;current.note=String(draft.note||'').slice(0,2000);current.ex=ex
 if(changed){delete current.customPrescription;delete current.customPrescriptionUnit}
}

export function programSessionMatches(r,programId,week,index,name) {
 return !r.cancelledAt && r.programId===programId && r.week===week && (r.sessionIndex!=null ? r.sessionIndex===index : r.name.endsWith(' · '+name))
}
