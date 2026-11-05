import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Check, ShieldAlert } from 'lucide-react'
import { allExercises } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { applyExerciseMerge, previewExerciseMerge } from './exercise-merge.js'

const update = (fn) => useStore.getState().update(fn)
export default function DuplicateExerciseMerge() {
  const S = useStore((s) => s.S)
  const options = useMemo(() => allExercises(S).filter((e) => !Object.hasOwn(S.exerciseIdAliases || {}, String(e.id))).sort((a, b) => a.n.localeCompare(b.n)), [S.customEx, S.exerciseIdAliases])
  const [source, setSource] = useState(''), [canonical, setCanonical] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('')
  const preview = source && canonical && source !== canonical ? previewExerciseMerge(S, source, canonical) : null
  const merge = () => {
    if (!preview || !window.confirm(`Merge ${options.find((x) => x.id === source)?.n} into ${options.find((x) => x.id === canonical)?.n}? This will update ${preview.sessionReferences} workout sessions, ${preview.templateReferences} plan entries, and ${preview.affectedSets} recorded sets in your account. The shared exercise catalog will not change.`)) return
    setMessage(''); setError('')
    try { update((s) => applyExerciseMerge(s, source, canonical)) }
    catch (e) { setError(e.message || 'The exercises could not be merged. Review your selections and try again.'); return }
    setMessage('Exercise history and plans merged. The old ID remains as an account-level alias for offline clients.')
    setSource(''); setCanonical('')
  }
  const select = (label, value, setter) => <label>{label}<select value={value} onChange={(e) => setter(e.target.value)}><option value="">Choose an exercise</option>{options.map((e) => <option value={e.id} key={e.id}>{e.n} · {e.id}</option>)}</select></label>
  return <><div className="page-title"><div><p className="eyebrow">ACCOUNT ONLY</p><h1>Merge duplicate exercises</h1><p>Preview changes to your own training history and plans. The shared catalog is not modified.</p></div></div>
    <section className="history-panel"><div className="builder-fields">{select('Duplicate exercise', source, setSource)}{select('Keep this exercise', canonical, setCanonical)}</div>
      {preview && <div className="merge-preview" aria-live="polite"><h2>Merge preview</h2><p>{preview.sessionReferences} workout sessions · {preview.affectedSets} sets · {preview.templateReferences} plan entries · {preview.records} existing PR records</p>{preview.sessions.length ? <ul>{preview.sessions.map((w) => <li key={w.id}>{w.name} · {w.date || 'Undated'} · <Link to={`/progress#workout-${encodeURIComponent(w.id)}`}>Open session</Link></li>)}</ul> : <p>No workout history uses these IDs.</p>}{preview.templates.length > 0 && <ul>{preview.templates.map((r, i) => <li key={`${r.id}-${i}`}>{r.name || 'Workout plan'}</li>)}</ul>}<p className="muted-copy">If both IDs occur in a session, their set rows are combined once and kept under the selected exercise. The source ID is retained in your account’s exercise ID alias map.</p><button className="lime" onClick={merge}><ArrowLeftRight size={16} /> Review and merge</button></div>}
      {error && <p role="alert" className="builder-adjust">{error}</p>}{message && <p role="status" className="builder-adjust"><Check size={16} /> {message}</p>}<p className="muted-copy"><ShieldAlert size={15} /> Merging cannot be undone from this screen. Confirm only after reviewing the affected references.</p>
    </section></>
}
