import GoalRing from './GoalRing.jsx'
import { weightGoal, writeWeightGoal } from './home-insights.js'
import { useState } from 'react'
import { Target, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore.js'
import { trainedMs } from './training.js'
import { EXIDX } from '../lib/exercises.js'
import { todayISO } from '../lib/format.js'
const choices = [
  ['strength', 'Build strength', 'Track your lifting targets.'],
  ['muscle', 'Build muscle', 'Practice consistent strength sessions.'],
  ['weight', 'Manage weight', 'Follow your own weight trend.'],
  ['endurance', 'Build endurance', 'Work toward longer timed efforts.'],
  ['fitness', 'Overall fitness', 'Make regular movement part of your week.'],
  ['mobility', 'Move more freely', 'Build a consistent mobility practice.'],
]
export default function TrainingGoals({ S, requireUser }) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(null),
    [saved, setSaved] = useState(false)
  const stored = S.trainingGoals
  const factor =
    stored?.unit && stored.unit !== S.unit
      ? S.unit === 'lb'
        ? 1 / 0.45359237
        : 0.45359237
      : 1
  const goals = stored
      ? {
          ...stored,
          weight: weightGoal(S).target ?? undefined,
          strength: stored.strength
            ? Math.round(stored.strength * factor * 10) / 10
            : undefined,
        }
      : { focus: 'fitness', minutes: 90 },
    form = draft || goals
  const week = new Date()
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7))
  const start = [
    week.getFullYear(),
    String(week.getMonth() + 1).padStart(2, '0'),
    String(week.getDate()).padStart(2, '0'),
  ].join('-')
  const minutes = Math.round(
    S.workouts
      .filter((w) => w.d >= start && w.d <= todayISO())
      .reduce((n, w) => n + trainedMs(w) / 60000, 0),
  )
  const fields = [
    ['minutes', 'Weekly activity minutes', 5],
    ['sessions', 'Weekly workout goal', 1],
    ['weight', 'Target body weight (' + S.unit + ')', 0.1],
    ['strength', 'Target lift (' + S.unit + ')', 0.5],
    ['endurance', 'Target timed set (seconds)', 5],
  ]
  const ids = [...new Set(S.routines.flatMap((r) => r.ex.map((e) => e.id)))]
  const set = (k, v) => {
    setDraft({ ...form, [k]: v })
    setSaved(false)
  }
  return (
    <section className="goals-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h2>
            <Target size={20} /> Your training goals
          </h2>
        </div>
        <button
          className="outline compact"
          onClick={() => {
            setEditing(!editing)
            setDraft(null)
          }}
        >
          {editing ? 'Close' : 'Set goals'}
        </button>
      </div>
      <div className="training-goal-visual"><GoalRing value={minutes} target={Number(goals.minutes)||90} label="Weekly activity" unit="min" tone="cyan"/><div><p className="eyebrow">YOUR FOCUS</p><h3>{choices.find(c=>c[0]===goals.focus)?.[1] || 'Overall fitness'}</h3><p>{Math.max(0,(Number(goals.minutes)||90)-minutes)} minutes to your weekly target</p></div></div>
      {goals.weight && (
        <p className="muted-copy">
          Weight target: {goals.weight} {S.unit} · latest{' '}
          {S.bodyweight.at(-1)?.w || '-'} {S.unit}
        </p>
      )}
      {goals.strength && (
        <p className="muted-copy">
          Strength target: {goals.strength} {S.unit} ·{' '}
          {EXIDX[goals.exercise]?.n || 'Choose an exercise'} · best{' '}
          {S.exWeights[goals.exercise]?.w || '-'} {S.unit}
        </p>
      )}
      {goals.endurance && (
        <p className="muted-copy">
          Timed-set target: {goals.endurance} sec ·{' '}
          {EXIDX[goals.exercise]?.n || 'Choose an exercise'} · best{' '}
          {Math.max(
            0,
            ...S.workouts.flatMap((w) =>
              w.entries
                .filter((e) => e.id === goals.exercise)
                .flatMap((e) =>
                  e.sets.filter((s) => s.done).map((s) => s.sec || 0),
                ),
            ),
          )}{' '}
          sec
        </p>
      )}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!requireUser()) return
            useStore.getState().update((s) => {
              s.trainingGoals = { ...form, ...(form.focus !== 'weight' && stored?.weight ? { weight: stored.weight * factor } : {}), sessions: Math.max(1, Math.min(14, Number(form.sessions) || 3)), unit: S.unit }
              if (form.focus === 'weight') writeWeightGoal(s, form.weight ?? '')
            })
            setSaved(true)
            setEditing(false)
            setDraft(null)
          }}
        >
          <div className="goal-options">
            {choices.map(([id, label, desc]) => (
              <label key={id} className={form.focus === id ? 'chosen' : ''}>
                <input
                  type="radio"
                  name="training-focus"
                  value={id}
                  checked={form.focus === id}
                  onChange={() => set('focus', id)}
                />
                <span>
                  <strong>{label}</strong>
                  <small>{desc}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="reading-grid">
            {fields
              .filter(([k]) => k === 'minutes' || k === 'sessions' || k === form.focus)
              .map(([key, label, step]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min={step}
                    step={step}
                    required={key === 'minutes'}
                    value={form[key] || ''}
                    onChange={(e) => set(key, +e.target.value || undefined)}
                  />
                </label>
              ))}
          </div>
          {['strength', 'endurance'].includes(form.focus) && (
            <label>
              Target exercise
              <select
                aria-label="Target exercise"
                required
                value={form.exercise || ''}
                onChange={(e) => set('exercise', e.target.value)}
              >
                <option value="">Choose an exercise</option>
                {ids.map((id) => (
                  <option key={id} value={id}>
                    {EXIDX[id]?.n || id}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="lime">Save goals</button>
        </form>
      )}
      {saved && (
        <p role="status">
          <CheckCircle2 size={16} />
          Goals saved
        </p>
      )}
    </section>
  )
}
