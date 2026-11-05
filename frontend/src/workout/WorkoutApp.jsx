import { matchesExerciseSearch } from './exercise-search.js'
import { deleteMyWorkout } from './my-workouts.js'
import SwapPicker from './SwapPicker.jsx'
import { programSessionMatches } from './plan-management.js'
import MultiFilter from './MultiFilter.jsx'
import { matchesSelections } from './library-filters.js'
import ManagePlans from './ManagePlans.jsx'
import PhotoStory from './PhotoStory.jsx'
import GoalRing from './GoalRing.jsx'
import CustomWorkout from './CustomWorkout.jsx'
import { progressView } from './progress-view.js'
import { editCompletedSession } from '../lib/session-edit.js'
import { isWarmup } from './analysis.js'
import SavedSessionEditor from './SavedSessionEditor.jsx'
import AdvancedSetRow from './AdvancedSetRow.jsx'
import { isSideSet, modeForSet, hasCompletedWork } from '../lib/workout-model.js'
import { setWarmupFlag } from './training.js'
import { sessionSwapOptions, applySessionSwap } from './session-swaps.js'
import builderInstructions from '../instr/en.js'
import BodyGoal from './BodyGoal.jsx'
import { homeWeek, hasWeeklyPlan, writeWeightGoal } from './home-insights.js'
import LocalSteps from './LocalSteps.jsx'
import SavedWorkouts from './SavedWorkouts.jsx'
import TrainingGoals from './TrainingGoals.jsx'
import WorkoutTimers from './WorkoutTimers.jsx'
import { completedRoutine, startScheduled } from './session-tools.js'
import WorkoutLog from './WorkoutLog.jsx'
import WorkoutBuilder from './WorkoutBuilder.jsx'
import ExerciseProgress from './ExerciseProgress.jsx'
import LocalCoach from './LocalCoach.jsx'
import TrainingAnalysis from './TrainingAnalysis.jsx'
import TrainingGuidance from './TrainingGuidance.jsx'
import Intervals from './Intervals.jsx'
import ProgressPhotos from './ProgressPhotos.jsx'
import DuplicateExerciseMerge from './DuplicateExerciseMerge.jsx'
import { hideBoot } from '../lib/boot.js'
import CheckIns from './CheckIns.jsx'
import PilotMedia, { useIllustrationIndex } from './PilotMedia.jsx'
import { approvedVariant } from './pilot-media.js'
import studies from './illustrations.json'
import { movementOf, difficultyOf } from './classification.js'
import {
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
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
  Sun,
  Moon,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useStore } from '../store/useStore.js'
import { setSystemBarsLight } from '../lib/system-bars.js'
import { EXDB, EXIDX } from '../lib/exercises.js'
const sessionCatalog = EXDB.map((e) => ({ ...e, inst: builderInstructions[e.id] || [] }))
import { todayISO } from '../lib/format.js'
import { mergeStates } from '../lib/sync-merge.js'
import { buildSessionEntry } from '../lib/session-start.js'
import { parseImport, mergeImport } from '../lib/import-csv.js'
import { workoutsCSV } from '../lib/export-csv.js'
import { bestWeightFor, lastEntryFor, workoutVolume } from '../lib/history.js'
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
  leaveFinishedSession,
  trainedMs,
  exportJSON,
  readJSON,
} from './training.js'
import programs from './programs.json'
const Anatomy = lazy(() => import('./Illustration.jsx'))
const motions = Object.fromEntries(
  Object.entries(studies).map(([id, m]) => [id, m.motion]),
)
const tabs = [
  ['/', 'Home', HomeIcon],
  ['/plans', 'Train', Dumbbell],
  ['/exercises', 'Exercise library', Dumbbell],
  ['/progress', 'Your progress', TrendingUp],
  ['/profile', 'Your profile', UserRound],
]
const sports = [
  ['all', 'All activities'],
  ['push', 'Push'], ['pull', 'Pull'],
  ...new Map(programs.filter(p=>!['push','pull'].includes(p.sport)).map((p) => [p.sport, p.label])),
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
function BrandLogo() {
  return ['dark', 'light'].map((theme) => (
    <picture key={theme} className={`brand-logo logo-${theme}`}>
      <source
        media="(min-width: 761px) and (max-width: 1000px)"
        srcSet={`/workout/brand/seal-${theme}.webp`}
      />
      <img src={`/workout/brand/wordmark-${theme}.webp`} alt="" />
    </picture>
  ))
}

function ThemeButton() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('workout.appearance') === 'light'
        ? 'light'
        : 'dark'
    } catch {
      return 'dark'
    }
  })
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode
    void setSystemBarsLight(mode === 'light')
    document.querySelector('link[rel="icon"]').href =
      `/workout/brand/seal-${mode}.webp`
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', mode === 'light' ? '#f6f7f0' : '#090c0a')
  }, [mode])

  const next = mode === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} mode`
  function toggle() {
    setMode(next)
    try {
      localStorage.setItem('workout.appearance', next)
    } catch {
      // The current session still supports both modes if storage is unavailable.
    }
  }
  return (
    <button
      className="appearance-button"
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {next === 'light' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

function App() {
  const ready = useStore((s) => s.ready),
    user = useStore((s) => s.user),
    active = useStore((s) => s.S.active),
    sync = useStore((s) => s.sync),
    [notice, setNotice] = useState(''),
    [detail, setDetail] = useState(null),
    nav = useNavigate(),
    location = useLocation()
  useEffect(() => {
    hideBoot()
    useStore.getState().boot()
  }, [])
  useEffect(() => {
    if (location.hash)
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      )
    else window.scrollTo(0, 0)
  }, [location.pathname, location.search, location.hash])
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
        <NavLink to="/" className="brand" aria-label="Sets & Strength home">
          <BrandLogo />
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
          <NavLink
            to="/"
            className="mobile-brand"
            aria-label="Sets & Strength home"
          >
            <BrandLogo />
          </NavLink>
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
            <ThemeButton />
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
          {active && location.pathname !== '/workout' && (
            <NavLink className="resume-strip" to="/workout">
              <Play size={18} />
              <span>
                <small>WORKOUT IN PROGRESS</small>
                <strong>{active.name}</strong>
              </span>
              Resume <ArrowRight size={16} />
            </NavLink>
          )}
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
            <Route
              path="/progress"
              element={<Progress requireUser={requireUser} onNotice={message} />}
            />
            <Route path="/create-workout" element={<CustomWorkout canSave={!!user} requireUser={requireUser} onNotice={message} />} />
            <Route path="/builder" element={<WorkoutBuilder requireUser={requireUser} notice={message} />} />
            <Route path="/coach" element={<LocalCoach />} />
            <Route path="/exercise-progress" element={<ExerciseProgress />} />
            <Route path="/merge-exercises" element={<DuplicateExerciseMerge />} />
            <Route path="/intervals" element={<Intervals />} />
            {import.meta.env.VITE_MOBILE === '1' && <Route path="/progress-photos" element={<ProgressPhotos />} />}
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
              {['Home', 'Train', 'Library', 'Progress', 'Profile'][i]}
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
          key={detail}
          id={detail}
          onClose={() => setDetail(null)}
          onNotice={message}
          requireUser={requireUser}
        />
      )}
    </div>
  )
}
function GettingStarted({ S, nav }) {
  if (S.gettingStartedDismissed) return null
  const items = [
    ['Plan a workout week', hasWeeklyPlan(S), '/plans'],
    ['Log your first weigh-in', !!S.bodyweight.length, '/progress?view=body'],
    ['Complete a workout', !!S.workouts.length, '/plans'],
    ['Ask your training guide', !!S.coachInteractions, '/coach'],
  ]
  if (items.every(([, done]) => done)) return null
  return <section className="history-panel getting-started"><div className="section-head"><div><p className="eyebrow">A FEW FIRST STEPS</p><h2>Getting started</h2></div><button className="text-link" onClick={() => update((s) => { s.gettingStartedDismissed = true })}>Dismiss</button></div><ul>{items.map(([label, done, path]) => <li key={label}><span aria-label={done ? 'Complete' : 'Not complete'}>{done ? '✓' : '○'}</span><button className="text-link" disabled={done} onClick={() => nav(path)}>{label}</button></li>)}</ul></section>
}

function NutritionTargets({ S }) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(null)
  const target = draft || S.nutritionTargets || {}
  const fields = [['calories', 'Calories', 'kcal'], ['protein', 'Protein', 'g'], ['carbs', 'Carbohydrates', 'g'], ['fat', 'Fat', 'g']]
  return <section className="history-panel nutrition-targets"><div className="section-head"><div><p className="eyebrow">YOUR DAILY GUIDE</p><h2>Nutrition targets</h2></div><button className="outline compact" onClick={() => { setEditing(!editing); setDraft(null) }}>{editing ? 'Cancel' : 'Edit targets'}</button></div><p className="muted-copy">Targets only. Food and meal logging are not part of this version.</p>{editing ? <form className="builder-fields" onSubmit={(e) => { e.preventDefault(); update((s) => { s.nutritionTargets = Object.fromEntries(fields.map(([k]) => [k, Number(target[k]) || 0])) }); setEditing(false); setDraft(null) }}>{fields.map(([k, label, unit]) => <label key={k}>{label} ({unit})<input type="number" min="0" step="1" value={target[k] ?? ''} onChange={(e) => setDraft({ ...target, [k]: e.target.value })} /></label>)}<button className="lime" type="submit">Save targets</button></form> : <div className="target-grid">{fields.map(([k, label, unit]) => <div className="metric" key={k}><span>{label}</span><strong>{S.nutritionTargets?.[k] == null ? 'Not set' : `${S.nutritionTargets[k]} ${unit}`}</strong></div>)}</div>}</section>
}

function Home({ user, onDetail, requireUser }) {
  const S = useStore((s) => s.S),
    nav = useNavigate(),
    today = todayISO(),
    completed = new Set(
      S.workouts.flatMap((w) => w.routineIds || [w.routineId]),
    ),
    upcoming = Object.keys(S.dayPlan)
      .sort()
      .filter((d) => d >= today)
      .flatMap((date) =>
        (S.dayPlan[date] || [])
          .filter((id) => !completed.has(id))
          .map((id) => ({ date, r: S.routines.find((r) => r.id === id) })),
      )
      .find((x) => x.r),
    next = upcoming?.r || S.routines.find((r) => !r.cancelledAt && !r.programId),
    enrolled = programs.filter((p) =>
      S.routines.some((r) => !r.cancelledAt && r.programId === p.id),
    ),
    weekly = homeWeek(S, today),
    week = weekly.workouts,
    minutes = Math.round(
      week.reduce((n, w) => n + Math.max(0, trainedMs(w) / 60000), 0),
    )
  const start = () => {
    if (!next && !S.active) {
      nav('/plans')
      return
    }
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
      <div className="page-title home-heading">
        <div>
          <h1>
            {user ? (
              `Let's move, ${user.name.split(' ')[0]}.`
            ) : (
'Your day'
            )}
          </h1>
          <p>
            {enrolled.length
              ? 'Your plans: ' + enrolled.map((p) => p.title).join(' · ')
              : 'Small moves. Stronger you.'}
          </p>
        </div>
        <button className="outline compact" onClick={() => nav('/plans?view=schedule')}>
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
                  : 'YOUR DAILY MOMENTUM'}
            </span>
            <h2>
              {S.active
                ? 'KEEP YOUR\nMOMENTUM.'
                : next
                  ? 'READY. SET.\nGET STRONGER.'
                  : 'FULL BODY.\nFULL FOCUS.'}
            </h2>
            <p>
              {S.active?.name ||
                next?.name ||
                enrolled.map((p) => p.title).join(' · ') ||
                'Your sport. Your pace. A plan that moves with you.'}
            </p>
            <div className="hero-meta">
              <span>
                <Dumbbell size={16} />
                {next
                  ? `${next.ex.length} exercises`
                  : `${sports.length - 1} training categories`}
              </span>
              <span>
                <Clock3 size={16} />
                {upcoming ? stampDate(upcoming.date) : '4-week programs'}
              </span>
            </div>
            <button className="lime" onClick={start}>
              {S.active
                ? 'Continue workout'
                : next
                  ? 'Start workout'
                  : enrolled.length
                    ? 'View my plans'
                    : 'Find my plan'}
              <ArrowUpRight size={20} />
            </button>
          </div>
          <div className="hero-athlete" aria-hidden="true" />
          <span className="hero-number">01 / YOUR JOURNEY</span>
        </section>
        <section className="week-card">
          <div className="section-head">
            <h3>Your rhythm</h3>
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
                  strokeDasharray: `${Math.min(week.length / weekly.target, 1) * 320} 320`,
                }}
              />
            </svg>
            <div>
              <strong>
                {week.length}
                <small>/ {weekly.target}</small>
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
      <div className="builder-actions home-shortcuts" aria-label="Training shortcuts">
        <button className="outline" onClick={() => nav('/builder')}><Sparkles size={17} /> Build a workout</button>
        <button className="outline" onClick={() => nav('/coach')}><Activity size={17} /> Ask your training guide</button>
        <button className="outline" onClick={() => nav('/exercise-progress')}><TrendingUp size={17} /> Exercise progress</button>
      </div>
      <GettingStarted S={S} nav={nav} />
      <details className="layout-disclosure"><summary>Daily nutrition targets</summary><NutritionTargets S={S} /></details>
      <details className="layout-disclosure"><summary>Body goal</summary><BodyGoal S={S} onSave={(value) => { if (!requireUser()) return false; update((s) => writeWeightGoal(s, value)) }} /></details>
      <details className="layout-disclosure"><summary>Daily steps</summary><LocalSteps key={user?.id || 'guest'} /></details>
      <div className="metric-row">
        {[
          [Flame, week.length, 'Workouts this week', ''],
          [Clock3, minutes, 'Minutes trained', ''],
          [
            TrendingUp,
            S.workouts.reduce((n, w) => n + (w.prs?.length || 0), 0),
            'Personal records',
            '',
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
          <h2>Explore training plans</h2>
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
          <h2>Learn a movement</h2>
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
    [editingMyWorkout, setEditingMyWorkout] = useState(null),
    [planLimit, setPlanLimit] = useState(6),
    [sport, setSport] = useState(
      new URLSearchParams(location.search).get('sport') || 'all',
    ),
    [track, setTrack] = useState('beginner'),
    [equipment, setEquipment] = useState('all'),
    [selected, setSelected] = useState(null),
    [event, setEvent] = useState(null),
    [moveDate, setMoveDate] = useState(''),
    [playDate, setPlayDate] = useState(todayISO()),
    [agenda, setAgenda] = useState(todayISO()),
    [start, setStart] = useState(todayISO()),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    )
  const requestedView = new URLSearchParams(location.search).get('view')
  const trainView = ['workouts', 'schedule'].includes(requestedView) ? requestedView : 'explore'
  const showTrainView = view => { const params = new URLSearchParams(location.search); params.set('view',view); nav({pathname:'/plans',search:params.toString()}) }
  useEffect(() => {
    if (user?.age_band === '13-15') setTrack('youth-13')
    else if (user?.age_band === '16-17') setTrack('youth-16')
  }, [user?.age_band])
  useEffect(() => { setPlanLimit(6) }, [sport, track, equipment])
  const enrolled = programs.filter((p) =>
    S.routines.some((r) => !r.cancelledAt && r.programId === p.id),
  )
  const openEvent = (r, date) => {
    setEvent({ r, date })
    setMoveDate(date)
  }
  const launch = (r, date) => {
    if (!requireUser()) return
    try {
      update((s) => startScheduled(s, r, date))
      setSelected(null)
      setEvent(null)
      nav('/workout')
    } catch (e) {
      onNotice(e)
    }
  }
  const monthKey =
    month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0')
  const agendaDate = agenda.startsWith(monthKey)
    ? agenda
    : Object.keys(S.dayPlan)
        .sort()
        .find((d) => d.startsWith(monthKey) && S.dayPlan[d]?.length) ||
      monthKey + '-01'
  const list = programs.filter(
    (p) =>
      (sport === 'all' || p.sport === sport) &&
      p.track === track &&
      (equipment === 'all' ||
        p.weeks.every((w) =>
          w.sessions.every((s) =>
            s.sections
              .filter((x) => x.name === 'Main')
              .every((x) =>
                x.exercises.every((e) => {
                  const eq = EXIDX[e.id]?.eq
                  return (
                    eq === 'body weight' ||
                    (equipment === 'dumbbells' && eq === 'dumbbell') ||
                    (equipment === 'bands' &&
                      ['band', 'resistance band'].includes(eq))
                  )
                }),
              ),
          ),
        )),
  )
  const preferred = {
    strength: ['dumbbells', 'general'],
    muscle: ['dumbbells', 'bodyweight'],
    weight: ['cardio', 'general'],
    endurance: ['cardio', 'running'],
    mobility: ['mobility', 'core'],
    fitness: ['general', 'bodyweight'],
  }
  list.sort(
    (a, b) =>
      Number((preferred[S.trainingGoals?.focus] || []).includes(b.sport)) -
      Number((preferred[S.trainingGoals?.focus] || []).includes(a.sport)),
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
    showTrainView('schedule')
    setAgenda(start)
    setMonth(new Date(start.slice(0, 7) + '-01T12:00:00'))
    onNotice(
      'Your four-week schedule is ready. You can move any session below.',
    )
  }
  const calendar = (
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
              <button
                type="button"
                key={iso}
                className={
                  'month-cell' +
                  (iso === todayISO() ? ' today' : '') +
                  (iso === agendaDate ? ' chosen' : '')
                }
                aria-label={iso + ', ' + routines.length + ' workouts'}
                onClick={() => {
                  setAgenda(iso)
                  if (routines.length === 1) openEvent(routines[0], iso)
                }}
              >
                {i + 1}
                {routines.length > 0 &&
                  routines.every((r) => completedRoutine(S, r.id)) && (
                    <Check size={10} aria-label="Completed" />
                  )}
                <span>
                  {routines.slice(0, 3).map((r) => (
                    <i
                      className={
                        completedRoutine(S, r.id) ? 'completed-dot' : ''
                      }
                      key={r.id}
                    />
                  ))}
                </span>
              </button>
            )
          },
        )}
      </div>
      <div className="day-agenda">
        <p className="eyebrow">{stampDate(agendaDate)} / SESSIONS</p>
        {(S.dayPlan[agendaDate] || [])
          .map((id) => S.routines.find((r) => r.id === id))
          .filter(Boolean)
          .map((r) => (
            <button
              className="agenda-row"
              key={r.id}
              onClick={() => openEvent(r, agendaDate)}
            >
              <Dumbbell size={19} />
              <strong>{r.name}</strong>
              {completedRoutine(S, r.id) && (
                <span className="completed-label">Completed!</span>
              )}
              <ChevronRight size={18} />
            </button>
          ))}
        {!S.dayPlan[agendaDate]?.length && (
          <>
            <p className="muted-copy">No workout scheduled for this day.</p>
            {(() => {
              const next = Object.keys(S.dayPlan)
                .sort()
                .flatMap((d) =>
                  (S.dayPlan[d] || []).map((id) =>
                    S.routines.find((r) => r.id === id),
                  ),
                )
                .find((r) => r && !completedRoutine(S, r.id))
              return next ? (
                <button
                  className="agenda-row"
                  onClick={() => launch(next, agendaDate)}
                >
                  <Play size={17} />
                  <strong>Move next workout here & start · {next.name}</strong>
                </button>
              ) : null
            })()}
          </>
        )}
      </div>
      {!S.routines.length && (
        <p className="muted-copy">
          Choose a program to fill your calendar. Your schedule stays editable.
        </p>
      )}
    </section>
  )
  return (
    <>
      <div className="page-title">
        <div>
<h1>Train</h1>
          <p>Find a plan. Save your favorites. Make time to train.</p>
        </div>
        <span className="tag pale">{programs.length} STARTER PROGRAMS</span>
      </div>
      <nav className="train-view-tabs" aria-label="Training views">
        {[['explore','Explore plans'],['workouts','My Workouts'],['schedule','Schedule']].map(([view,label])=><button key={view} aria-current={trainView===view?'page':undefined} className={trainView===view?'selected':''} onClick={()=>showTrainView(view)}>{label}</button>)}
      </nav>
      {trainView==='workouts' && <>
      <SavedWorkouts routines={S.routines} Modal={Modal} onAdd={() => nav('/create-workout')} onBuild={() => nav('/builder')}
        onOpen={routine => openEvent(routine, todayISO())}
        onStart={routine => {if(!requireUser())return;try{update(s => startSession(s,routine));nav('/workout')}catch(error){onNotice(error.message)}}}
        onEdit={routine => {if(requireUser())setEditingMyWorkout(routine)}}
        onDelete={routine => {if(!requireUser())return;update(s => deleteMyWorkout(s,routine.id));onNotice('Workout deleted. Your training history is preserved.')}}/>
      </>}
      {editingMyWorkout && <ManagePlans key={editingMyWorkout.id} initialWorkout={editingMyWorkout} onDone={() => setEditingMyWorkout(null)} Modal={Modal} requireUser={requireUser} onNotice={onNotice}/>}

      {trainView==='schedule' && <>
      <div className="creation-strip"><button className="outline" onClick={()=>nav('/create-workout?type=plan')}><Plus size={16}/> Create a plan</button></div>
      <div id="manage-plans"/><ManagePlans Modal={Modal} requireUser={requireUser} onNotice={onNotice}/>
      {enrolled.length > 0 && (
        <section className="saved-plans">
          <p className="eyebrow">YOUR PLANS</p>
          {enrolled.map((p) => (
            <button
              className="agenda-row"
              key={p.id}
              onClick={() => setSelected(p)}
            >
              <Layers3 size={20} />
              <strong>{p.title}</strong>
              <span>{p.level}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
      )}
      {calendar}
      <details className="layout-disclosure"><summary>Training goals</summary><TrainingGoals S={S} requireUser={requireUser} /></details>
      </>}
      {trainView==='explore' && <>
      <div className="section-head train-explore-heading"><h2>Find your next plan</h2><button className="text-link" onClick={()=>nav('/builder')}>Build my own <ArrowRight size={16}/></button></div>
      <label className="equipment-filter">
        Available equipment
        <select
          aria-label="Available equipment"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          <option value="all">Full gym / any equipment</option>
          <option value="bodyweight">Home / no equipment</option>
          <option value="dumbbells">Hotel / bodyweight & dumbbells</option>
          <option value="bands">Home / bodyweight & bands</option>
        </select>
      </label>
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
      {!list.length && (
        <p className="muted-copy">
          No plan for this combination yet. Choose another activity or track.
        </p>
      )}
      <div className="section-head spacious">
        <h2>Explore plans</h2>
        <NavLink className="text-link" to="/exercises">
          Exercise library <ArrowRight size={16} />
        </NavLink>
      </div>
      <div className="plans-grid">
        {list.slice(0, planLimit).map((p) => (
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
      {planLimit < list.length && <button className="outline load-more" onClick={() => setPlanLimit((n) => n + 6)}>More plans <Plus size={17} /></button>}
      </>}
      {event && (
        <Modal title={event.r.name} onClose={() => setEvent(null)}>
          <div className="modal-body session-preview">
            <div className="session-art">
              <PilotMedia
                preview
                id={
                  (
                    event.r.ex.find((e) => e.section === 'Main') ||
                    event.r.ex[0]
                  )?.id
                }
              >
                <img src="/workout/intent-hero.png" alt="" />
              </PilotMedia>
            </div>
            <p className="eyebrow">
              {stampDate(event.date)} / {event.r.ex.length} exercises
            </p>
            {completedRoutine(S, event.r.id) ? (
              <p className="completed-label">
                <CheckCircle2 size={19} /> Completed!{' '}
                <NavLink to="/progress#workout-log">View workout log</NavLink>
              </p>
            ) : (
              <button
                className="lime wide"
                onClick={() => launch(event.r, todayISO())}
              >
                <Play size={18} />
                {[S.active, ...(S.active?.otherSessions || [])].some((a) =>
                  a?.routineIds?.includes(event.r.id),
                )
                  ? 'Resume workout'
                  : event.date === todayISO()
                    ? 'Start workout'
                    : 'Move to today & start'}
              </button>
            )}
            {!completedRoutine(S, event.r.id) && (
              <>
                <label>
                  Move to another day
                  <input
                    type="date"
                    value={moveDate}
                    onChange={(e) => setMoveDate(e.target.value)}
                  />
                </label>
                <button
                  className="outline wide"
                  disabled={!moveDate || moveDate === event.date}
                  onClick={() => {
                    if (!requireUser()) return
                    update((s) => {
                      s.dayPlan[event.date] = (
                        s.dayPlan[event.date] || []
                      ).filter((id) => id !== event.r.id)
                      s.dayPlan[moveDate] = [
                        ...new Set([
                          ...(s.dayPlan[moveDate] || []),
                          event.r.id,
                        ]),
                      ]
                    })
                    setAgenda(moveDate)
                    setMonth(new Date(moveDate.slice(0, 7) + '-01T12:00:00'))
                    setEvent(null)
                    onNotice('Workout moved to ' + stampDate(moveDate) + '.')
                  }}
                >
                  <CalendarDays size={17} />
                  Move workout
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="modal-body">
            <PhotoStory eyebrow={selected.label} title={selected.title} detail={selected.focus} variant="train"/>
            <div className="plan-facts">
              <span>
                <CalendarDays /> {selected.duration} weeks
              </span>
              <span>
                <Activity /> {selected.weeks[0].sessions.length} days/week
              </span>
              <span>
                <Target /> {selected.level}
              </span>
            </div>
            <div className="notice-box">
              <ShieldCheck size={22} />
              <span>
                {selected.supervision} · Draft awaiting coaching review.
              </span>
            </div>
            {enrolled.some((p) => p.id === selected.id) && (
              <label>
                Workout date
                <input
                  aria-label="Workout date"
                  type="date"
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value)}
                />
              </label>
            )}
            {enrolled.some((p) => p.id === selected.id) &&
              selected.ageBand === 'adult' && (
                <label className="progression-control">
                  Progression for future sessions
                  <select
                    aria-label="Plan progression"
                    value={
                      S.routines
                        .find((r) => !r.cancelledAt && r.programId === selected.id)
                        ?.ex.find((e) => e.section === 'Main')?.prog || 'double'
                    }
                    onChange={(e) => {
                      const value = e.target.value
                      update((s) => {
                        for (const r of s.routines.filter(
                          (r) => !r.cancelledAt && r.programId === selected.id,
                        ))
                          for (const ex of r.ex)
                            if (ex.section === 'Main')
                              ex.prog = ex.mode === 'time' ? 'off' : value
                      })
                    }}
                  >
                    <option value="double">
                      Build reps, then increase load
                    </option>
                    <option value="off">Keep my chosen targets</option>
                  </select>
                  <small>
                    Suggestions use completed work, including missed targets.
                    Edit every set as needed; timed mobility and youth practice
                    keep their targets.
                  </small>
                </label>
              )}
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
                  <details className="session-fold" key={i}>
                    <summary>
                      <Dumbbell size={16} /> Day {i + 1} · {s.name}
                      {(() => {
                        const r = S.routines.find(
                          (r) =>
                            programSessionMatches(r,selected.id,w.week,i,s.name),
                        )
                        return r && completedRoutine(S, r.id) ? (
                          <span className="completed-label">Completed!</span>
                        ) : null
                      })()}
                    </summary>
                    {(() => {
                      const routine = S.routines.find(
                        (r) =>
                          programSessionMatches(r,selected.id,w.week,i,s.name),
                      )
                      return routine ? (
                        completedRoutine(S, routine.id) ? (
                          <p className="completed-label">
                            <CheckCircle2 size={17} /> Completed!
                          </p>
                        ) : (
                          <button
                            className="lime"
                            disabled={!playDate}
                            onClick={() => launch(routine, playDate)}
                          >
                            <Play size={16} />
                            {playDate === todayISO()
                              ? 'Start today'
                              : 'Move to ' + stampDate(playDate) + ' & start'}
                          </button>
                        )
                      ) : null
                    })()}
                    {s.sections.map((section) => (
                      <p key={section.name}>
                        <strong>{section.name}</strong>
                        <br />
                        {section.exercises
                          .map((e) => title(EXIDX[e.id]?.n))
                          .join(' · ')}
                      </p>
                    ))}
                  </details>
                ))}
              </details>
            ))}
            {!enrolled.some((p) => p.id === selected.id) && (
              <>
                <label>
                  Start date
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <button
                  className="primary wide"
                  onClick={() => enroll(selected)}
                >
                  Add to my schedule <ArrowRight size={18} />
                </button>
              </>
            )}
            {enrolled.some((p) => p.id === selected.id) && <button className="outline wide" onClick={()=>{setSelected(null);showTrainView('schedule');requestAnimationFrame(()=>{const details=document.querySelector('.manage-plans');if(details){details.open=true;details.scrollIntoView({block:'start'})}})}}><Settings2 size={17}/> Edit or cancel this plan</button>}
            {enrolled.some((p) => p.id === selected.id) && (
              <p>
                <CheckCircle2 size={16} /> On your schedule
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
function Library({ onDetail }) {
  const illustrationIndex = useIllustrationIndex()
  const [query, setQuery] = useState(''),
    [equipment, setEquipment] = useState([]),
    [muscle, setMuscle] = useState([]),
    [movement, setMovement] = useState([]),
    [difficulty, setDifficulty] = useState([]),
    [limit, setLimit] = useState(12)
  const list = EXDB.filter(
    (e) =>
      matchesExerciseSearch(e, query) &&
      matchesSelections({eq:e.eq,tg:e.tg,movement:movementOf(e),difficulty:difficultyOf(e)},{eq:equipment,tg:muscle,movement,difficulty}),
  )
  const reset = () => setLimit(12)
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">KNOW YOUR MOVEMENT</p>
          <h1>Exercise library</h1>
          <p>
            {EXDB.length.toLocaleString()} movements. Find your next exercise.
          </p>
        </div>

      </div>
      <div className="search-bar">
        <Search size={21} />
        <input
          aria-label="Search exercises"
          placeholder="Try push, pull, a muscle or equipment…"
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
      <div className="filter-tabs" aria-label="Training group shortcuts"><button aria-pressed={query==='push'} onClick={()=>{setQuery(query==='push'?'':'push');reset()}}>Push · chest, shoulders, triceps</button><button aria-pressed={query==='pull'} onClick={()=>{setQuery(query==='pull'?'':'pull');reset()}}>Pull · back, biceps</button></div>
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
          <MultiFilter key={label} label={label} values={value} options={options} onChange={next=>{set(next);reset()}}/>
        ))}
      </div>
      {(equipment.length+muscle.length+movement.length+difficulty.length)>0 && <div className="active-filter-summary"><span>{equipment.length+muscle.length+movement.length+difficulty.length} filters selected</span><button className="text-link" onClick={()=>{setEquipment([]);setMuscle([]);setMovement([]);setDifficulty([]);reset()}}>Clear all</button></div>}
      <div className="section-head">
        <p>{list.length.toLocaleString()} exercises</p>
        <span className="muted-copy">Upgraded illustrations added as available</span>
      </div>
      <div className="exercise-grid">
        {list.slice(0, limit).map((e, i) => (
          <button
            className="exercise-card"
            key={e.id}
            onClick={() => onDetail(e.id)}
          >
            <div className={'exercise-image tone-' + (i % 4)}>
              <PilotMedia id={e.id} thumbnail>
                <BodyGlyph part={e.bp} />
              </PilotMedia>
              <span className="exercise-part">{e.bp}</span>
              <ArrowUpRight size={19} />
            </div>
            <div className="exercise-info">
              <h3>{title(e.n)}</h3>
              <p>
                {e.eq} <span>·</span> {e.tg}
              </p>
              <small>
                {approvedVariant(illustrationIndex, e.id, 'male') || approvedVariant(illustrationIndex, e.id, 'female')
                  ? 'Upgraded illustration'
                  : motions[e.id]
                  ? 'Draft illustration · unreviewed'
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
          onClick={() => setLimit(limit + 12)}
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
        <PilotMedia id={id}>
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
        </PilotMedia>
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
  if (a?.editingWorkoutId) return <SavedSessionEditor Modal={Modal} onNotice={onNotice} />
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
      (n, e) => n + e.sets.filter(hasCompletedWork).length,
      0,
    ),
    total = a.entries.reduce((n, e) => n + e.sets.length, 0),
    rest = Math.max(0, Math.ceil(((a.restUntil || 0) - now) / 1000))
  const alternatives = swap && a.builderConstraints ? sessionSwapOptions(a, index, sessionCatalog, S.exerciseIdAliases) : EXDB.filter((e) => e.id !== entry.id && e.tg === ex?.tg)
  const finish = () => {
    try {
      let saved
      update((s) => {
        saved = completeSession(s)
      })
      onNotice(
        saved.badges?.length
          ? 'Workout saved! ' + saved.badges.map((b) => b.label).join(' · ')
          : 'Workout saved. Every session is a step forward.',
      )
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
        <button className="outline" onClick={() => nav('/plans')}>
          <ArrowLeft size={16} />
          Leave workout
        </button>
        <button className="outline" onClick={() => setConfirm(true)}>
          Finish workout <Check size={18} />
        </button>
      </div>
      {!!a.otherSessions?.length && (
        <div className="saved-plans">
          <p className="eyebrow">ALSO IN PROGRESS</p>
          {a.otherSessions.map((session) => (
            <button
              key={session.id}
              className="agenda-row"
              onClick={() =>
                update((s) => startSession(s, { id: session.routineIds[0] }))
              }
            >
              <Play size={16} />
              <strong>Resume {session.name}</strong>
            </button>
          ))}
        </div>
      )}
      <div className="session-progress">
        <span>
          {done} / {total} {a.entries.some((e) => e.sets.some(isSideSet)) ? 'sets with logged work' : 'sets complete'}
        </span>
        <div>
          <i style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} />
        </div>
        <strong>
          {Math.floor(trainedMs(a, now) / 60000)}:
          {String(Math.floor(trainedMs(a, now) / 1000) % 60).padStart(2, '0')}
        </strong>
      </div>
      <div className="live-totals">
        <span>
          <Clock3 size={16} />
          Time {Math.floor(trainedMs(a, now) / 60000)} min
        </span>
        <span>
          <Dumbbell size={16} />
          Volume {Math.round(workoutVolume(a))} {S.unit}
        </span>
        <span>
          <Activity size={16} />
          {a.entries.reduce(
            (n, e) =>
              n +
              e.sets.filter((s) => s.done).reduce((n, s) => n + (s.r || 0), 0),
            0,
          )}{' '}
          reps
        </span>
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
          <PilotMedia id={entry.id}>
            {motions[entry.id] ? (
              <Suspense
                fallback={
                  <div className="media-loading">Loading movement…</div>
                }
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
                  <button
                    className="outline"
                    onClick={() => onDetail(entry.id)}
                  >
                    View technique
                  </button>
                </div>
              </div>
            )}
          </PilotMedia>
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
          {(() => {
            const last = lastEntryFor(S, entry.id, entry.rid)
            return (
              <section className="last-session">
                <h4>Last session {last ? '· ' + stampDate(last.d) : ''}</h4>
                {last ? (
                  <p>
                    {last.sets
                      .map(
                        (row, i) =>
                          'Set ' +
                          (i + 1) +
                          ': ' +
                          (row.w ? row.w + ' ' + S.unit + ' × ' : '') +
                          (row.sec ? row.sec + ' sec' : row.r + ' reps'),
                      )
                      .join(' · ')}
                  </p>
                ) : (
                  <p>
                    No previous session yet. Today establishes your baseline.
                  </p>
                )}
                {entry.plan && (
                  <p className="muted-copy">
                    Today's target:{' '}
                    {entry.plan.why?.join(' ') ||
                      entry.plan.reason ||
                      entry.plan.kind ||
                      'Follow your plan'}
                    . You can adjust each set below.
                  </p>
                )}
              </section>
            )
          })()}
          <p className="muted-copy">
            {entry.target?.mode === 'time'
              ? 'Start a timed set below, or enter the seconds you completed and check Done.'
              : 'Enter your weight and actual reps, then tap the checkmark to complete the set.'}
          </p>
          <div className="set-table">
            {entry.sets.some((row) => !isSideSet(row) && modeForSet(row, entry.target) !== 'cardio' && !(modeForSet(row, entry.target) === 'time' && entry.target?.mode !== 'time') && !Object.hasOwn(row, 'seconds') && !Object.hasOwn(row, 'durationSec')) && <div className="set-row set-heading">
              <span>SET</span>
              <span>{S.unit.toUpperCase()}</span>
              <span>{entry.target?.mode === 'time' ? 'SECONDS' : 'REPS'}</span>
              <span>DONE</span>
            </div>}
            {entry.sets.map((set, i) => (
              isSideSet(set) || modeForSet(set, entry.target) === 'cardio' || (modeForSet(set, entry.target) === 'time' && entry.target?.mode !== 'time') || Object.hasOwn(set, 'seconds') || Object.hasOwn(set, 'durationSec') ? <AdvancedSetRow key={i} entry={entry} row={set} entryIndex={index} setIndex={i} S={S} onChange={(next) => update((s) => {
                const previous = s.active.entries[index].sets[i]
                if (next.done && !previous.done) next.at = Date.now()
                s.active.entries[index].sets[i] = next
                if (s.active.setTimer?.entry === index && s.active.setTimer?.set === i) s.active.setTimer = null
                if (next.done && !previous.done) s.active.restUntil = Date.now() + (entry.target?.rest ?? 90) * 1000
              })} /> :
              <Fragment key={i}><div
                className={'set-row ' + (set.done ? 'completed' : '')}
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
                      if (row.done) row.at = Date.now()
                      if (
                        s.active.setTimer?.entry === index &&
                        s.active.setTimer?.set === i
                      )
                        s.active.setTimer = null
                      if (row.done && !s.active.editingWorkoutId)
                        s.active.restUntil =
                          Date.now() + (entry.target?.rest ?? 90) * 1000
                    })
                  }
                >
                  <Check size={19} />
                </button>
              </div>{set.done && <details className="set-rating"><summary>Optional set rating</summary><div><label><input type="checkbox" aria-label={`Set ${i + 1} warmup`} checked={isWarmup(set)} onChange={(e) => update((s) => { s.active.entries[index].sets[i] = setWarmupFlag(s.active.entries[index].sets[i], e.target.checked) })} /> Warmup (excluded from working sets)</label><label>Reps in reserve<select aria-label={`Set ${i + 1} reps in reserve`} value={set.rir ?? ''} onChange={(e) => update((s) => { const row = s.active.entries[index].sets[i]; row.rir = e.target.value === '' ? null : Number(e.target.value) })}><option value="">Not rated</option>{Array.from({ length: 11 }, (_, n) => <option value={n} key={n}>{n}</option>)}</select></label><label>Perceived feel<select aria-label={`Set ${i + 1} perceived feel`} value={set.feel ?? ''} onChange={(e) => update((s) => { const row = s.active.entries[index].sets[i]; row.feel = e.target.value === '' ? null : Number(e.target.value) })}><option value="">Not rated</option>{[1, 2, 3, 4, 5].map((n) => <option value={n} key={n}>{n} / 5</option>)}</select></label></div></details>}</Fragment>
            ))}
          </div>
          <WorkoutTimers active={a} index={index} />
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
          <SwapPicker options={alternatives} current={ex} constrained={!!a.builderConstraints}
            instructions={builderInstructions}
            renderMedia={e => <PilotMedia id={e.id} thumbnail><BodyGlyph part={e.bp}/></PilotMedia>}
            onSwap={e => {
                    try {
                    update((s) => {
                      if (s.active.builderConstraints) { s.active = applySessionSwap(s.active, index, e.id, sessionCatalog, s.exerciseIdAliases); return }
                      s.active.setTimer = null
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
                    } catch (error) { onNotice(error.message) }
            }}/>
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
                  leaveFinishedSession(s)
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
export function Progress({ requireUser, onNotice }) {
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
      S.workouts.reduce((n, w) => n + trainedMs(w) / 60000, 0),
    )
  const location = useLocation()
  const view = progressView(location.search, location.hash)
  return (
    <>
      <div className="page-title"><div><h1>Progress</h1><p>Your training, at a glance.</p></div>
        <button className="outline compact" onClick={() => nav('/exercise-progress')}><TrendingUp size={17} /> Exercise progress</button>
      </div>
      <nav className="section-nav" aria-label="Progress views">
        {['overview', 'history', 'body', 'insights'].map((item) => <NavLink key={item} to={`/progress?view=${item}`} aria-current={view === item ? 'page' : false} className={view === item ? 'selected' : ''}>{item[0].toUpperCase() + item.slice(1)}</NavLink>)}
      </nav>
      <div className="progress-view" key={view}>
      {view === 'overview' && <>
      <PhotoStory eyebrow="PROGRESS IS PERSONAL" title="Look how far you’ve come." variant="progress" action="Log a workout" onAction={()=>nav('/create-workout?type=log')}/>
      <section className="visual-overview"><div className="visual-overview-intro"><p className="eyebrow">KEEP YOUR MOMENTUM</p><h2>This week, in motion.</h2><p>{S.workouts.length} workouts logged · {S.workouts.reduce((n,w)=>n+(w.prs?.length || 0),0)} personal records</p></div><div className="ring-pair"><GoalRing value={homeWeek(S,todayISO()).count} target={homeWeek(S,todayISO()).target} label="Workouts this week" caption="Your weekly rhythm"/><GoalRing value={Math.round(homeWeek(S,todayISO()).workouts.reduce((n,w)=>n+trainedMs(w)/60000,0))} target={Number(S.trainingGoals?.minutes)||90} label="Active minutes" unit="min" tone="cyan" caption="Your weekly activity"/></div></section>
      <section className="chart-panel">
        <div className="section-head">
          <div>

            <h2>Training rhythm</h2>
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
      {S.workouts.some((w) => w.badges?.length > 0) && (
        <section className="history-panel">
          <h2>Recent records & milestones</h2>
          <div className="record-grid">
            {S.workouts
              .slice()
              .reverse()
              .filter((w) => w.badges?.length)
              .slice(0, 5)
              .map((w) => (
                <div key={w.id}>
                  <p className="eyebrow">{stampDate(w.d)}</p>
                  {w.badges.map((b, i) => (
                    <span className="record-badge" key={i}>
                      <Flame size={16} />
                      {b.label}
                      {b.id ? ' · ' + title(EXIDX[b.id]?.n) : ''}
                    </span>
                  ))}
                </div>
              ))}
          </div>
        </section>
      )}
      <div className="overview-links"><NavLink to="/progress?view=history">Workout history <ArrowRight size={18} /></NavLink><NavLink to="/progress?view=body">Log a body check-in <ArrowRight size={18} /></NavLink><NavLink to="/progress?view=insights">Explore insights <ArrowRight size={18} /></NavLink></div>
      </>}
      {view === 'body' && <>
        <CheckIns S={S} requireUser={requireUser} />
        {import.meta.env.VITE_MOBILE === '1' && <button className="outline" onClick={() => nav('/progress-photos')}>Progress photos <ArrowRight size={16} /></button>}
      </>}
      {view === 'insights' && <>
        <div className="builder-actions"><button className="outline" onClick={() => nav('/coach')}><Sparkles size={17} /> Ask your guide</button><button className="outline" onClick={() => nav('/intervals')}><Clock3 size={17} /> Interval timer</button></div>
        <TrainingGoals S={S} requireUser={requireUser} />
        <TrainingAnalysis />
        <details className="layout-disclosure"><summary>Activity & next steps</summary><TrainingGuidance /></details>
      </>}
      {view === 'history' && <>
      <WorkoutLog S={S} onEdit={(record) => { if (!requireUser()) return; try { update((s) => editCompletedSession(s, record)); nav('/workout') } catch (error) { onNotice?.(error.message) } }} />
      <details className="layout-disclosure">
        <summary>Personal baselines</summary>
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
      </details>
      </>}
      </div>
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
          'Account services are unavailable. Please try again later.',
        )
      const result = signup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
      if (result.error) throw result.error
      if (!result.data.session) {
        onNotice('Check your email inbox to confirm your account.')
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
          <h1>
            {user ? (
              user.name
            ) : (
'Profile'
            )}
          </h1>
          <p>
            {user
              ? 'Manage your training profiles and keep your progress with you.'
              : 'Create your adult account to save workouts and manage training profiles.'}
          </p>
        </div>
      </div>
      <PhotoStory eyebrow="YOUR SPACE" title={user ? `Made for ${user.name.split(' ')[0]}.` : "Your story. Your strength."} detail="Your goals, your training, your way." variant="profile"/>
      <section className="profile-body-choice"><div><p className="eyebrow">YOUR VISUAL PROFILE</p><h2>Body figure</h2><p>Choose the figure shown in your Body measurements.</p></div><div className="composer-modes">{['male','female'].map(body=><button key={body} type="button" aria-pressed={S.body===body} onClick={()=>update(st=>{st.body=body})}>{body==='male'?'Male':'Female'}</button>)}</div></section>
      {!user && !session ? (
        <div className="auth-grid">
          <section className="auth-story">
            <div>
              <span className="tag dark-tag">
                SETS &amp; STRENGTH / YOUR SPACE
              </span>
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
            <p className="muted-copy">Your training starts here</p>
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
          <h3>sets&amp;strength</h3>
          <p>
            Your training, plans, and progress in one place.
            Exercise media and sports programs remain in development.
          </p>
          <a href="/workout/source.zip">Download this version’s source</a>
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
              routines. Existing history will be merged using sets&amp;strength’s
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
