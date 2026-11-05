import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { todayISO } from '../lib/format.js'
import { monthlyComparison } from './analysis.js'
import { validatedCoachGuidance } from './coach-guidance.js'
import { inferenceProvider } from './local-inference.js'
import { useStore } from '../store/useStore.js'

const update = (fn) => useStore.getState().update(fn)
export default function LocalCoach() {
  const owner = useStore((s) => s.user?.id || 'guest')
  return <CoachScreen key={owner} />
}
function CoachScreen() {
  const S = useStore((s) => s.S), [question, setQuestion] = useState(''), [answer, setAnswer] = useState(null)
  const [modelEnabled, setModelEnabled] = useState(() => { try { return localStorage.getItem('ss.local-inference.enabled') !== '0' } catch { return true } })
  const alive = useRef(true), pending = useRef(null), asking = useRef(false)
  const [interrupted, setInterrupted] = useState(false)
  useEffect(() => {
    alive.current = true
    let disposed = false, nativeListener
    const pause = () => { if (document.hidden) pending.current?.abort() }
    document.addEventListener('visibilitychange', pause)
    if (Capacitor.isNativePlatform()) void App.addListener('appStateChange', ({ isActive }) => { if (!isActive) pending.current?.abort() })
      .then((listener) => { if (disposed) void listener.remove(); else nativeListener = listener }).catch(() => {})
    return () => { disposed = true; alive.current = false; pending.current?.abort(); document.removeEventListener('visibilitychange', pause); void nativeListener?.remove() }
  }, [])
  const [capability, setCapability] = useState('interrupted'), [busy, setBusy] = useState(false)
  useEffect(() => { let active = true; const check = () => inferenceProvider.availability().then((x) => { if (active) setCapability(x.state) }); void check(); document.addEventListener('visibilitychange', check); return () => { active = false; document.removeEventListener('visibilitychange', check) } }, [])
  const ask = async (text) => {
    if (asking.current) return
    asking.current = true
    const controller = new AbortController(); pending.current = controller; setInterrupted(false)
    text = String(text).slice(0, 2000)
    try {
    const report = monthlyComparison(S.workouts, todayISO())
    update((s) => { s.coachInteractions = Math.max(1, Number(s.coachInteractions) || 0) })
    setQuestion(text)
    const recent = S.workouts.filter((w) => w.d <= todayISO()).slice().sort((a, b) => b.d.localeCompare(a.d) || (Number(b.start) || Number(b.end) || 0) - (Number(a.start) || Number(a.end) || 0)).slice(0, 3)
    const changed = /change|progress|month|trend|volume|set/i.test(text)
    const facts = changed
      ? `In the last 30 days you logged ${report.sessions.current} sessions and ${report.workingSets.current} working sets. The previous 30 days had ${report.sessions.previous} sessions and ${report.workingSets.previous} working sets.${report.sessions.changePct == null ? ' There is not enough prior session history for a percentage comparison.' : ` Sessions changed ${Math.abs(report.sessions.changePct)}% ${report.sessions.changePct >= 0 ? 'up' : 'down'} from the previous period.`}`
      : /plan|build|recommend|swap|exercise/i.test(text) ? 'Open the workout builder to preview editable constraints and catalog-validated exercises. Review the preview and select Save, Schedule or Start to apply it. This answer has not changed your plan.'
      : recent.length ? `Your latest logged session was ${recent[0].name || 'Workout'} on ${recent[0].d}. Keep your next change small and review how it feels in your next session.` : 'There is no training history yet. Start with a comfortable session and log it to build a useful baseline.'
    setBusy(true)
    let coaching = null
    if (capability === 'ready' && modelEnabled) {
      const startDate = new Date(`${todayISO()}T12:00:00`); startDate.setDate(startDate.getDate() - 59)
      const start = `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,'0')}-${String(startDate.getDate()).padStart(2,'0')}`
      const context = JSON.stringify({ range: { start, end: todayISO(), localCalendarDays: 60 }, sessions: report.sessions, workingSets: report.workingSets, citedSessions: recent.map((w) => ({ id: w.id, date: w.d })) })
      try { coaching = validatedCoachGuidance(await inferenceProvider.generate(`Choose exactly one action token: review_history, review_schedule, keep_logging. Output only that token, with no explanation. Use these local computed facts: ${context}. The user asks: ${text}`, { signal: controller.signal }), report.sessions.current) }
      catch (e) { if (alive.current) { setCapability('interrupted'); setInterrupted(true) }; coaching = null }
    }
    if (alive.current) { setAnswer({ facts, coaching, sources: recent }); setBusy(false) }
    } finally { asking.current = false; pending.current = null; if (alive.current) setBusy(false) }
  }
  return <>
    <div className="page-title"><div><p className="eyebrow">PRIVATE, ON THIS DEVICE</p><h1>Your training guide</h1><p>{capability === 'ready' && modelEnabled ? 'On-device model available. Numbers and training claims remain grounded in app calculations.' : 'Guided answers use your saved workout history while no on-device model is available.'}</p></div></div>
    <section className="history-panel">
      <p className="tag pale"><Sparkles size={15} /> {capability === 'ready' && modelEnabled ? 'On-device coach ready' : !modelEnabled ? 'Guided local mode · model disabled' : 'Guided local mode · no model available'}</p>
      <label><input type="checkbox" checked={modelEnabled} onChange={(e) => { pending.current?.abort(); setModelEnabled(e.target.checked); setAnswer(null); try { localStorage.setItem('ss.local-inference.enabled', e.target.checked ? '1' : '0') } catch {} }} /> Use on-device model</label>
      {interrupted && <p role="status">The model request was interrupted. Your calculated local answer remains available; you can check availability and try again.</p>}
      {!modelEnabled && <p className="muted-copy">Model disabled on this device. Guided answers and reports use local app calculations.</p>}
      <p className="muted-copy">Questions and training context stay on this device. Numbers are calculated by the app and linked to their source sessions. A coach response never changes your plan or log.</p>
      {modelEnabled && capability === 'download-needed' && <div className="coach-capability"><p>An initial model download is required before on-device coaching can run. It may use a substantial amount of data and storage.</p><button className="outline" onClick={async () => { if (!window.confirm('Allow the operating system or AICore to download its on-device language model? This download may use substantial data and storage.')) return; setBusy(true); const result = await inferenceProvider.download(); setCapability(result.state); setBusy(false) }}>{busy ? 'Checking…' : 'Download or check model'}</button><p className="muted-copy">On iOS, Apple Intelligence manages the system model download in Settings. On Android, this requests the local AICore model download.</p></div>}
      {capability === 'unsupported' && <p className="muted-copy">This device does not expose a supported local model. The guided answers below remain available offline.</p>}
      {capability !== 'ready' && <button className="outline" onClick={async () => setCapability((await inferenceProvider.availability()).state)}>Check model availability</button>}
      <div className="coach-prompts"><button className="outline" disabled={busy} onClick={() => ask('What changed in my training recently?')}>What changed recently?</button><button className="outline" disabled={busy} onClick={() => ask('What did I train last?')}>What did I train last?</button><button className="outline" disabled={busy} onClick={() => ask('Help me plan a workout')}>Help me plan a workout</button></div>
      <form className="coach-input" onSubmit={(e) => { e.preventDefault(); if (question.trim() && !busy) ask(question.trim()) }}><label htmlFor="coach-question">Ask about your training</label><div><input id="coach-question" maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What changed in my last month?" /><button className="lime" disabled={busy} type="submit"><MessageCircle size={17} /> {busy ? 'Thinking…' : 'Ask'}</button></div></form>
      {answer && <article className="coach-answer" aria-live="polite">{answer.coaching && <p>{answer.coaching}</p>}<p><strong>Calculated from your logs:</strong> {answer.facts}</p><div className="coach-sources"><strong>Source sessions</strong><Link to="/progress?view=insights">Open the dated training report behind these totals <ArrowRight size={15} /></Link>{answer.sources.length ? answer.sources.map((w) => <Link key={w.id} to={`/progress#workout-${encodeURIComponent(w.id)}`}>{w.name || 'Workout'} · {w.d} <ArrowRight size={15} /></Link>) : <span>No source sessions yet.</span>}</div></article>}
      <div className="builder-actions"><Link className="outline" to="/builder">Open workout builder <ArrowRight size={16} /></Link><Link className="outline" to="/exercise-progress">Explore exercise progress <ArrowRight size={16} /></Link></div>
    </section>
  </>
}
