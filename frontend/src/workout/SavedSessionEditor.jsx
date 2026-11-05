import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { allExercises } from '../lib/exercises.js'
import { completedVolumeOf, isSideSet, modeForSet, syncSideAggregate } from '../lib/workout-model.js'
import { editChangesNothing, editLeftEmpty, editedRecord } from '../lib/session-edit.js'
import { speedUnitOf, speedLabel, toSpeed, fromSpeed } from '../lib/speed.js'
import { isWork, isWarmup } from './analysis.js'
import { NOTE_MAX } from '../lib/history.js'
import { setWarmupFlag } from './training.js'

const summary = workout => (workout?.entries || []).reduce((out,entry)=>{
 for(const row of entry.sets || []) if(isWork(row)) {out.sets++;out.volume+=completedVolumeOf(row)}
 return out
},{sets:0,volume:0})

export default function SavedSessionEditor({Modal,onNotice}) {
 const S=useStore(s=>s.S),nav=useNavigate(),[stage,setStage]=useState(null),[error,setError]=useState(''),[invalidFields,setInvalidFields]=useState({})
 const active=S.active
 if(!active?.editingWorkoutId) return null
 const original=editedRecord(S),id=active.editingWorkoutId,speedUnit=speedUnitOf(S)
 const catalog=Object.fromEntries(allExercises(S).slice().reverse().map(ex=>[ex.id,ex]))
 const leave=()=>nav(`/progress#workout-${encodeURIComponent(id)}`)
 const update=fn=>{useStore.getState().update(fn);setError('')}
 function patch(entryIndex,setIndex,side,field,value){
  update(state=>{
   const row=state.active.entries[entryIndex].sets[setIndex]
   const source=side ? row.sides[side] : row
   const next={...source,[field]:value}
   if(field==='rir') delete next.rpe
   if(side){
    const sides={...row.sides,[side]:next}
    // syncSideAggregate normalizes supported mirror fields. Restore opaque side data,
    // including feel, imported aliases and notes, which that helper does not carry.
    state.active.entries[entryIndex].sets[setIndex]={...syncSideAggregate({...row,sides}),sides}
   } else state.active.entries[entryIndex].sets[setIndex]=next
  })
 }
 function cancel(){if(!Object.keys(invalidFields).length && editChangesNothing(S)){useStore.getState().discardHistoryEdit();leave()}else setStage('discard')}
 function review(){if(Object.keys(invalidFields).length){setError('Use finite numbers greater than or equal to zero in all numeric fields before reviewing changes.');return}if(editLeftEmpty(active)){setError('Keep at least one completed set or completed side before saving. The original saved session has not been deleted.');return}setStage('save')}
 function save(){
  try{
   if(Object.keys(invalidFields).length){setStage(null);setError('Use finite numbers greater than or equal to zero before saving.');return}
   if(editLeftEmpty(useStore.getState().S?.active || active)){setStage(null);setError('Keep at least one completed set before saving.');return}
   useStore.getState().saveHistoryEdit();onNotice?.('Saved session changes.');leave()
  }catch(err){setStage(null);setError(err.message || 'Changes could not be saved. Your draft is still available.')}
 }
 function fields(entryIndex,setIndex,row,entry,side){
  const source=side ? row.sides[side] : row,suffix=side ? side==='L' ? ' Left' : ' Right' : ''
  const prefix=`Exercise ${entryIndex+1} set ${setIndex+1}`
  const label=text=>`${prefix} ${text}${suffix}`
  const numeric=(field,text,unit,value=source[field],convert=v=>v)=> <label key={field}>{text}{unit ? ` (${unit})` : ''}<input type="number" min="0" step="any" aria-label={label(`${text}${unit ? ` (${unit})` : ''}`)} aria-invalid={Object.hasOwn(invalidFields,label(text)) || undefined} value={Object.hasOwn(invalidFields,label(text)) ? invalidFields[label(text)] : value ?? ''} onChange={e=>{
   const raw=e.target.value,converted=raw==='' ? null : convert(Number(raw)),key=label(text)
   if(e.target.validity.badInput || (converted!=null && (!Number.isFinite(converted) || converted<0))){
    setInvalidFields(current=>({...current,[key]:raw}));setError('Use finite numbers greater than or equal to zero. The last valid draft value is unchanged.');return
   }
   setInvalidFields(current=>{const next={...current};delete next[key];return next})
   patch(entryIndex,setIndex,side,field,converted)
  }}/></label>
  const mode=modeForSet(source,entry.target || row)
  const durationField=['sec','seconds','durationSec'].find(key=>Object.hasOwn(source,key)) || 'sec'
  return <fieldset key={side || 'main'}><legend>{side ? side==='L' ? 'Left side' : 'Right side' : `Recorded ${mode==='reps' ? 'repetitions' : mode==='time' ? 'time' : 'cardio'}`}</legend>
   <div className="reading-grid">{mode==='reps' ? <>{numeric('w','weight',S.unit)}{numeric('r','reps')}</> : mode==='time' ? <>{numeric(durationField,'duration','sec')}{Object.hasOwn(source,'w') && numeric('w','weight',S.unit)}</> : <>{numeric('min','duration','min')}{numeric('speed','speed',speedLabel(speedUnit),toSpeed(source.speed,speedUnit),v=>fromSpeed(v,speedUnit))}{['distance','dist'].filter(key=>Object.hasOwn(source,key)).map(key=>source.distanceUnit || source.distUnit ? numeric(key,'distance',source.distanceUnit || source.distUnit) : <p key={key}>Recorded distance: {source[key]} (unit not recorded).</p>)}</>}</div>
   <label><input type="checkbox" aria-label={label('completed')} checked={!!source.done} onChange={e=>patch(entryIndex,setIndex,side,'done',e.target.checked)}/> Completed{suffix}</label>
   <details><summary>Optional ratings{suffix}</summary><label>Reps in reserve<select aria-label={label('reps in reserve')} value={source.rir ?? (source.rpe != null ? 10-source.rpe : '')} onChange={e=>patch(entryIndex,setIndex,side,'rir',e.target.value==='' ? null : Number(e.target.value))}><option value="">Not rated</option>{Array.from({length:11},(_,value)=><option key={value} value={value}>{value}</option>)}</select></label><label>Perceived feel<select aria-label={label('perceived feel')} value={source.feel ?? ''} onChange={e=>patch(entryIndex,setIndex,side,'feel',e.target.value==='' ? null : Number(e.target.value))}><option value="">Not rated</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value} / 5</option>)}</select></label></details>
  </fieldset>
 }
 const before=summary(original),after=summary(active)
 return <section className="history-panel"><p className="eyebrow">EDIT SAVED SESSION</p><h1>{active.name || 'Workout'}</h1><p>{active.d} · original session date and timing are preserved.</p><p>Changes stay in this draft until you review and save them.</p><label>Session name<input aria-label="Saved session name" value={active.name || ''} onChange={e=>update(state=>{state.active.name=e.target.value})}/></label>
  {(active.entries || []).map((entry,entryIndex)=><section key={entryIndex}><h2>Exercise {entryIndex+1}: {catalog[entry.id]?.n || entry.id}</h2>{(entry.sets || []).map((row,setIndex)=><fieldset key={setIndex}><legend>Set {setIndex+1}</legend><label><input type="checkbox" aria-label={`Exercise ${entryIndex+1} set ${setIndex+1} warmup`} checked={isWarmup(row)} onChange={e=>update(state=>{state.active.entries[entryIndex].sets[setIndex]=setWarmupFlag(state.active.entries[entryIndex].sets[setIndex],e.target.checked)})}/> Warmup (excluded from working sets)</label>{isSideSet(row) ? ['L','R'].map(side=>fields(entryIndex,setIndex,row,entry,side)) : fields(entryIndex,setIndex,row,entry)}</fieldset>)}</section>)}
  <label>Session note<textarea maxLength={NOTE_MAX} aria-label="Saved session note" value={active.note || ''} onChange={e=>update(state=>{state.active.note=e.target.value.slice(0,NOTE_MAX)})}/></label>
  {error && <p role="alert">{error}</p>}<div className="button-row"><button className="outline" onClick={cancel}>Cancel edits</button><button className="primary" onClick={review}>Review changes</button></div>
  {stage && <Modal title={stage==='save' ? 'Review saved session changes' : 'Discard session changes?'} onClose={()=>setStage(null)}>{stage==='save' ? <><p>Recorded working-set volume: {before.volume} → {after.volume} {S.unit} × reps.</p><p>Completed working-set rows: {before.sets} → {after.sets}. Each side-set row counts once; only completed sides contribute volume.</p><p>Saving replaces this saved session while preserving its date, ID and original timing.</p><button className="outline" onClick={()=>setStage(null)}>Keep editing</button><button className="primary" onClick={save}>Save changes</button></> : <><p>The saved session stays unchanged. Discard this draft?</p><button className="outline" onClick={()=>setStage(null)}>Keep editing</button><button className="primary" onClick={()=>{useStore.getState().discardHistoryEdit();leave()}}>Discard changes</button></>}</Modal>}
 </section>
}
