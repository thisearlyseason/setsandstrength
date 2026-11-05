import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { allExercises, isAssisted } from '../lib/exercises.js'
import { speedUnitOf, toSpeed, speedLabel } from '../lib/speed.js'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { exerciseProgress, exercisePeriodComparison, isWork, completedAnalysisRows } from './analysis.js'
import HistoryChart from './HistoryChart.jsx'
import RatingRadar from './RatingRadar.jsx'

const format = (value, unit) => value == null ? 'Not logged' : `${Math.round(value * 100) / 100} ${unit}`
export default function ExerciseProgress() {
  const S = useStore((s) => s.S), nav = useNavigate()
  const EXIDX = useMemo(()=>Object.fromEntries(allExercises(S).slice().reverse().map(e=>[e.id,e])),[S.customEx])
  const performed = useMemo(() => [...new Set(S.workouts.flatMap((w) => (w.entries || []).filter((e) => (e.sets || []).some(isWork)).map((e) => String(e.id))))].map((id) => ({ id, ex: EXIDX[id] })).filter((x) => x.ex), [S.workouts, EXIDX])
  const [selected, setSelected] = useState(performed[0]?.id || ''), [filter, setFilter] = useState('all')
  const rows = performed.filter(({ ex }) => filter === 'all' || ex.cat === filter || ex.bp === filter || ex.tg === filter)
  const id = rows.some((x) => x.id === selected) ? selected : rows[0]?.id || ''
  const options = { assisted: isAssisted(EXIDX[id]), speedUnit: speedUnitOf(S), unit:S.unit }
  const progress = id ? exerciseProgress(S.workouts, id, options) : null
  const comparison = id ? exercisePeriodComparison(S.workouts, id, todayISO(), options) : null
  const cats = [...new Set(performed.flatMap(({ ex }) => [ex.cat, ex.bp, ex.tg]).filter(Boolean))].sort()
  return <>
    <div className="page-title"><div><p className="eyebrow">FROM YOUR COMPLETED WORKING SETS</p><h1>Exercise progress</h1><p>Recorded values, period comparisons and source sessions.</p></div></div>
    <section className="history-panel">
      <div className="builder-fields"><label>Filter by category or muscle<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All performed exercises</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select></label><label>Exercise<select value={id} onChange={(e) => setSelected(e.target.value)}>{rows.map(({ id: exId, ex }) => <option value={exId} key={exId}>{ex.n}</option>)}</select></label></div>
      <button className="outline" onClick={() => nav('/merge-exercises')}>Merge duplicate exercise IDs</button>
      {!progress ? <p>Complete and save a workout to see progress.</p> : <>
        <p>{progress.sessions} sessions · most recent: {progress.recentDate}. Warmups are excluded.</p>
        <div className="analysis-metrics">{progress.metrics.map(m=><section className="metric" key={m.key}><span>{m.label}</span><strong>{format(m.recent,m.unit)}</strong><small>Recent session · record: {format(m.best,m.unit)}</small></section>)}</div>
        <p>{progress.assisted ? 'Recorded load is assistance. Lower means less assistance; assistance × reps is not effective lifted volume.' : 'For unweighted bodyweight sets, only logged reps and duration are shown; body mass is not inferred.'}</p>
        <p>{progress.estimated1RM == null ? 'Estimated 1RM unavailable.' : `Estimated 1RM: ${progress.estimated1RM} ${S.unit} using Epley on the best eligible set (1–30 reps). This is a formula estimate, not a measured lift.`}</p>
        <h3>Recent 30 days vs preceding 30 days</h3><p>Current: {comparison.currentRange} ({comparison.current.sessions} sessions). Previous: {comparison.previousRange} ({comparison.previous.sessions} sessions).</p>
        <div className="analysis-scroll"><table className="analysis-table"><caption>Recorded best values within each period</caption><thead><tr><th>Metric</th><th>Recent 30 days</th><th>Previous 30 days</th></tr></thead><tbody>{progress.metrics.map(m=><tr key={m.key}><th scope="row">{m.label}</th><td>{format(comparison.current.metrics.find(x=>x.key===m.key)?.best,m.unit)}</td><td>{format(comparison.previous.metrics.find(x=>x.key===m.key)?.best,m.unit)}</td></tr>)}</tbody></table></div>
        {progress.bestLoad != null && <p>Recorded {progress.assisted ? 'assistance' : 'load'} × reps: {comparison.current.volume.toLocaleString()} vs {comparison.previous.volume.toLocaleString()} {S.unit}·reps. {comparison.volumeChangePct == null ? 'No nonzero prior baseline.' : `${comparison.volumeChangePct}% change.`}</p>}
        <RatingRadar report={progress}/><p>{progress.progression}</p>
        {progress.metrics.map(m=><HistoryChart key={m.key} title={`${m.label} per session${m.least ? ' (least)' : ' (maximum)'}`} unit={m.unit} rows={m.history}/>)}
        <h2>Session history</h2>{progress.history.slice().reverse().map((h, i) => <details key={`${h.workoutId}-${i}`} className="log-session"><summary>{h.date} · {h.sets.length} working sets</summary><p>{h.sets.flatMap(completedAnalysisRows).map((s,j) => <span key={j}>{j ? ' · ' : ''}Set {j+1}{s.side ? ` (${s.side})` : ""}: {s.w > 0 ? `${s.w} ${S.unit}${progress.assisted ? ' assistance' : ''}` : ''}{s.r > 0 ? ` ${s.r} reps` : ''}{s.sec > 0 ? ` ${s.sec} sec` : ''}{s.min > 0 ? ` ${s.min} min` : ''}{s.speed > 0 ? ` ${format(toSpeed(s.speed,speedUnitOf(S)),speedLabel(speedUnitOf(S)))}` : ''}{s.distance || s.dist ? ` ${s.distance ?? s.dist} ${s.distanceUnit || s.distUnit || '(distance unit not recorded)'}` : ''}</span>)}</p><button className="text-link" onClick={() => nav(`/progress#workout-${encodeURIComponent(h.workoutId)}`)}>Open source session <ArrowRight size={16} /></button></details>)}
      </>}
    </section>
    <section className="history-panel"><h2>Records across all performed exercises</h2>{performed.map(({id:recordId,ex})=>{const p=exerciseProgress(S.workouts,recordId,{assisted:isAssisted(ex),speedUnit:speedUnitOf(S),unit:S.unit});return <details key={recordId}><summary>{ex.n} · {p.sessions} sessions</summary><ul>{p.metrics.map(m=><li key={m.key}>{m.label}: {format(m.best,m.unit)}</li>)}</ul></details>})}</section>
  </>
}
