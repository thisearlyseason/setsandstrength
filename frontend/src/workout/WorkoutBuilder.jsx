import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Clock3, RefreshCw, Save, Sparkles } from 'lucide-react'
import { EXDB, EXIDX, imgSrc, figureOf } from '../lib/exercises.js'
import instructions from '../instr/en.js'
import { useStore } from '../store/useStore.js'
import { builderRankingContext, buildWorkout, buildWeeklyPlan, parseWorkoutRequest, validateWorkout, swapWorkoutExercise, weeklyFrequencyReport, weeklyFrequencyShortages, catalogForProfile } from './builder.js'
import { startSession } from './training.js'
import { todayISO } from '../lib/format.js'

const baseCatalog = EXDB.map((e) => ({ ...e, inst: instructions[e.id] || [] }))
const title = (s = '') => s.replace(/\b\w/g, (c) => c.toUpperCase())
const update = (fn) => useStore.getState().update(fn)

export default function WorkoutBuilder({ requireUser, notice }) {
  const S = useStore((s) => s.S), nav = useNavigate()
  const catalog = useMemo(() => catalogForProfile(baseCatalog, S.exerciseIdAliases), [S.exerciseIdAliases])
  const [request, setRequest] = useState('35 minutes, upper body, dumbbells only, no bench')
  const [constraints, setConstraints] = useState(() => parseWorkoutRequest(request))
  const [plan, setPlan] = useState(null)
  const [week, setWeek] = useState(null)
  const saved = useRef(false)
  const [commitPending, setCommitPending] = useState(false)
  const [keepWorkout, setKeepWorkout] = useState(false)
  const redirect = useRef(null)
  useEffect(() => () => clearTimeout(redirect.current), [])
  const committed = (path) => {
    // Keep the disabled original controls under a rapid second tap instead of exposing
    // an unrelated program/start button at the same coordinates on the next screen.
    setCommitPending(true)
    redirect.current = setTimeout(() => nav(path), 350)
  }
  const editConstraints = (next) => { setConstraints(next); setPlan(null); setWeek(null); saved.current = false }
  const rankingContext = useMemo(() => builderRankingContext(S, catalog, todayISO()), [S.workouts, S.favEx, S.exerciseIdAliases, catalog])
  const recentIds = rankingContext.recentIds
  const generate = () => {
    const parsed = { ...constraints, minutes: Math.max(10, Math.min(180, Number(constraints.minutes) || 45)) }
    setConstraints(parsed)
    saved.current = false
    setWeek(null)
    setPlan(buildWorkout(catalog, parsed, { recentIds, rankingContext }))
  }
  const generateWeek = () => { saved.current = false; const parsed = { ...constraints, minutes: Math.max(10, Math.min(180, Number(constraints.minutes) || 45)) }; setConstraints(parsed); setPlan(null); setWeek(buildWeeklyPlan(catalog, parsed, { recentIds, rankingContext })) }
  const swap = (id, dayNumber = null) => {
    const current = dayNumber == null ? plan : week.find((day) => day.day === dayNumber)
    if (!current) return
    try {
      const next = swapWorkoutExercise(current, id, catalog, { ...constraints, focus: current.focus || constraints.focus }, { rankingContext })
      if (dayNumber == null) setPlan(next)
      else setWeek(week.map((day) => day.day === dayNumber ? next : day))
    } catch (error) { notice(error.message) }
  }
  const frequency = week ? weeklyFrequencyReport(week, catalog, constraints.muscleFrequencyTarget) : null
  const routine = (workout = plan, focus = constraints.focus) => {
    validateWorkout(workout?.exercises, catalog, { ...constraints, focus })
    const record = { id: crypto.randomUUID(), builderConstraints: structuredClone({ ...constraints, focus }), builderPrescription: structuredClone(workout.exercises), name: `${workout.day == null ? "" : `Day ${workout.day} · `}${title(focus)} · ${constraints.minutes} min`, ex: workout.exercises.map((e) => ({ id: e.id, sets: e.sets, mode: e.durationSec ? "time" : "reps", reps: e.durationSec ? undefined : e.reps || 8, sec: e.durationSec || undefined, rest: e.restSec, prog: e.prog, repsMin: e.repsMin })) }
    return record
  }
  const save = (date) => {
    if (saved.current || !requireUser()) return
    let r
    try { r = routine() } catch (error) { notice(error.message); return }
    saved.current = true
    update((s) => { s.routines.push({...r,inMyWorkouts:!date || keepWorkout}); if (date) s.dayPlan[date] = [...(s.dayPlan[date] || []), r.id] })
    notice(date ? 'Workout saved to your schedule.' : 'Workout added to My Workouts.')
    committed(date ? '/plans?view=schedule' : '/plans?view=workouts')
  }
  const start = () => {
    if (S.active?.editingWorkoutId) { notice('Save or cancel your history edits before starting another workout.'); return }
    if (saved.current || !requireUser()) return
    let r
    try { r = routine() } catch (error) { notice(error.message); return }
    saved.current = true
    update((s) => { if(keepWorkout)s.routines.push({...r,inMyWorkouts:true}); startSession(s, r) })
    committed('/workout')
  }
  const saveWeek = (schedule) => {
    if (saved.current || !requireUser()) return
    let records
    try { const planGroupId = crypto.randomUUID(); records = week.map((day) => ({ ...routine(day, day.focus), planGroupId })) } catch (error) { notice(error.message); return }
    saved.current = true
    update((s) => { s.routines.push(...records.map(r=>({...r,inMyWorkouts:!schedule || keepWorkout}))); if (schedule) { const start = new Date(`${todayISO()}T12:00:00`); records.forEach((r, i) => { const d = new Date(start); d.setDate(d.getDate() + Math.round(i * 7 / records.length)); const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; s.dayPlan[date] = [...(s.dayPlan[date] || []), r.id] }) } })
    notice(schedule ? 'Weekly plan saved to your schedule.' : 'Weekly plan saved to your plans.')
    committed(schedule ? '/plans?view=schedule' : '/plans?view=workouts')
  }
  return <>
    <div className="page-title"><div><p className="eyebrow">BUILT AROUND YOUR EQUIPMENT</p><h1>Workout builder</h1><p>Choose your focus, equipment and time.</p></div></div>
    <section className="history-panel builder-panel" aria-busy={commitPending}>
      <label className="builder-prompt">Describe your workout
        <textarea rows="3" value={request} onChange={(e) => { setRequest(e.target.value); editConstraints(parseWorkoutRequest(e.target.value)) }} placeholder="35 minutes, upper body, dumbbells only, no bench" />
      </label>
      <div className="builder-fields">
        <label>Time (minutes)<input type="number" min="10" max="180" value={constraints.minutes} onChange={(e) => editConstraints({ ...constraints, minutes: Number(e.target.value) })} /></label>
        <label>Focus<select value={constraints.focus} onChange={(e) => editConstraints({ ...constraints, focus: e.target.value })}><option value="full">Full body</option><option value="upper">Upper body</option><option value="lower">Lower body</option><option value="chest">Chest</option><option value="back">Back</option><option value="shoulders">Shoulders</option><option value="abs">Abs</option><option value="arms">Arms</option><option value="push">Push · chest, shoulders, triceps</option><option value="pull">Pull · back, biceps</option></select></label>
        <label>Goal<select value={constraints.goal} onChange={(e) => editConstraints({ ...constraints, goal: e.target.value })}>{['general fitness', 'strength', 'hypertrophy', 'endurance'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Experience<select value={constraints.experience} onChange={(e) => editConstraints({ ...constraints, experience: e.target.value })}>{['unspecified', 'beginner', 'intermediate', 'advanced'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Training days per week<input type="number" min="1" max="7" value={constraints.trainingDays} onChange={(e) => editConstraints({ ...constraints, trainingDays: Math.max(1, Math.min(7, Number(e.target.value) || 1)) })} /></label>
        <label>Split<select value={constraints.split} onChange={(e) => editConstraints({ ...constraints, split: e.target.value })}><option value="full-body">Full body</option><option value="upper-lower">Upper / lower</option><option value="ppl">Push / pull / legs</option></select></label>
        <label>Equipment allowed<input value={constraints.equipment.join(', ')} onChange={(e) => editConstraints({ ...constraints, equipment: e.target.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })} placeholder="dumbbell, band; body weight for no equipment" /></label>
        <label>Exclude equipment<input value={constraints.excludedEquipment.join(', ')} onChange={(e) => editConstraints({ ...constraints, excludedEquipment: e.target.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })} placeholder="bench, cable" /></label>
        <label>Avoid movements<input value={(constraints.excludedMovements || []).join(', ')} onChange={(e) => editConstraints({ ...constraints, excludedMovements: e.target.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })} placeholder="overhead press, jumping" /></label>
        <label>Muscle frequency target (days/week)<input type="number" min="1" max="7" value={constraints.muscleFrequencyTarget} onChange={(e) => editConstraints({ ...constraints, muscleFrequencyTarget: Math.max(1, Math.min(7, Number(e.target.value) || 1)) })} /></label>
      </div>
      <div className="builder-actions"><button className="lime" disabled={commitPending} onClick={generate}><Sparkles size={17} /> Build workout</button><button className="outline" disabled={commitPending} onClick={generateWeek}><Sparkles size={17} /> Build weekly plan</button></div>
      <details className="inline-help"><summary>How workouts are built</summary><p className="muted-copy"><strong>Guided builder · works offline.</strong> It uses the local exercise catalog and timing estimates including 3 minutes to warm up, working sets, between-set rest and 1 minute per movement for setup/transitions. Blank equipment means any equipment; enter body weight for no equipment. Favorites and recent logged muscle workload (last 3 and 7 local days) influence the order after constraints. This builder uses deterministic local rules.</p></details>
    </section>
    {plan && <section className="history-panel">
      <div className="section-head"><div><p className="eyebrow">PREVIEW</p><h2>{title(constraints.focus)} session</h2></div><span className="tag pale"><Clock3 size={14} /> about {plan.estimatedMinutes} min</span></div>
      {plan.needsAdjustment && <p role="status" className="builder-adjust">{plan.adjustmentReason || 'Limited eligible movements fit this time budget. Add time/equipment or broaden the focus.'}</p>}
      <ol className="builder-list">{plan.exercises.map((e) => <li key={e.id}><img src={imgSrc(EXIDX[e.id], figureOf(S))} alt="" /><div><strong>{title(EXIDX[e.id]?.n)}</strong><small>{e.sets} sets × {e.reps || `${e.durationSec} sec`} · {e.restSec}s rest · ~{e.estimatedMinutes} min</small><details><summary>Instructions</summary><p>{(instructions[e.id] || []).join(' ') || 'No instructions are available for this movement.'}</p></details></div><button className="outline compact" onClick={() => swap(e.id)} aria-label={`Swap ${title(EXIDX[e.id]?.n)}`}><RefreshCw size={15} /> Swap</button></li>)}</ol>
      {plan.rejected.length > 0 && <details><summary>{plan.rejected.length} exercises excluded by your constraints</summary><ul>{plan.rejected.slice(0, 12).map((x) => <li key={x.id}>{title(EXIDX[x.id]?.n)}: {x.reason}</li>)}</ul></details>}
      <label className="save-workout-choice"><input type="checkbox" checked={keepWorkout} onChange={e=>setKeepWorkout(e.target.checked)}/> Also add to My Workouts when starting or scheduling</label><div className="builder-actions"><button className="outline" disabled={commitPending || !plan.exercises.length} onClick={() => save(null)}><Save size={16} /> Add to My Workouts</button><button className="outline" disabled={commitPending || !plan.exercises.length} onClick={() => save(todayISO())}><Check size={16} /> Schedule today</button><button className="lime" disabled={commitPending || !plan.exercises.length} onClick={start}>Start workout <ArrowRight size={16} /></button></div>
    </section>}
    {week && <section className="history-panel"><div className="section-head"><div><p className="eyebrow">WEEKLY PLAN PREVIEW</p><h2>{week.length} training days · {title(constraints.split)}</h2></div></div><p className="muted-copy">Each day is checked against your equipment and movement restrictions. Repeated exercises are avoided where eligible options allow.</p>{week.map((day) => <details className="weekly-day" key={day.day} open><summary>Day {day.day} · {title(day.focus)} · about {day.estimatedMinutes} min · {day.exercises.length} movements</summary>{day.needsAdjustment && <p role="status" className="builder-adjust">{day.adjustmentReason || 'Limited eligible movements fit this day. Add time/equipment or broaden the focus.'}</p>}<ul>{day.exercises.map((e) => <li key={e.id}>{title(EXIDX[e.id]?.n)} · {e.sets} sets × {e.reps || `${e.durationSec} sec`} · {e.restSec}s rest <button className="outline compact" onClick={() => swap(e.id, day.day)} aria-label={`Swap ${title(EXIDX[e.id]?.n)} on day ${day.day}`}>Swap</button></li>)}</ul></details>)}{weeklyFrequencyShortages(week, catalog, constraints.muscleFrequencyTarget).length > 0 && <div role="status" className="builder-adjust"><strong>Weekly coverage needs adjustment</strong><ul>{weeklyFrequencyShortages(week, catalog, constraints.muscleFrequencyTarget).map((message) => <li key={message}>{message}</li>)}</ul></div>}<details><summary>Check weekly muscle-frequency target</summary><p>Primary and secondary catalog muscles receive one day of credit after three planned working sets. A target is a planning preference; adjust the split or days where coverage is short.</p><ul>{Object.entries(frequency).map(([muscle, value]) => <li key={muscle}>{muscle}: {value.days} / {value.target} days{value.days < value.target ? " · below target" : " · target met"}</li>)}</ul></details><div className="builder-actions"><button className="outline" disabled={commitPending || week.some((day) => !day.exercises.length)} onClick={() => saveWeek(false)}><Save size={16} /> Save weekly plan</button><label className="save-workout-choice"><input type="checkbox" checked={keepWorkout} onChange={e=>setKeepWorkout(e.target.checked)}/> Add scheduled workouts to My Workouts</label><button className="lime" disabled={commitPending || week.some((day) => !day.exercises.length)} onClick={() => saveWeek(true)}><Check size={16} /> Schedule this week</button></div></section>}
  </>
}
