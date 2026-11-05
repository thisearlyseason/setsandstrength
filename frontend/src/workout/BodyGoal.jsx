import { useState } from 'react'
import { weightGoal } from './home-insights.js'
export default function BodyGoal({ S, onSave }) {
 const goal=weightGoal(S), [editing,setEditing]=useState(false), [draft,setDraft]=useState('')
 return <section className="history-panel weight-visual"><div className="section-head"><h2>Weight and your goal</h2><button className="outline compact" onClick={()=>{setDraft(goal.target == null ? '' : String(goal.target));setEditing(!editing)}}>{editing?'Cancel':'Edit weight goal'}</button></div>
 <div className="weight-numbers"><div><span>Latest weight</span><strong>{goal.latest ?? '—'} <small>{S.unit}</small></strong><small>{goal.date || 'No weight logged.'}</small></div><div><span>Your target</span><strong>{goal.target ?? '—'} <small>{S.unit}</small></strong><small>{goal.target == null ? 'No target set.' : 'Your personal goal'}</small></div></div>
 {goal.delta != null && <p>{Math.abs(goal.delta)} {S.unit} {goal.delta > 0 ? 'above target' : goal.delta < 0 ? 'below target' : 'from target'}.</p>}
 {goal.previousChange != null && <p className="muted-copy">Change since previous entry: {goal.previousChange > 0 ? '+' : ''}{goal.previousChange} {S.unit}.</p>}
 {editing && <form onSubmit={e=>{e.preventDefault();if(onSave(draft)!==false)setEditing(false)}}><label>Target weight ({S.unit})<input type="number" min="0.1" step="0.1" value={draft} onChange={e=>setDraft(e.target.value)} /></label><p className="muted-copy">Leave blank to remove the goal.</p><button className="lime" type="submit">Save weight goal</button></form>}
 </section>
}
