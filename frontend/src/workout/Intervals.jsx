import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useStore } from '../store/useStore.js'
import { catchUpInterval, intervalRemaining } from './intervals.js'

const update = (fn) => useStore.getState().update(fn)
export default function Intervals() {
  const saved = useStore((s) => s.S.intervalTimer), [, tick] = useState(0)
  useEffect(() => {
    const refresh = () => { const t = useStore.getState().S.intervalTimer; if (t?.endsAt) update((s) => { s.intervalTimer = catchUpInterval(s.intervalTimer) }); tick((n) => n + 1) }
    const id = setInterval(refresh, 500)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const timer = saved || { phase: 'ready', round: 1, rounds: 8, workSec: 40, restSec: 20, endsAt: 0, remainingMs: 0 }
  const start = () => update((s) => { const t = s.intervalTimer || timer; const seconds = t.remainingMs ? Math.ceil(t.remainingMs / 1000) : t.phase === 'rest' ? t.restSec : t.workSec; s.intervalTimer = { ...t, phase: t.phase === 'ready' || t.phase === 'done' ? 'work' : t.phase, round: t.phase === 'done' || t.phase === 'ready' ? 1 : t.round, endsAt: Date.now() + seconds * 1000, remainingMs: 0 } })
  const pause = () => update((s) => { const t = s.intervalTimer; if (t?.endsAt) s.intervalTimer = { ...t, remainingMs: Math.max(0, t.endsAt - Date.now()), endsAt: 0 } })
  const reset = () => update((s) => { s.intervalTimer = { ...timer, phase: 'ready', round: 1, endsAt: 0, remainingMs: 0 } })
  const configure = (key, val) => update((s) => { s.intervalTimer = { ...timer, [key]: Math.max(key === 'rounds' ? 1 : 5, Math.min(key === 'rounds' ? 30 : 600, Number(val) || 1)) } })
  return <><div className="page-title"><div><p className="eyebrow">TIMESTAMP-BASED · BACKGROUND SAFE</p><h1>Interval timer</h1><p>Rounds of work and rest for HIIT, boxing, and circuit sessions.</p></div></div><section className="history-panel interval-panel">
    <div className="builder-fields"><label>Rounds<input type="number" min="1" max="30" value={timer.rounds} disabled={!!timer.endsAt} onChange={(e) => configure('rounds', e.target.value)} /></label><label>Work (seconds)<input type="number" min="5" max="600" value={timer.workSec} disabled={!!timer.endsAt} onChange={(e) => configure('workSec', e.target.value)} /></label><label>Rest (seconds)<input type="number" min="5" max="600" value={timer.restSec} disabled={!!timer.endsAt} onChange={(e) => configure('restSec', e.target.value)} /></label></div>
    <p className="eyebrow">{timer.phase === 'ready' ? 'READY' : timer.phase === 'done' ? 'COMPLETE' : `${timer.phase.toUpperCase()} · ROUND ${timer.round} OF ${timer.rounds}`}</p><strong className="timer-readout" role="timer">{String(Math.floor(intervalRemaining(timer) / 60)).padStart(2, '0')}:{String(intervalRemaining(timer) % 60).padStart(2, '0')}</strong>
    <div className="builder-actions">{timer.endsAt ? <button className="lime" onClick={pause}><Pause size={17} /> Pause</button> : <button className="lime" onClick={start}><Play size={17} /> {timer.remainingMs ? 'Resume' : 'Start'}</button>}<button className="outline" onClick={reset}><RotateCcw size={17} /> Reset</button></div>
  </section></>
}
