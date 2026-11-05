import { useId } from 'react'
import { ringProgress } from './visual-data.js'
export default function GoalRing({value,target,label,unit='',tone='lime',caption}) {
 const id=useId(); value=Number.isFinite(value) ? value : null
 const ratio=ringProgress(value,target)
 return <div className={`goal-ring tone-${tone}`}><div className="goal-ring-art"><svg viewBox="0 0 160 160" role="img" aria-labelledby={id}><title id={id}>{`${label}: ${value ?? 'Not logged'} ${unit}${target>0 ? ` of ${target}` : ''}`}</title><circle className="ring-track" cx="80" cy="80" r="66"/><circle className="ring-value" cx="80" cy="80" r="66" pathLength="100" strokeDasharray={`${(ratio || 0)*100} 100`} transform="rotate(-90 80 80)"/></svg><div><strong>{value ?? '—'}</strong><span>{target>0 ? `/ ${target} ${unit}` : unit || 'No target'}</span></div></div><h3>{label}</h3>{caption && <p>{caption}</p>}</div>
}
