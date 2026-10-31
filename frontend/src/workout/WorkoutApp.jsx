import studies from './illustrations.json'
import { movementOf, difficultyOf } from './classification.js'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  NavLink,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Home as HomeIcon,
  Layers3,
  LogOut,
  Menu,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useStore } from '../store/useStore.js'
import { EXDB, EXIDX } from '../lib/exercises.js'
import { todayISO } from '../lib/format.js'
import { mergeStates } from '../lib/sync-merge.js'
import { buildSessionEntry } from '../lib/session-start.js'
import { parseImport, mergeImport } from '../lib/import-csv.js'
import { workoutsCSV } from '../lib/export-csv.js'
import { bestWeightFor } from '../lib/history.js'
import {
  configured,
  supabase,
  profiles,
  createProfile,
  currentProfile,
  selectProfile,
  account,
} from './backend.js'
import {
  enrollProgram,
  startSession,
  completeSession,
  exportJSON,
  readJSON,
} from './training.js'
import programs from './programs.json'
const Anatomy = lazy(() => import('./Illustration.jsx'))
const motions = Object.fromEntries(
  Object.entries(studies).map(([id, m]) => [id, m.motion]),
)
const tabs = [
  ['/', 'Overview', HomeIcon],
  ['/plans', 'Training plans', CalendarDays],
  ['/exercises', 'Exercise library', Dumbbell],
  ['/progress', 'Your progress', TrendingUp],
  ['/profile', 'Your profile', UserRound],
]
const sports = [
  ['all', 'All sports'],
  ['basketball', 'Basketball'],
  ['hockey', 'Hockey'],
  ['volleyball', 'Volleyball'],
  ['baseball', 'Baseball'],
  ['soccer', 'Soccer'],
  ['running', 'Running'],
  ['general', 'General fitness'],
]
let catalogPromise
const details = () =>
  (catalogPromise ||= fetch('/workout/catalog.json').then((r) => {
    if (!r.ok) throw Error('Exercise instructions unavailable')
    return r.json()
  }))
const title = (s) => s?.replace(/\b\w/g, (c) => c.toUpperCase()) || ''
const update = (fn) => useStore.getState().update(fn)
const stampDate = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  })
function download(name, data, type = 'application/json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([data], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
function SportArt({ sport = 'general', className = '' }) {
  return (
    <svg
      className={'sport-art ' + className}
      viewBox="0 0 500 340"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={'g-' + sport} x2="1" y2="1">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="#233c35" />
        </linearGradient>
        <pattern
          id={'p-' + sport}
          width="38"
          height="38"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 38L38 0" stroke="white" strokeOpacity=".05" />
        </pattern>
      </defs>
      <rect width="500" height="340" fill={'url(#g-' + sport + ')'} />
      <rect width="500" height="340" fill={'url(#p-' + sport + ')'} />
      <g fill="none" stroke="#e8f5d2" strokeWidth="2" opacity=".3">
        <ellipse cx="310" cy="185" rx="200" ry="130" />
        <ellipse cx="310" cy="185" rx="155" ry="100" />
        <ellipse cx="310" cy="185" rx="110" ry="70" />
        <path d="M20 280L480 50M20 305L480 75" />
      </g>
      {['basketball', 'volleyball', 'soccer', 'baseball'].includes(sport) ? (
        <g transform="translate(335 135) rotate(-22)">
          <circle
            r="83"
            fill={
              sport === 'basketball'
                ? '#d79154'
                : sport === 'soccer'
                  ? '#d2dfb6'
                  : '#e0e8d7'
            }
          />
          <g fill="none" stroke="#2b4237" strokeWidth="4" opacity=".8">
            <circle r="81" />
            <path d="M-80 0H80M0-80V80M-60-55Q35 0-60 55M60-55Q-35 0 60 55" />
          </g>
        </g>
      ) : (
        <g transform="translate(310 155) rotate(-28)" fill="#b9df7c">
          <rect x="-96" y="-9" width="192" height="18" rx="8" />
          <rect x="-100" y="-55" width="27" height="110" rx="8" />
          <rect x="73" y="-55" width="27" height="110" rx="8" />
          <rect x="-120" y="-37" width="20" height="74" rx="6" />
          <rect x="100" y="-37" width="20" height="74" rx="6" />
        </g>
      )}
      <circle cx="440" cy="285" r="90" fill="#c4f064" opacity=".08" />
    </svg>
  )
}
function Modal({ title: heading, onClose, children }) {
  const ref = useRef()
  useEffect(() => {
    const before = document.activeElement
    ref.current?.showModal()
    return () => before?.focus()
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <header>
        <h2>{heading}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <X />
        </button>
      </header>
      {children}
    </dialog>
  )
}
function Empty({ icon: Icon = Layers3, title: heading, children, action }) {
  return (
    <div className="empty">
      <Icon size={32} />
      <h3>{heading}</h3>
      <p>{children}</p>
      {action}
    </div>
  )
}
function App() {
  const ready = useStore((s) => s.ready),
    user = useStore((s) => s.user),
    sync = useStore((s) => s.sync),
    [notice, setNotice] = useState(''),
    [detail, setDetail] = useState(null),
    nav = useNavigate(),
    location = useLocation()
  useEffect(() => {
    useStore.getState().boot()
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 6500)
    return () => clearTimeout(t)
  }, [notice])
  const message = (e) => setNotice(typeof e === 'string' ? e : e.message)
  const requireUser = () => {
    if (user) return true
    nav('/profile')
    message('Create an account and training profile to save your workouts.')
    return false
  }
  return (
    <div className="workout-app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <Activity size={25} />
          </span>
          workout<span className="brand-dot">.</span>
        </NavLink>
        <p className="sidebar-label">YOUR TRAINING SPACE</p>
        <nav aria-label="Main navigation">
          {tabs.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === '/'}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-promo">
            <Sparkles size={21} />
            <strong>
              A little stronger.
              <br />
              Every single day.
            </strong>
            <p>Make room for your next level.</p>
          </div>
          <div className="local-status">
            <span />
            {configured ? 'Local Supabase' : 'Setup needed'}
          </div>
          <a href="/workout/source.zip" className="source-link">
            Open-source by design ↗
          </a>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Your space <span>/</span>{' '}
            {location.pathname === '/workout'
              ? 'Workout'
              : tabs.find((t) => t[0] === location.pathname)?.[1] || 'Overview'}
          </span>
          <div className="top-actions">
            <span className="today">
              <CalendarDays size={16} />
              {new Date().toLocaleDateString('en', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <button
              className="avatar"
              aria-label="Open profile"
              onClick={() => nav('/profile')}
            >
              {user?.name?.slice(0, 2).toUpperCase() || <UserRound size={18} />}
            </button>
          </div>
        </header>
        <main id="main">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  user={user}
                  onDetail={setDetail}
                  requireUser={requireUser}
                />
              }
            />
            <Route
              path="/plans"
              element={
                <Plans
                  user={user}
                  onNotice={message}
                  requireUser={requireUser}
                />
              }
            />
            <Route
              path="/exercises"
              element={<Library onDetail={setDetail} />}
            />
            <Route path="/progress" element={<Progress />} />
            <Route
              path="/profile"
              element={<Profile user={user} ready={ready} onNotice={message} />}
            />
            <Route
              path="/workout"
              element={
                <Player
                  onNotice={message}
                  onDetail={setDetail}
                  requireUser={requireUser}
                />
              }
            />
            <Route
              path="*"
              element={
                <Empty
                  title="That page isn't here"
                  action={<button onClick={() => nav('/')}>Back home</button>}
                />
              }
            />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>Built for the way you move.</span>
          <span>
            {user
              ? sync.pending
                ? 'Changes saved on this device'
                : sync.offline
                  ? 'Offline · your work stays here'
                  : 'Your training, your data'
              : 'Explore your next level'}
          </span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {tabs.map(([path, label, Icon], i) => (
          <NavLink key={path} to={path} end={path === '/'}>
            <Icon size={21} />
            <span>
              {['Home', 'Plans', 'Exercises', 'Progress', 'Profile'][i]}
            </span>
          </NavLink>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {detail && (
        <ExerciseDetail
          id={detail}
          onClose={() => setDetail(null)}
          onNotice={message}
          requireUser={requireUser}
        />
      )}
    </div>
  )
}
function Home({ user, onDetail, requireUser }) {
  const S = useStore((s) => s.S),
    nav = useNavigate(),
    today = todayISO(),
    scheduled = (S.dayPlan[today] || [])
      .map((id) => S.routines.find((r) => r.id === id))
      .filter(Boolean),
    next = scheduled[0] || S.routines[0],
    week = S.workouts.filter(
      (w) => Date.now() - new Date(w.d + 'T12:00:00').getTime() < 7 * 86400000,
    ),
    minutes = Math.round(
      week.reduce((n, w) => n + Math.max(0, (w.end - w.start) / 60000), 0),
    )
  const start = () => {
    if (!requireUser()) return
    if (S.active) {
      nav('/workout')
      return
    }
    if (!next) {
      nav('/plans')
      return
    }
    update((s) => startSession(s, next))
    nav('/workout')
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">SHOW UP FOR YOURSELF</p>
          <h1>
            {user
              ? `Let's move, ${user.name.split(' ')[0]}.`
              : 'Find your next level.'}
          </h1>
          <p>A stronger you starts with what you do today.</p>
        </div>
        <button className="outline compact" onClick={() => nav('/plans')}>
          <CalendarDays size={17} />
          My schedule
        </button>
      </div>
      <div className="home-grid">
        <section className="hero-card">
          <div className="hero-lines" />
          <div className="hero-content">
            <span className="tag dark-tag">
              <span className="live-dot" />{' '}
              {S.active
                ? 'WORKOUT IN PROGRESS'
                : next
                  ? 'YOUR NEXT WORKOUT'
                  : 'YOUR NEXT CHAPTER'}
            </span>
            <h2>
              {S.active
                ? 'KEEP YOUR\nMOMENTUM.'
                : next
                  ? 'READY. SET.\nGET STRONGER.'
                  : 'TRAIN WITH\nPURPOSE.'}
            </h2>
            <p>
              {S.active?.name ||
                next?.name ||
                'Your sport. Your pace. A plan that moves with you.'}
            </p>
            <div className="hero-meta">
              <span>
                <Dumbbell size={16} />
                {next ? `${next.ex.length} exercises` : '7 training categories'}
              </span>
              <span>
                <Clock3 size={16} />
                {next ? 'One set at a time' : '4-week programs'}
              </span>
            </div>
            <button className="lime" onClick={start}>
              {S.active
                ? 'Continue workout'
                : next
                  ? 'Start workout'
                  : 'Find my plan'}
              <ArrowUpRight size={20} />
            </button>
          </div>
          <div className="hero-art">
            <SportArt sport="general" />
            <div className="hero-badge">
              <Target size={24} />
              <span>
                PROGRESS
                <br />
                <strong>Starts here.</strong>
              </span>
            </div>
          </div>
          <span className="hero-number">01 / YOUR JOURNEY</span>
        </section>
        <section className="week-card">
          <div className="section-head">
            <h3>This week</h3>
            <span className="tag pale">YOUR ACTIVITY</span>
          </div>
          <div className="week-ring">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="51" />
              <circle
                cx="60"
                cy="60"
                r="51"
                style={{
                  strokeDasharray: `${Math.min(week.length / 3, 1) * 320} 320`,
                }}
              />
            </svg>
            <div>
              <strong>
                {week.length}
                <small>/ 3</small>
              </strong>
              <span>workouts</span>
            </div>
          </div>
          <div className="week-days">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date()
              d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i)
              const iso = [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, '0'),
                String(d.getDate()).padStart(2, '0'),
              ].join('-')
              const done = S.workouts.some((w) => w.d === iso)
              return (
                <div key={i}>
                  <span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                  <b className={done ? 'done' : iso === today ? 'current' : ''}>
                    {done ? <Check size={13} /> : d.getDate()}
                  </b>
                </div>
              )
            })}
          </div>
          <p className="week-note">
            {week.length
              ? 'Small wins. Real momentum.'
              : 'Your first session is a fresh start.'}
          </p>
        </section>
      </div>
      <div className="metric-row">
        {[
          [Flame, week.length, 'Workouts this week', 'Keep your momentum'],
          [Clock3, minutes, 'Minutes trained', 'Time invested in you'],
          [
            TrendingUp,
            S.workouts.reduce((n, w) => n + (w.prs?.length || 0), 0),
            'Personal records',
            'Your effort, measured',
          ],
        ].map(([Icon, value, label, note]) => (
          <section className="metric" key={label}>
            <div className="metric-icon">
              <Icon size={20} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <small>{note}</small>
          </section>
        ))}
      </div>
      <div className="section-head spacious">
        <div>
          <p className="eyebrow">BUILT FOR YOUR GAME</p>
          <h2>Move with a purpose.</h2>
        </div>
        <NavLink to="/plans" className="text-link">
          Explore all plans <ArrowRight size={17} />
        </NavLink>
      </div>
      <div className="sport-grid">
        {['basketball', 'hockey', 'running'].map((sport, i) => {
          const p = programs.find((p) => p.sport === sport)
          return (
            <button
              className={'sport-card sport-' + sport}
              key={sport}
              onClick={() => nav('/plans?sport=' + sport)}
            >
              <SportArt sport={sport} />
              <span className="sport-count">0{i + 1}</span>
              <div>
                <span className="tag glass">{p.label}</span>
                <h3>{p.title}</h3>
                <p>4 weeks · Adult & youth tracks</p>
              </div>
              <span className="round-arrow">
                <ArrowUpRight size={20} />
              </span>
            </button>
          )
        })}
      </div>
      <div className="section-head spacious">
        <div>
          <p className="eyebrow">LEARN THE MOVEMENT</p>
          <h2>A little more intention.</h2>
        </div>
        <NavLink to="/exercises" className="text-link">
          {EXDB.length.toLocaleString()} exercises <ArrowRight size={17} />
        </NavLink>
      </div>
      <div className="quick-grid">
        {['3948', '0662', '0032'].map((id, i) => (
          <button
            className="quick-exercise"
            key={id}
            onClick={() => onDetail(id)}
          >
            <span className={'exercise-glyph glyph-' + i}>
              <Dumbbell size={28} />
            </span>
            <div>
              <h3>{title(EXIDX[id]?.n)}</h3>
              <p>
                {EXIDX[id]?.eq} · {EXIDX[id]?.tg}
              </p>
            </div>
            <ArrowUpRight size={20} />
          </button>
        ))}
      </div>
    </>
  )
}
function Plans({ user, onNotice, requireUser }) {
  const S = useStore((s) => s.S),
    nav = useNavigate(),
    location = useLocation(),
    [sport, setSport] = useState(
      new URLSearchParams(location.search).get('sport') || 'all',
    ),
    [track, setTrack] = useState('beginner'),
    [selected, setSelected] = useState(null),
    [start, setStart] = useState(todayISO()),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    )
  useEffect(() => {
    if (user?.age_band === '13-15') setTrack('youth-13')
    else if (user?.age_band === '16-17') setTrack('youth-16')
  }, [user?.age_band])
  const list = programs.filter(
    (p) => (sport === 'all' || p.sport === sport) && p.track === track,
  )
  const enroll = (p) => {
    if (!requireUser()) return
    if (user.age_band !== 'adult' && user.age_band !== p.ageBand) {
      onNotice('Choose the program for this youth profile’s age band.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      onNotice('Choose a start date.')
      return
    }
    update((s) => enrollProgram(s, p, start))
    setSelected(null)
    onNotice(
      'Your four-week schedule is ready. You can move any session below.',
    )
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">A PLAN. A PURPOSE.</p>
          <h1>Train for your game.</h1>
          <p>Seven ways to move. One stronger you.</p>
        </div>
        <span className="tag pale">35 STARTER PROGRAMS</span>
      </div>
      <div className="filter-tabs">
        {sports.map(([id, label]) => (
          <button
            className={sport === id ? 'selected' : ''}
            key={id}
            onClick={() => setSport(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="section-head">
        <p>Four-week foundations, built around your sport.</p>
        <select
          aria-label="Program track"
          value={track}
          onChange={(e) => setTrack(e.target.value)}
        >
          <option value="beginner">Adult · Beginner</option>
          <option value="intermediate">Adult · Intermediate</option>
          <option value="advanced">Adult · Advanced</option>
          <option value="youth-13">Youth · Ages 13–15</option>
          <option value="youth-16">Youth · Ages 16–17</option>
        </select>
      </div>
      <div className="plans-grid">
        {list.map((p) => (
          <button
            key={p.id}
            className={'plan-card sport-' + p.sport}
            onClick={() => setSelected(p)}
          >
            <div className="plan-image">
              <SportArt sport={p.sport} />
              <span className="tag glass">{p.label}</span>
            </div>
            <div className="plan-info">
              <div className="section-head">
                <span className="eyebrow">{p.level}</span>
                <ArrowUpRight size={20} />
              </div>
              <h3>{p.title}</h3>
              <p>{p.focus}</p>
              <div className="plan-meta">
                <Clock3 size={14} /> 4 weeks <span>·</span>{' '}
                {p.ageBand === 'adult' ? 3 : 2} days / week
              </div>
              <span className="draft-label">
                Draft · coaching review pending
              </span>
            </div>
          </button>
        ))}
      </div>
      <section className="calendar-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">MAKE TIME FOR YOU</p>
            <h2>Your training calendar</h2>
          </div>
          <div className="calendar-controls">
            <button
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={19} />
            </button>
            <strong>
              {month.toLocaleDateString('en', {
                month: 'long',
                year: 'numeric',
              })}
            </strong>
            <button
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span className="day-label" key={d}>
              {d}
            </span>
          ))}
          {Array.from({ length: (month.getDay() + 6) % 7 }, (_, i) => (
            <div key={'blank' + i} />
          ))}
          {Array.from(
            {
              length: new Date(
                month.getFullYear(),
                month.getMonth() + 1,
                0,
              ).getDate(),
            },
            (_, i) => {
              const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
                routines = (S.dayPlan[iso] || [])
                  .map((id) => S.routines.find((r) => r.id === id))
                  .filter(Boolean)
              return (
                <div
                  className={
                    'calendar-day ' + (iso === todayISO() ? 'is-today' : '')
                  }
                  key={iso}
                >
                  <b>{i + 1}</b>
                  {routines.map((r) => (
                    <details key={r.id}>
                      <summary>
                        {r.name.split(' · ').slice(0, 2).join(' · ')}
                      </summary>
                      <button
                        onClick={() => {
                          if (!requireUser()) return
                          try {
                            update((s) => startSession(s, r))
                            nav('/workout')
                          } catch (e) {
                            onNotice(e)
                          }
                        }}
                      >
                        Start
                      </button>
                      <label>
                        Move to
                        <input
                          aria-label={'Move ' + r.name}
                          type="date"
                          value={iso}
                          onChange={(e) => {
                            const date = e.target.value
                            if (!date) return
                            update((s) => {
                              s.dayPlan[iso] = (s.dayPlan[iso] || []).filter(
                                (id) => id !== r.id,
                              )
                              s.dayPlan[date] = [
                                ...(s.dayPlan[date] || []),
                                r.id,
                              ]
                            })
                          }}
                        />
                      </label>
                    </details>
                  ))}
                </div>
              )
            },
          )}
        </div>
        {!S.routines.length && (
          <p className="muted-copy">
            Choose a program to fill your calendar. Your schedule stays
            editable.
          </p>
        )}
      </section>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="modal-body">
            <p>{selected.description}</p>
            <div className="notice-box">
              <ShieldCheck size={22} />
              <span>
                {selected.supervision}. This program is a draft awaiting
                qualified coaching review.
              </span>
            </div>
            {selected.weeks.map((w) => (
              <details
                className="week-details"
                key={w.week}
                open={w.week === 1}
              >
                <summary>
                  Week {w.week} · {w.sessions.length} sessions
                </summary>
                <p>{w.note}</p>
                {w.sessions.map((s, i) => (
                  <div key={i}>
                    <h4>{s.name}</h4>
                    {s.sections.map((section) => (
                      <p key={section.name}>
                        <strong>{section.name}: </strong>
                        {section.exercises
                          .map((e) => title(EXIDX[e.id]?.n))
                          .join(' · ')}
                      </p>
                    ))}
                  </div>
                ))}
              </details>
            ))}
            <label>
              Start date
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <button className="primary wide" onClick={() => enroll(selected)}>
              Add draft program to my schedule <ArrowRight size={18} />
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
function Library({ onDetail }) {
  const [query, setQuery] = useState(''),
    [equipment, setEquipment] = useState(''),
    [muscle, setMuscle] = useState(''),
    [movement, setMovement] = useState(''),
    [difficulty, setDifficulty] = useState(''),
    [limit, setLimit] = useState(48)
  const list = EXDB.filter(
    (e) =>
      (!query || `${e.n} ${e.tg} ${e.eq}`.includes(query.toLowerCase())) &&
      (!equipment || e.eq === equipment) &&
      (!muscle || e.tg === muscle) &&
      (!movement || movementOf(e) === movement) &&
      (!difficulty || difficultyOf(e) === difficulty),
  )
  const reset = () => setLimit(48)
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">KNOW YOUR MOVEMENT</p>
          <h1>The exercise library.</h1>
          <p>
            Explore {EXDB.length.toLocaleString()} movements. Build confidence,
            one rep at a time.
          </p>
        </div>
        <span className="tag pale">COMPLETE OPENGYM CATALOG</span>
      </div>
      <div className="search-bar">
        <Search size={21} />
        <input
          aria-label="Search exercises"
          placeholder="Search a movement, muscle or equipment…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            reset()
          }}
        />
        {query && (
          <button aria-label="Clear search" onClick={() => setQuery('')}>
            <X size={18} />
          </button>
        )}
      </div>
      <div className="library-filters">
        <Settings2 size={18} />
        {[
          [
            'Equipment',
            equipment,
            setEquipment,
            [...new Set(EXDB.map((e) => e.eq))].sort(),
          ],
          [
            'Muscle',
            muscle,
            setMuscle,
            [...new Set(EXDB.map((e) => e.tg))].sort(),
          ],
          [
            'Movement',
            movement,
            setMovement,
            [...new Set(Object.values(motions)), 'unclassified'],
          ],
          [
            'Difficulty',
            difficulty,
            setDifficulty,
            ['beginner', 'intermediate', 'unclassified'],
          ],
        ].map(([label, value, set, options]) => (
          <select
            aria-label={label}
            value={value}
            key={label}
            onChange={(e) => {
              set(e.target.value)
              reset()
            }}
          >
            <option value="">All {label.toLowerCase()}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {title(o)}
              </option>
            ))}
          </select>
        ))}
      </div>
      <div className="section-head">
        <p>{list.length.toLocaleString()} exercises</p>
        <span className="muted-copy">Original 3D library in production</span>
      </div>
      <div className="exercise-grid">
        {list.slice(0, limit).map((e, i) => (
          <button
            className="exercise-card"
            key={e.id}
            onClick={() => onDetail(e.id)}
          >
            <div className={'exercise-image tone-' + (i % 4)}>
              <BodyGlyph part={e.bp} />
              <span className="exercise-part">{e.bp}</span>
              <ArrowUpRight size={19} />
            </div>
            <div className="exercise-info">
              <h3>{title(e.n)}</h3>
              <p>
                {e.eq} <span>·</span> {e.tg}
              </p>
              <small>
                {motions[e.id]
                  ? 'Original 3D study · unreviewed'
                  : 'Demonstration pending'}
              </small>
            </div>
          </button>
        ))}
      </div>
      {!list.length && (
        <Empty icon={Search} title="No movements found">
          Try another name or fewer filters.
        </Empty>
      )}
      {limit < list.length && (
        <button
          className="outline load-more"
          onClick={() => setLimit(limit + 48)}
        >
          Load more exercises <Plus size={17} />
        </button>
      )}
    </>
  )
}
function BodyGlyph({ part }) {
  return (
    <svg viewBox="0 0 160 180" className="body-glyph" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="15"
      >
        <circle cx="80" cy="30" r="13" strokeWidth="2" fill="currentColor" />
        <path d="M80 57V107M80 65L49 77L34 111M80 65L111 77L126 111M80 105L60 137L55 166M80 105L100 137L105 166" />
      </g>
      <g stroke="#b8e860" strokeLinecap="round" strokeWidth="16">
        <path
          d={
            /leg|cal|quad|thigh/.test(part)
              ? 'M64 134L56 162M96 134L104 162'
              : /arm/.test(part)
                ? 'M50 78L37 106M110 78L123 106'
                : 'M80 65V94'
          }
        />
      </g>
    </svg>
  )
}
function ExerciseDetail({ id, onClose, onNotice, requireUser }) {
  const [ex, setEx] = useState(null),
    [error, setError] = useState(''),
    nav = useNavigate()
  useEffect(() => {
    let live = true
    details()
      .then((d) => {
        if (live) setEx(d[id])
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
    return () => {
      live = false
    }
  }, [id])
  const base = EXIDX[id]
  const add = () => {
    if (!requireUser()) {
      onClose()
      return
    }
    const s = useStore.getState().S
    if (s.active) {
      update((d) => {
        d.active.entries.push({
          id,
          ...buildSessionEntry(
            d,
            id,
            { sets: 3, reps: 8, weight: 0 },
            null,
            null,
          ),
        })
      })
      onNotice('Exercise added to your workout.')
    } else {
      update((d) => {
        const routine = {
          id: crypto.randomUUID(),
          name: title(base?.n),
          ex: [{ id, sets: 3, reps: 8, weight: 0, rest: 90 }],
        }
        startSession(d, routine)
      })
      nav('/workout')
    }
    onClose()
  }
  return (
    <Modal title={title(base?.n)} onClose={onClose}>
      <div className="modal-body">
        {motions[id] ? (
          <Suspense
            fallback={
              <div className="media-loading">Loading exercise drawing…</div>
            }
          >
            <Anatomy
              motion={motions[id]}
              primary={ex?.muscleMap?.primaries || [base?.tg]}
              secondary={ex?.muscleMap?.secondaries || base?.sm || []}
            />
          </Suspense>
        ) : (
          <div className="pending-media">
            <BodyGlyph part={base?.bp || ''} />
            <div>
              <span className="tag pale">DEMONSTRATION PENDING</span>
              <p>
                This exercise demonstration is in production.
                <br />
                Instructions are available below.
              </p>
            </div>
          </div>
        )}
        <div className="detail-tags">
          <span>{base?.eq}</span>
          <span>{base?.tg}</span>
          <span>{base?.cat}</span>
        </div>
        {error ? (
          <p role="alert">{error}</p>
        ) : !ex ? (
          <p>Loading instructions…</p>
        ) : (
          <>
            <p>{ex.description}</p>
            <h3>Move with control</h3>
            <ol className="instructions">
              {ex.instructions?.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </>
        )}
        <button className="primary wide" onClick={add}>
          Train this movement <ArrowRight size={18} />
        </button>
      </div>
    </Modal>
  )
}
function Player({ onNotice, onDetail, requireUser }) {
  const S = useStore((s) => s.S),
    a = S.active,
    nav = useNavigate(),
    [now, setNow] = useState(Date.now()),
    [swap, setSwap] = useState(false),
    [swapEq, setSwapEq] = useState(''),
    [confirm, setConfirm] = useState(false),
    [cue, setCue] = useState(null)
  const cueId = a?.entries[a?.cur || 0]?.id
  useEffect(() => {
    let live = true
    setCue(null)
    if (cueId)
      details()
        .then((d) => {
          if (live) setCue(d[cueId])
        })
        .catch(() => {})
    return () => {
      live = false
    }
  }, [cueId])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!a)
    return (
      <Empty
        icon={Dumbbell}
        title="Ready when you are"
        action={
          <button className="primary" onClick={() => nav('/plans')}>
            Choose a training plan <ArrowRight size={18} />
          </button>
        }
      >
        Pick your next session and make it count.
      </Empty>
    )
  const index = Math.min(a.cur || 0, a.entries.length - 1),
    entry = a.entries[index],
    ex = EXIDX[entry?.id],
    done = a.entries.reduce(
      (n, e) => n + e.sets.filter((s) => s.done).length,
      0,
    ),
    total = a.entries.reduce((n, e) => n + e.sets.length, 0),
    rest = Math.max(0, Math.ceil(((a.restUntil || 0) - now) / 1000))
  const finish = () => {
    try {
      update((s) => completeSession(s))
      onNotice('Workout saved. Every session is a step forward.')
      nav('/progress')
    } catch (e) {
      onNotice(e)
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">YOUR FOCUS ZONE</p>
          <h1>{a.name.split(' · ')[0]}</h1>
          <p>{a.name}</p>
        </div>
        <button className="outline" onClick={() => setConfirm(true)}>
          Finish workout <Check size={18} />
        </button>
      </div>
      <div className="session-progress">
        <span>
          {done} / {total} sets complete
        </span>
        <div>
          <i style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} />
        </div>
        <strong>
          {Math.floor((now - a.start) / 60000)}:
          {String(Math.floor((now - a.start) / 1000) % 60).padStart(2, '0')}
        </strong>
      </div>
      <div className="player-grid">
        <section>
          <div className="section-head">
            <span className="eyebrow">
              MOVEMENT {index + 1} OF {a.entries.length}
            </span>
            <button className="text-link" onClick={() => onDetail(entry.id)}>
              Technique <ArrowUpRight size={17} />
            </button>
          </div>
          <h2 className="movement-title">{title(ex?.n)}</h2>
          {motions[entry.id] ? (
            <Suspense
              fallback={<div className="media-loading">Loading movement…</div>}
            >
              <Anatomy
                motion={motions[entry.id]}
                primary={[ex?.tg]}
                secondary={ex?.sm || []}
              />
            </Suspense>
          ) : (
            <div className="pending-media large">
              <BodyGlyph part={ex?.bp || ''} />
              <div>
                <span className="tag pale">DEMONSTRATION PENDING</span>
                <p>Learn the movement with step-by-step instructions.</p>
                <button className="outline" onClick={() => onDetail(entry.id)}>
                  View technique
                </button>
              </div>
            </div>
          )}
          {cue && (
            <div className="technique-cue">
              <strong>Focus on form</strong>
              <p>{cue.instructions?.[0]}</p>
            </div>
          )}
          <div className="player-navigation">
            <button
              className="outline"
              disabled={index === 0}
              onClick={() =>
                update((s) => {
                  s.active.cur = index - 1
                })
              }
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            <button
              className="outline"
              disabled={index === a.entries.length - 1}
              onClick={() =>
                update((s) => {
                  s.active.cur = index + 1
                })
              }
            >
              Next exercise
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
        <section className="set-panel">
          <div className="section-head">
            <h3>Make every rep count.</h3>
            <Dumbbell size={20} />
          </div>
          <p className="muted-copy">
            Previous best:{' '}
            {bestWeightFor(S, entry.id)
              ? `${bestWeightFor(S, entry.id)} ${S.unit}`
              : 'Not recorded yet'}
          </p>
          <div className="set-table">
            <div className="set-row set-heading">
              <span>SET</span>
              <span>{S.unit.toUpperCase()}</span>
              <span>{entry.target?.mode === 'time' ? 'SECONDS' : 'REPS'}</span>
              <span>DONE</span>
            </div>
            {entry.sets.map((set, i) => (
              <div
                className={'set-row ' + (set.done ? 'completed' : '')}
                key={i}
              >
                <b>{i + 1}</b>
                <input
                  aria-label={'Set ' + (i + 1) + ' weight'}
                  type="number"
                  min="0"
                  step="0.5"
                  value={set.w || 0}
                  onChange={(e) =>
                    update((s) => {
                      s.active.entries[index].sets[i].w = Math.max(
                        0,
                        +e.target.value,
                      )
                    })
                  }
                />
                <input
                  aria-label={
                    'Set ' +
                    (i + 1) +
                    (entry.target?.mode === 'time' ? ' seconds' : ' reps')
                  }
                  type="number"
                  min="0"
                  value={
                    entry.target?.mode === 'time' ? set.sec || 0 : set.r || 0
                  }
                  onChange={(e) =>
                    update((s) => {
                      s.active.entries[index].sets[i][
                        entry.target?.mode === 'time' ? 'sec' : 'r'
                      ] = Math.max(0, +e.target.value)
                    })
                  }
                />
                <button
                  className={'check-set ' + (set.done ? 'checked' : '')}
                  aria-label={
                    (set.done ? 'Unmark' : 'Complete') + ' set ' + (i + 1)
                  }
                  aria-pressed={!!set.done}
                  onClick={() =>
                    update((s) => {
                      const row = s.active.entries[index].sets[i]
                      row.done = !row.done
                      if (row.done)
                        s.active.restUntil =
                          Date.now() + (entry.target?.rest || 90) * 1000
                    })
                  }
                >
                  <Check size={19} />
                </button>
              </div>
            ))}
          </div>
          <div className={'rest-timer ' + (rest ? 'running' : '')}>
            <Clock3 size={22} />
            <div>
              <span>{rest ? 'REST & RESET' : 'READY FOR YOUR NEXT SET'}</span>
              <strong>
                {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}
              </strong>
            </div>
            {rest > 0 && (
              <button
                onClick={() =>
                  update((s) => {
                    s.active.restUntil = 0
                  })
                }
              >
                Skip
              </button>
            )}
          </div>
          <button className="outline wide" onClick={() => setSwap(true)}>
            Swap exercise <ArrowRight size={17} />
          </button>
          {a.entries[index + 1] && (
            <div className="up-next">
              <span className="eyebrow">UP NEXT</span>
              <strong>{title(EXIDX[a.entries[index + 1].id]?.n)}</strong>
              <span>{a.entries[index + 1].sets.length} sets</span>
            </div>
          )}
        </section>
      </div>
      {swap && (
        <Modal title="Find an alternative" onClose={() => setSwap(false)}>
          <div className="modal-body">
            <p>
              Same target muscle. Choose equipment available to you. Your logged
              sets stay in the session.
            </p>
            <select
              aria-label="Alternative equipment"
              value={swapEq}
              onChange={(e) => setSwapEq(e.target.value)}
            >
              <option value="">Any equipment</option>
              {[
                ...new Set(EXDB.filter((e) => e.tg === ex.tg).map((e) => e.eq)),
              ].map((eq) => (
                <option key={eq}>{eq}</option>
              ))}
            </select>
            {EXDB.filter(
              (e) =>
                e.id !== entry.id &&
                e.tg === ex.tg &&
                (!swapEq || e.eq === swapEq),
            )
              .slice(0, 30)
              .map((e) => (
                <button
                  className="alternative"
                  key={e.id}
                  onClick={() => {
                    update((s) => {
                      const old = s.active.entries[index],
                        replacement = {
                          id: e.id,
                          ...buildSessionEntry(
                            s,
                            e.id,
                            { ...old.target, id: e.id, weight: 0 },
                            null,
                            null,
                          ),
                        }
                      if (old.sets.some((x) => x.done)) {
                        s.active.entries.splice(index + 1, 0, replacement)
                        s.active.cur = index + 1
                      } else s.active.entries[index] = replacement
                    })
                    setSwap(false)
                    onNotice(
                      'Alternative ready. Set the load for this movement before you begin.',
                    )
                  }}
                >
                  {title(e.n)}
                  <small>{e.eq}</small>
                </button>
              ))}
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title="Finish this session?" onClose={() => setConfirm(false)}>
          <div className="modal-body">
            <p>
              {done} of {total} sets completed. Only logged sets will be saved.
            </p>
            <button className="primary wide" onClick={finish}>
              Save workout <CheckCircle2 size={18} />
            </button>
            <button className="outline wide" onClick={() => setConfirm(false)}>
              Keep training
            </button>
            <button
              className="danger-link"
              onClick={() => {
                update((s) => {
                  s.active = null
                })
                setConfirm(false)
                nav('/')
              }}
            >
              Discard this unfinished session
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
function Progress() {
  const S = useStore((s) => s.S),
    nav = useNavigate(),
    weeks = Array.from({ length: 8 }, (_, i) => {
      const end = new Date()
      end.setDate(end.getDate() - (7 - i) * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 7)
      return {
        label: end.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        count: S.workouts.filter((w) => {
          const d = new Date(w.d + 'T12:00:00')
          return d > start && d <= end
        }).length,
      }
    }),
    max = Math.max(1, ...weeks.map((w) => w.count)),
    minutes = Math.round(
      S.workouts.reduce((n, w) => n + (w.end - w.start) / 60000, 0),
    )
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">LOOK HOW FAR YOU'VE COME</p>
          <h1>Your effort adds up.</h1>
          <p>Real sessions. Real progress. Your own pace.</p>
        </div>
      </div>
      <div className="metric-row">
        {[
          [Activity, S.workouts.length, 'Workouts completed'],
          [Clock3, minutes, 'Minutes invested'],
          [
            TrendingUp,
            S.workouts.reduce((n, w) => n + (w.prs?.length || 0), 0),
            'Personal records',
          ],
        ].map(([Icon, n, label]) => (
          <section className="metric" key={label}>
            <div className="metric-icon">
              <Icon size={21} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{n}</strong>
            </div>
          </section>
        ))}
      </div>
      <section className="chart-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">CONSISTENCY OVER PERFECTION</p>
            <h2>Your training rhythm</h2>
          </div>
          <span className="tag pale">LAST 8 WEEKS</span>
        </div>
        <div
          className="bar-chart"
          role="img"
          aria-label={weeks
            .map((w) => `${w.label}: ${w.count} workouts`)
            .join(', ')}
        >
          {weeks.map((w, i) => (
            <div key={i}>
              <span>{w.count}</span>
              <i
                style={{ height: `${Math.max(3, (w.count / max) * 150)}px` }}
              />
              <small>{w.label}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="history-panel">
        <div className="section-head">
          <h2>Session history</h2>
          <span className="muted-copy">Your work, recorded.</span>
        </div>
        {!S.workouts.length ? (
          <Empty
            icon={Activity}
            title="Your story starts with one session"
            action={
              <button className="primary" onClick={() => nav('/plans')}>
                Find your plan <ArrowRight size={18} />
              </button>
            }
          >
            Finish a workout to start building your progress.
          </Empty>
        ) : (
          S.workouts
            .slice()
            .reverse()
            .map((w) => (
              <details className="history-row" key={w.id}>
                <summary>
                  <span className="history-icon">
                    <Check size={22} />
                  </span>
                  <span>
                    <strong>{w.name}</strong>
                    <small>
                      {stampDate(w.d)} ·{' '}
                      {Math.max(1, Math.round((w.end - w.start) / 60000))} min
                    </small>
                  </span>
                  <span>
                    {w.entries.reduce(
                      (n, e) => n + e.sets.filter((s) => s.done).length,
                      0,
                    )}{' '}
                    sets
                  </span>
                  <ChevronRight size={18} />
                </summary>
                <div>
                  {w.entries.map((e, i) => (
                    <p key={i}>
                      <strong>{title(EXIDX[e.id]?.n)}</strong> ·{' '}
                      {e.sets
                        .filter((s) => s.done)
                        .map(
                          (s) =>
                            `${s.w || 0} ${S.unit} × ${s.r || s.sec || 0}${s.sec ? ' sec' : ''}`,
                        )
                        .join(' / ')}
                    </p>
                  ))}
                </div>
              </details>
            ))
        )}
      </section>
      <section className="history-panel">
        <h2>Personal baselines</h2>
        {Object.keys(S.exWeights || {}).length ? (
          Object.entries(S.exWeights).map(([id, best]) => (
            <div className="baseline" key={id}>
              <span>{title(EXIDX[id]?.n)}</span>
              <strong>
                {best.w} {S.unit}
              </strong>
              <span>{stampDate(best.d)}</span>
            </div>
          ))
        ) : (
          <p className="muted-copy">
            Your first logged loads establish your baseline. Future sessions
            build from your own history.
          </p>
        )}
      </section>
    </>
  )
}
function Profile({ user, ready, onNotice }) {
  const S = useStore((s) => s.S),
    sync = useStore((s) => s.sync),
    [session, setSession] = useState(null),
    [list, setList] = useState([]),
    [signup, setSignup] = useState(true),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [newName, setNewName] = useState(''),
    [age, setAge] = useState('adult'),
    [backup, setBackup] = useState(null)
  useEffect(() => {
    if (!supabase) return
    account()
      .then((u) => {
        setSession(u)
        return profiles()
      })
      .then(setList)
      .catch(() => {})
  }, [user, ready])
  const auth = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (!configured)
        throw Error(
          'Start local Supabase and run the environment setup script.',
        )
      const result = signup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
      if (result.error) throw result.error
      if (!result.data.session) {
        onNotice('Check the local email inbox to confirm your account.')
        return
      }
      const existing = await profiles()
      if (!existing.length) await createProfile(name || email.split('@')[0])
      location.reload()
    } catch (e) {
      onNotice(e)
    } finally {
      setBusy(false)
    }
  }
  const add = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const p = await createProfile(newName, age)
      setList(await profiles())
      setNewName('')
      onNotice('Training profile created. Select it below to begin.')
      if (!user) {
        await selectProfile(p.id)
        location.reload()
      }
    } catch (e) {
      onNotice(e)
    } finally {
      setBusy(false)
    }
  }
  const switchTo = async (id) => {
    setBusy(true)
    try {
      await useStore.getState().pushState()
      if (useStore.getState().sync.pending)
        throw Error(
          'Sync or export your pending changes before switching profiles.',
        )
      await selectProfile(id)
      location.reload()
    } catch (e) {
      onNotice(e)
      setBusy(false)
    }
  }
  const readFile = async (e) => {
    try {
      const file = e.target.files[0]
      if (!file) return
      if (file.size > 10000000)
        throw Error('Choose a backup smaller than 10 MB.')
      const text = await file.text()
      if (file.name.endsWith('.csv')) {
        const parsed = parseImport(text, { unit: S.unit, customEx: S.customEx })
        const next = structuredClone(S)
        mergeImport(next, parsed)
        setBackup(next)
      } else setBackup(readJSON(text))
    } catch (e) {
      onNotice(e)
    }
    e.target.value = ''
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">YOUR SPACE. YOUR PACE.</p>
          <h1>{user ? 'Make it yours.' : 'Your next chapter starts here.'}</h1>
          <p>
            {user
              ? 'Manage your training profiles and keep your progress with you.'
              : 'Create your adult account to save workouts and manage training profiles.'}
          </p>
        </div>
      </div>
      {!user && !session ? (
        <div className="auth-grid">
          <section className="auth-story">
            <SportArt sport="general" />
            <div>
              <span className="tag glass">TRAIN WITH INTENTION</span>
              <h2>
                More movement.
                <br />
                More possibility.
              </h2>
              <p>
                One account for your own training and the young athletes you
                supervise.
              </p>
            </div>
          </section>
          <form className="auth-form" onSubmit={auth}>
            <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
            <p className="muted-copy">Adult account · local Supabase</p>
            {signup && (
              <label>
                Your name
                <input
                  required
                  maxLength="60"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength="8"
                required
                autoComplete={signup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {signup && (
              <label className="checkbox-label">
                <input type="checkbox" required />I am an adult managing my own
                or supervised youth training.
              </label>
            )}
            <button disabled={busy} className="primary wide">
              {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setSignup(!signup)}
            >
              {signup
                ? 'Already have an account? Sign in'
                : 'New here? Create an account'}
            </button>
          </form>
        </div>
      ) : (
        <div className="profile-grid">
          <section className="settings-card">
            <div className="section-head">
              <h2>Training profiles</h2>
              <UsersRound size={21} />
            </div>
            <p>Each athlete has their own history, plans and progress.</p>
            {list.map((p) => (
              <button
                disabled={busy}
                className={'profile-row ' + (p.id === user?.id ? 'active' : '')}
                key={p.id}
                onClick={() => p.id !== user?.id && switchTo(p.id)}
              >
                <span className="avatar">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.age_band === 'adult'
                      ? 'Adult'
                      : `Youth ${p.age_band} · adult managed`}
                  </small>
                </span>
                {p.id === user?.id ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            ))}
            <details className="add-profile">
              <summary>
                <Plus size={17} /> Add training profile
              </summary>
              <form onSubmit={add}>
                <label>
                  Display name
                  <input
                    required
                    maxLength="60"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </label>
                <label>
                  Age band
                  <select value={age} onChange={(e) => setAge(e.target.value)}>
                    <option value="adult">Adult</option>
                    <option value="13-15">Youth · 13–15</option>
                    <option value="16-17">Youth · 16–17</option>
                  </select>
                </label>
                <button disabled={busy} className="primary">
                  Create profile
                </button>
              </form>
            </details>
          </section>
          <section className="settings-card">
            <h2>Your data belongs to you.</h2>
            <p>
              Back up your training, bring your history with you, and choose how
              you measure progress.
            </p>
            <label>
              Weight units
              <select
                value={S.unit}
                onChange={(e) => useStore.getState().setUnit(e.target.value)}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </label>
            <button
              className="outline wide"
              onClick={() => download('workout-backup.json', exportJSON(S))}
            >
              <ArrowDownToLine size={18} />
              Export full JSON backup
            </button>
            <button
              className="outline wide"
              onClick={() => {
                download('workout-history.csv', workoutsCSV(S), 'text/csv')
              }}
            >
              <ArrowDownToLine size={18} />
              Export workout CSV
            </button>
            <label className="file-label">
              Import JSON or workout CSV
              <input type="file" accept=".json,.csv" onChange={readFile} />
            </label>
            <p className="sync-label">
              {sync.pending
                ? 'Pending changes are saved on this device.'
                : sync.offline
                  ? 'Offline. Reconnect to sync.'
                  : 'Connected to local Supabase.'}
            </p>
            <button
              className="text-link"
              onClick={async () => {
                await useStore.getState().pushState()
                onNotice(
                  useStore.getState().sync.pending
                    ? 'Still waiting for a connection.'
                    : 'Your changes are synced.',
                )
              }}
            >
              Sync now
            </button>
          </section>
          <section className="settings-card">
            <h2>Account</h2>
            <p>{session?.email}</p>
            <button
              className="outline"
              onClick={async () => {
                const result = await useStore.getState().signOut()
                if (result.owed) {
                  onNotice(
                    'Your changes are still pending. Export or sync before signing out.',
                  )
                  return
                }
                location.reload()
              }}
            >
              <LogOut size={17} />
              Sign out
            </button>
          </section>
        </div>
      )}
      <section className="about-panel">
        <Activity size={24} />
        <div>
          <h3>Workout, built on openGym.</h3>
          <p>
            An open-source fork with original visual design and local Supabase
            storage. Exercise media and sports programs remain in development.
          </p>
          <a href="/workout/source.zip">Download this version’s source</a>
          <span> · </span>
          <a
            href="https://github.com/DuarteSantos8/openGym"
            target="_blank"
            rel="noreferrer"
          >
            Upstream project
          </a>
          <span> · </span>
          <a href="/workout/LICENSE.txt">Code license</a>
          <span> · </span>
          <a href="/workout/illustrations/NOTICE.txt">Illustration credits</a>
        </div>
      </section>
      {backup && (
        <Modal
          title="Merge your training backup?"
          onClose={() => setBackup(null)}
        >
          <div className="modal-body">
            <p>
              {backup.workouts.length} workouts and {backup.routines.length}{' '}
              routines. Existing history will be merged using openGym’s
              conflict-aware merge rules.
            </p>
            <button
              className="primary wide"
              onClick={() => {
                try {
                  const current = useStore.getState().S
                  useStore.getState().importBackup(backup, {
                    mergeWith: { state: current, local: true },
                  })
                  setBackup(null)
                  onNotice('Backup imported and queued for sync.')
                } catch (e) {
                  onNotice(e)
                }
              }}
            >
              Import and merge
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
export default App
