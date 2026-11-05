import { isWarmup as loggedWarmup } from './analysis.js'
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Download,
  Search,
  ChevronDown,
  Dumbbell,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EXIDX } from '../lib/exercises.js'
import { hasCompletedWork, isSideSet } from '../lib/workout-model.js'
import { workoutsCSV } from '../lib/export-csv.js'
import { trainedMs } from './training.js'

const name = (e, S) =>
  EXIDX[e.id]?.n || S.customEx?.find((x) => x.id === e.id)?.n || e.id
export function loggedRows(entry) {
  return (entry.sets || []).flatMap((set, i) => {
    if (!hasCompletedWork(set)) return []
    const rows = isSideSet(set)
      ? [
          ['Left', set.sides.L],
          ['Right', set.sides.R],
        ]
      : [['', set]]
    return rows
      .filter(([, row]) => row.done)
      .map(([side, row]) => ({ ...row, ...(loggedWarmup(set) || loggedWarmup(row) ? {warmup:true} : {}), number: i + 1, side }))
  })
}
export default function WorkoutLog({ S, onEdit }) {
  const nav = useNavigate(),
    [query, setQuery] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [limit, setLimit] = useState(20)
  const citedId = typeof window === 'undefined' ? '' : decodeURIComponent(window.location.hash.slice(1))
  const cited = S.workouts.find((w) => 'workout-' + w.id === citedId)
  useEffect(() => { if (cited) document.getElementById(citedId)?.scrollIntoView?.({ block: 'start' }) }, [citedId, cited])
  const q = query.trim().toLowerCase()
  const list = S.workouts
    .filter(
      (w) =>
        (!from || w.d >= from) &&
        (!to || w.d <= to) &&
        (!q ||
          [w.name, ...w.entries.map((e) => name(e, S))]
            .join(' ')
            .toLowerCase()
            .includes(q)),
    )
    .slice()
    .sort((a, b) => b.d.localeCompare(a.d) || (b.start || 0) - (a.start || 0))
  function exportLog() {
    const a = document.createElement('a'),
      url = URL.createObjectURL(
        new Blob([workoutsCSV({ ...S, workouts: list })], {
          type: 'text/csv;charset=utf-8',
        }),
      )
    a.href = url
    a.download = 'sets-and-strength-workout-log.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section className="history-panel workout-log" id="workout-log">
      <div className="log-create-actions"><button className="lime" onClick={()=>nav('/create-workout?type=log')}>+ Log a workout</button><button className="outline" onClick={()=>nav('/create-workout')}>Custom workout</button><button className="outline" onClick={()=>nav('/create-workout?type=plan')}>Create a plan</button></div>
      <div className="section-head">
        <div>
          <p className="eyebrow">YOUR WORK, RECORDED</p>
          <h2>Workout log</h2>
        </div>
        <button
          className="outline compact"
          onClick={exportLog}
          disabled={!list.length}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="log-filters">
        <label className="log-search">
          <span>
            <Search size={15} />
            Workout or exercise
          </span>
          <input
            type="search"
            placeholder="Search your workouts…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(20)
            }}
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value)
              setLimit(20)
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value)
              setLimit(20)
            }}
          />
        </label>
      </div>
      <p className="muted-copy" role="status">
        {list.length} {list.length === 1 ? 'workout' : 'workouts'}
        {from || to || q ? ' matching your filters' : ''}
      </p>
      {!list.length && (
        <div className="log-empty">
          <Dumbbell size={26} />
          <h3>
            {S.workouts.length
              ? 'No matching workouts'
              : 'Your first workout starts the story'}
          </h3>
          <p>
            {S.workouts.length
              ? 'Try a different exercise or date range.'
              : 'Your dates, reps, sets and weights will appear here when you save a session.'}
          </p>
          <button
            className="outline"
            onClick={() => {
              if (S.workouts.length) {
                setQuery('')
                setFrom('')
                setTo('')
              } else nav('/plans')
            }}
          >
            {S.workouts.length ? 'Clear filters' : 'View my schedule'}
          </button>
        </div>
      )}
      {[...(cited ? [cited] : []), ...list.filter((w) => w !== cited).slice(0, limit)].map((w) => {
        const sets = w.entries.reduce(
          (n, e) => n + (e.sets || []).filter(hasCompletedWork).length,
          0,
        )
        return (
          <details className="log-session" key={w.id} id={'workout-' + w.id} open={w === cited || undefined}>
            <summary>
              <CalendarDays size={20} />
              <span>
                <strong>{w.name || 'Workout'}</strong>
                <small>
                  {new Date(w.d + 'T12:00:00').toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · {sets} sets ·{' '}
                  {Math.max(1, Math.round(trainedMs(w) / 60000))} min
                </small>
              </span>
              <ChevronDown size={18} />
            </summary>
            <div className="log-session-body">
              {onEdit && <><button className="outline compact" aria-label={`Edit saved session ${w.name || 'Workout'} on ${w.d}`} disabled={!!S.active} aria-describedby={S.active ? `edit-blocked-${w.id}` : undefined} onClick={()=>{if(!S.active) onEdit(w.id || w)}}>Edit session</button>{S.active && <p className="muted-copy" id={`edit-blocked-${w.id}`}>Finish or cancel your current session before editing a saved session.</p>}</>}

              {w.note && <p className="log-note">{w.note}</p>}
              {w.entries.map((entry, i) => {
                const rows = loggedRows(entry)
                return rows.length ? (
                  <section className="log-exercise" key={i}>
                    <h3>{name(entry, S)}</h3>
                    <table>
                      <caption className="sr-only">
                        {name(entry, S)} completed sets
                      </caption>
                      <thead>
                        <tr>
                          <th>Set</th>
                          <th>Weight ({S.unit})</th>
                          <th>Reps</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, j) => (
                          <tr key={j}>
                            <th scope="row">
                              {r.number}
                              {loggedWarmup(r) && <small>Warm-up</small>}
                              {r.side && <small>{r.side}</small>}
                            </th>
                            <td>{r.w > 0 ? r.w : '-'}</td>
                            <td>{r.r > 0 ? r.r : '-'}</td>
                            <td>
                              {r.sec > 0
                                ? r.sec + ' sec'
                                : r.min > 0
                                  ? r.min + ' min'
                                  : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entry.note && <p className="muted-copy">{entry.note}</p>}
                  </section>
                ) : null
              })}
            </div>
          </details>
        )
      })}
      {list.length > limit && (
        <button className="outline wide" onClick={() => setLimit(limit + 20)}>
          Show more workouts
        </button>
      )}
    </section>
  )
}
