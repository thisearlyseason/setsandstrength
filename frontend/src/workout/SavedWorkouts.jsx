import { useState } from 'react'
import { ArrowRight, Plus, Pencil, Trash2, Play, Dumbbell } from 'lucide-react'
import { myWorkouts } from './my-workouts.js'
export default function SavedWorkouts({ routines, onOpen, onBuild, onAdd, onEdit, onDelete, onStart, Modal }) {
 const saved = myWorkouts(routines), [removing, setRemoving] = useState(null)
 return <section className="saved-plans my-workouts" aria-labelledby="saved-workouts-title">
  <div className="section-head"><div><p className="eyebrow">YOUR PERSONAL COLLECTION</p><h2 id="saved-workouts-title">My Workouts</h2></div><span className="tag pale">{saved.length} saved</span></div>
  <p className="muted-copy">Made by you or generated for you. Ready to train again.</p>
  <div className="creation-strip"><button className="lime" onClick={onAdd}><Plus size={16}/> Add workout</button><button className="outline" onClick={onBuild}>Generate a workout <ArrowRight size={16}/></button></div>
  {!saved.length && <div className="my-workouts-empty"><Dumbbell size={32}/><h3>Your favorites belong here</h3><p>Create your first workout, or generate one and choose to save it.</p></div>}
  <div className="my-workout-grid">{saved.map(r => <article className="my-workout-card" key={r.id}>
   <button className="my-workout-cover" aria-label={`Open saved workout ${r.name}`} onClick={() => onOpen(r)}><Dumbbell size={28}/><span>{r.builderConstraints?'GENERATED':'CUSTOM'}</span><h3>{r.name}</h3><small>{r.ex.length} movements · Reusable</small></button>
   <div className="my-workout-actions"><button className="lime" onClick={() => onStart(r)} aria-label={`Start ${r.name}`}><Play size={15}/> Start</button><button className="outline" onClick={() => onEdit(r)} aria-label={`Edit ${r.name}`}><Pencil size={15}/> Edit</button><button className="outline" onClick={() => setRemoving(r)} aria-label={`Delete ${r.name}`}><Trash2 size={16}/></button></div>
  </article>)}</div>
  {removing && Modal && <Modal title="Delete saved workout?" onClose={() => setRemoving(null)}><div className="modal-body"><p>Delete “{removing.name}” from My Workouts and its scheduled dates? Completed history and any workout in progress will stay.</p><div className="builder-actions"><button className="outline" onClick={() => setRemoving(null)}>Keep workout</button><button className="lime" onClick={() => {onDelete(removing);setRemoving(null)}}>Delete workout</button></div></div></Modal>}
 </section>
}
