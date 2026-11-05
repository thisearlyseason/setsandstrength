import { useState } from 'react'
import { isSideSet,modeForSet,syncSideAggregate } from '../lib/workout-model.js'
import { speedUnitOf,speedLabel,toSpeed,fromSpeed } from '../lib/speed.js'
import { isWarmup } from './analysis.js'
import { setWarmupFlag } from './training.js'

// Pure row editor: scalar mirrors are derived from the limbs, never edited directly.
export default function AdvancedSetRow({entry,row,entryIndex,setIndex,S,onChange}) {
 const [invalid,setInvalid]=useState({}),speedUnit=speedUnitOf(S),number=setIndex+1
 function change(source,side){
  if(!side){onChange(source);return}
  const sides={...row.sides,[side]:source}
  // The core mirrors supported fields; retain the source limb objects so imported
  // metadata, feel ratings and duration aliases survive normalization.
  onChange({...syncSideAggregate({...row,sides}),sides})
 }
 function fields(side){
  const source=side ? row.sides[side] : row,prefix=side ? `${side==='L' ? 'Left' : 'Right'} set ${number}` : `Set ${number}`
  const mode=modeForSet(source,entry?.target || row)
  const patch=(field,value)=>{const next={...source,[field]:value};if(field==='rir')delete next.rpe;change(next,side)}
  const numeric=(field,name,unit,value=source[field],convert=v=>v)=>{
   const label=`${prefix} ${name}${unit ? ` (${unit})` : ''}`
   return <label key={field}>{name}{unit ? ` (${unit})` : ''}<input aria-label={label} aria-invalid={Object.hasOwn(invalid,label) || undefined} type="number" min="0" step="any" value={Object.hasOwn(invalid,label) ? invalid[label] : value ?? ''} onChange={e=>{
    const raw=e.target.value,next=raw==='' ? null : convert(Number(raw))
    if(e.target.validity.badInput || (next!=null && (!Number.isFinite(next) || next<0))){setInvalid(current=>({...current,[label]:raw}));return}
    setInvalid(current=>{const updated={...current};delete updated[label];return updated})
    patch(field,next)
   }}/></label>
  }
  const durationField=['sec','seconds','durationSec'].find(key=>Object.hasOwn(source,key)) || 'sec'
  return <fieldset key={side || 'row'}><legend>{prefix}</legend><div className="reading-grid">
   {mode==='cardio' ? <>{numeric('min','duration','minutes')}{numeric('speed','speed',speedLabel(speedUnit),toSpeed(source.speed,speedUnit),v=>fromSpeed(v,speedUnit))}{['distance','dist'].filter(key=>Object.hasOwn(source,key) && (source.distanceUnit || source.distUnit)).map(key=>numeric(key,'distance',source.distanceUnit || source.distUnit))}</> : mode==='time' ? <>{numeric(durationField,'duration','seconds')}{Object.hasOwn(source,'w') && numeric('w','weight',S.unit)}</> : <>{numeric('w','weight',S.unit)}{numeric('r','reps')}</>}
   </div><label><input type="checkbox" aria-label={`${prefix} complete`} checked={!!source.done} onChange={e=>patch('done',e.target.checked)}/> Complete{side ? ` ${side==='L' ? 'left' : 'right'} side` : ''}</label>
   <details><summary>Optional set details</summary>{side && <label><input type="checkbox" aria-label={`${prefix} warmup`} checked={isWarmup(source)} onChange={e=>change(setWarmupFlag(source,e.target.checked),side)}/> Side warmup</label>}
    <label>Reps in reserve<select aria-label={`${prefix} reps in reserve`} value={source.rir ?? (source.rpe!=null ? 10-source.rpe : '')} onChange={e=>patch('rir',e.target.value==='' ? null : Number(e.target.value))}><option value="">Not rated</option>{Array.from({length:11},(_,value)=><option key={value} value={value}>{value}</option>)}</select></label>
    <label>Perceived feel<select aria-label={`${prefix} perceived feel`} value={source.feel ?? ''} onChange={e=>patch('feel',e.target.value==='' ? null : Number(e.target.value))}><option value="">Not rated</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value} / 5</option>)}</select></label>
   </details></fieldset>
 }
 return <section aria-label={`Exercise ${entryIndex+1} set ${number} recorded fields`}>
  {isSideSet(row) ? ['L','R'].map(fields) : fields(null)}
  <details><summary>Optional warmup flag</summary><label><input type="checkbox" aria-label={`Set ${number} warmup`} checked={isWarmup(row)} onChange={e=>onChange(setWarmupFlag(row,e.target.checked))}/> Warmup (excluded from working sets)</label></details>
  {Object.keys(invalid).length>0 && <p role="alert">Use finite numbers greater than or equal to zero. The last valid logged values remain unchanged.</p>}
 </section>
}
