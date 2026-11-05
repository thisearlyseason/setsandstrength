import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
const update = (fn) => useStore.getState().update(fn)
const remaining = (t) =>
  Math.max(
    0,
    t?.until ? Math.ceil((t.until - Date.now()) / 1000) : t?.remaining || 0,
  )
export default function WorkoutTimers({ active, index }) {
  const [, tick] = useState(0),
    entry = active.entries[index],
    timer = active.setTimer
  useEffect(() => {
    const id = setInterval(() => {
      tick((n) => n + 1)
      const a = useStore.getState().S.active,
        t = a?.setTimer
      if (t?.until && t.until <= Date.now())
        update((s) => {
          const a = s.active,
            t = a.setTimer,
            row = a.entries[t.entry]?.sets[t.set]
          if (row) {
            row.done = true
            row.at = t.until
            a.restUntil =
              t.until +
              (a.entries[t.entry].target?.rest || s.restSec || 90) * 1000
          }
          a.setTimer = null
        })
    }, 250)
    return () => clearInterval(id)
  }, [])
  const rest = remaining({
    until: active.restUntil,
    remaining: active.restRemaining,
  })
  const changeRest = (delta) =>
    update((s) => {
      const a = s.active,
        n = Math.max(
          0,
          remaining({ until: a.restUntil, remaining: a.restRemaining }) + delta,
        )
      if (a.restUntil) a.restUntil = Date.now() + n * 1000
      else a.restRemaining = n
    })
  return (
    <div className="workout-timers">
      {entry.target?.mode === 'time' && (
        <section className="timer-card">
          <h3>Timed sets</h3>
          {entry.sets.map((row, i) => {
            const live = timer?.entry === index && timer.set === i,
              sec = live ? remaining(timer) : row.sec || entry.target.sec || 30
            return (
              <div className="timed-set" key={i}>
                <span>
                  Set {i + 1} · {row.done ? 'Completed' : sec + ' sec'}
                </span>
                {!row.done && (
                  <button
                    className="outline"
                    onClick={() =>
                      update((s) => {
                        const a = s.active,
                          t = a.setTimer
                        if (live && t?.until)
                          a.setTimer = {
                            ...t,
                            remaining: remaining(t),
                            until: 0,
                          }
                        else
                          a.setTimer = {
                            entry: index,
                            set: i,
                            remaining: sec,
                            until: Date.now() + sec * 1000,
                          }
                      })
                    }
                  >
                    {live && timer.until
                      ? 'Pause set'
                      : live
                        ? 'Resume set'
                        : 'Start set'}
                  </button>
                )}
              </div>
            )
          })}
        </section>
      )}
      <section className="timer-card">
        <h3>Rest timer</h3>
        <p className="muted-copy">
          Completing a set starts your rest automatically.
        </p>
        <strong
          className="timer-readout"
          role="timer"
          style={{
            '--rest-progress':
              Math.min(1, rest / (entry.target?.rest || 90)) * 360 + 'deg',
          }}
        >
          {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}
        </strong>
        <div className="timer-actions">
          <button className="outline" onClick={() => changeRest(-15)}>
            −15 sec
          </button>
          <button
            className="lime"
            onClick={() =>
              update((s) => {
                const a = s.active
                if (a.restUntil && a.restUntil > Date.now()) {
                  a.restRemaining = remaining({ until: a.restUntil })
                  a.restUntil = 0
                } else {
                  a.restUntil =
                    t.until +
                    (a.restRemaining || entry.target?.rest || s.restSec || 90) *
                      1000
                  a.restRemaining = 0
                }
              })
            }
          >
            {active.restUntil && rest > 0
              ? 'Pause rest'
              : rest
                ? 'Resume rest'
                : 'Start rest'}
          </button>
          <button className="outline" onClick={() => changeRest(15)}>
            +15 sec
          </button>
          <button
            className="outline"
            onClick={() =>
              update((s) => {
                s.active.restUntil = 0
                s.active.restRemaining = 0
              })
            }
          >
            Skip rest
          </button>
        </div>
        <label>
          Rest duration (seconds)
          <input
            aria-label="Rest duration (seconds)"
            type="number"
            min="5"
            max="900"
            step="5"
            value={entry.target?.rest || 90}
            onChange={(e) => {
              const n = +e.target.value
              if (n >= 5 && n <= 900)
                update((s) => {
                  s.active.entries[index].target.rest = n
                })
            }}
          />
        </label>
      </section>
    </div>
  )
}
