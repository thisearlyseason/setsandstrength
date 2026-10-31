import { useEffect, useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
const cache = new Map()
const xy = (p) => p.join(',')
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
function Limb({ a, b, width = 12, active = false, far = false }) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
    n = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length],
    p = (t, w) => [
      a[0] + (b[0] - a[0]) * t + n[0] * w,
      a[1] + (b[1] - a[1]) * t + n[1] * w,
    ]
  return (
    <g opacity={far ? 0.45 : 1}>
      <path
        d={`M ${xy(p(0, 2))} Q ${xy(p(0.32, width))} ${xy(p(0.67, width * 0.65))} Q ${xy(p(0.92, width * 0.3))} ${xy(p(1, 2))} L ${xy(p(1, -2))} Q ${xy(p(0.75, -width * 0.65))} ${xy(p(0.35, -width * 0.8))} Q ${xy(p(0.06, -width * 0.6))} ${xy(p(0, 2))} Z`}
        fill={active ? '#e89991' : '#f2f1ec'}
        stroke="#303a36"
        strokeWidth="1.7"
      />
      <path
        d={`M ${xy(p(0.16, width * 0.4))} Q ${xy(p(0.5, 0))} ${xy(p(0.86, width * 0.12))} M ${xy(p(0.28, -width * 0.35))} Q ${xy(p(0.62, -width * 0.35))} ${xy(p(0.9, 0))}`}
        fill="none"
        stroke={active ? '#ad4944' : '#9da49e'}
        strokeWidth="1"
      />
    </g>
  )
}
function Drawing({ f, equipment, motion, primary, highlight, view }) {
  const on = (region) =>
    highlight &&
    primary.some(
      (x) =>
        ({
          quads: 'quadriceps',
          chest: 'pectorals',
          abs: 'abdominals',
          core: 'abdominals',
          delts: 'deltoids',
        })[x.toLowerCase()] === region || x.toLowerCase() === region,
    )
  const loaded = equipment !== 'body weight',
    shoulder = mid(f.L.shoulder, f.R.shoulder),
    hip = mid(f.L.hip, f.R.hip)
  const length = Math.hypot(shoulder[0] - hip[0], shoulder[1] - hip[1]) || 1,
    n = [-(shoulder[1] - hip[1]) / length, (shoulder[0] - hip[0]) / length],
    offset = (p, w) => [p[0] + n[0] * w, p[1] + n[1] * w]
  const waist = [
    shoulder[0] + (hip[0] - shoulder[0]) * 0.68,
    shoulder[1] + (hip[1] - shoulder[1]) * 0.68,
  ]
  const torso = `M ${xy(offset(hip, -23))} C ${xy(offset(waist, -16))} ${xy(offset(f.chest, -31))} ${xy(offset(shoulder, -30))} Q ${xy(f.neck)} ${xy(offset(shoulder, 30))} C ${xy(offset(f.chest, 31))} ${xy(offset(waist, 16))} ${xy(offset(hip, 23))} Q ${xy([hip[0], hip[1] + 8])} ${xy(offset(hip, -23))} Z`

  const headAngle =
    (Math.atan2(f.head[1] - f.neck[1], f.head[0] - f.neck[0]) * 180) / Math.PI +
    90
  const limb = (s, far, arms) =>
    arms ? (
      <g key={s + 'arms'}>
        <Limb
          a={f[s].shoulder}
          b={f[s].elbow}
          width={11}
          active={on('biceps') || on('triceps') || on('deltoids')}
          far={far}
        />
        <Limb
          a={f[s].elbow}
          b={f[s].wrist}
          width={8}
          active={on('forearms')}
          far={far}
        />
        <path
          d={`M ${xy(f[s].wrist)} L ${xy(f[s].grip)}`}
          stroke="#3b423e"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <ellipse
          cx={f[s].grip[0]}
          cy={f[s].grip[1]}
          rx={loaded ? 7 : 9}
          ry={loaded ? 7 : 4}
          fill="#f2f1ec"
          stroke="#303a36"
          strokeWidth="1.5"
        />
        <path
          d={`M ${f[s].grip[0] - 4},${f[s].grip[1] - 3} l 0,6 m 3,-6 l 0,6 m 3,-6 l 0,6`}
          stroke="#8c958e"
          strokeWidth=".8"
        />
      </g>
    ) : (
      <g key={s + 'legs'}>
        <Limb
          a={f[s].hip}
          b={f[s].knee}
          width={18}
          active={on('quadriceps') || on('hamstrings') || on('glutes')}
          far={far}
        />
        <Limb
          a={f[s].knee}
          b={f[s].ankle}
          width={11}
          active={on('calves')}
          far={far}
        />
        <path
          d={`M ${xy(f[s].ankle)} Q ${xy(offset(f[s].ankle, 7))} ${xy(f[s].toe)} L ${f[s].toe[0]},${f[s].toe[1] + 4} L ${f[s].ankle[0] - 5},${f[s].ankle[1] + 4} Z`}
          fill="#e7eae3"
          stroke="#303a36"
          strokeWidth="1.7"
        />
      </g>
    )
  return (
    <svg
      viewBox="0 0 600 520"
      role="img"
      aria-label={`Original ${view}-view exercise illustration, ${motion.replaceAll('-', ' ')}`}
    >
      <defs>
        <pattern id="paper" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".3" fill="#d9dfd4" />
        </pattern>
      </defs>
      <rect x="0" width="600" height="520" fill="url(#paper)" />
      <path d="M 35,470 H 565" stroke="#c5cfc0" strokeWidth="1" />
      {motion.includes('bench-press') && (
        <g stroke="#39443c" strokeWidth="6">
          <path d={`M ${xy(f.benchA)} L ${xy(f.benchB)}`} />
          <path
            d={`M ${xy(f.benchA)} v 90 M ${xy(f.benchB)} v 90`}
            strokeWidth="4"
          />
        </g>
      )}
      {limb('L', true, false)}
      {limb('L', true, true)}
      <path
        d={torso}
        fill={on('abdominals') || on('pectorals') ? '#eab4ac' : '#f2f1ec'}
        stroke="#303a36"
        strokeWidth="2"
      />
      <path
        d={`M ${xy(f.neck)} Q ${xy(f.chest)} ${xy(hip)} M ${xy(offset(f.chest, -20))} Q ${xy(f.chest)} ${xy(offset(f.chest, 20))}`}
        fill="none"
        stroke="#909b91"
        strokeWidth="1.1"
      />
      {[0.45, 0.6, 0.75].map((t) => {
        const p = [
          shoulder[0] + (hip[0] - shoulder[0]) * t,
          shoulder[1] + (hip[1] - shoulder[1]) * t,
        ]
        return (
          <path
            key={t}
            d={`M ${xy(offset(p, -9))} Q ${xy(p)} ${xy(offset(p, 9))}`}
            fill="none"
            stroke="#a3aaa0"
          />
        )
      })}
      <path d={`M ${xy(hip)} l -10,5 l 10,7 l 10,-7 Z`} fill="#5f6b62" />
      {limb('R', false, false)}
      <path
        d={`M ${xy(shoulder)} L ${xy(f.head)}`}
        stroke="#303a36"
        strokeWidth="16"
      />
      <path
        d={`M ${xy(shoulder)} L ${xy(f.head)}`}
        stroke="#e6e8df"
        strokeWidth="13"
      />
      <g transform={`translate(${xy(f.head)}) rotate(${headAngle})`}>
        <path
          d="M -13,3 Q -17,-15 -8,-21 Q 10,-29 15,-11 L 19,-2 L 14,1 Q 12,16 2,16 L -8,10 Z"
          fill="#f2f1ec"
          stroke="#303a36"
          strokeWidth="1.8"
        />
        <path
          d="M -13,-8 Q -16,-24 2,-24 Q 16,-22 15,-12 Q 3,-17 -13,-8"
          fill="#536057"
        />
        <path
          d="M 8,-6 l 4,0 M 9,7 l 4,-1 M -5,-4 q -5,-5 -6,1 q 0,7 5,6"
          fill="none"
          stroke="#536057"
          strokeWidth="1"
        />
      </g>
      {limb('R', false, true)}
      {equipment === 'dumbbell' &&
        ['L', 'R'].map((s) => (
          <g
            key={s}
            transform={`translate(${xy(f[s].grip)}) rotate(${motion === 'hammer-curl' ? -90 : 0})`}
          >
            <path d="M -14,0 H 14" stroke="#39443c" strokeWidth="4" />
            <rect x="-21" y="-12" width="9" height="24" rx="2" fill="#39443c" />
            <rect x="12" y="-12" width="9" height="24" rx="2" fill="#39443c" />
          </g>
        ))}
      {equipment === 'barbell' && (
        <g>
          <path
            d={`M ${f.bar[0] - 65},${f.bar[1]} H ${f.bar[0] + 65}`}
            stroke="#39443c"
            strokeWidth="4"
          />
          {[-1, 1].map((s) => (
            <ellipse
              key={s}
              cx={f.bar[0] + s * 44}
              cy={f.bar[1]}
              rx={12}
              ry={42}
              fill="#e1e6dc"
              stroke="#39443c"
              strokeWidth="4"
            />
          ))}
        </g>
      )}
    </svg>
  )
}
export default function Illustration({ motion = 'squat', primary = [] }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [phase, setPhase] = useState(0),
    [playing, setPlaying] = useState(false),
    [highlight, setHighlight] = useState(true),
    [speed, setSpeed] = useState(1),
    mount = useRef(null)
  useEffect(() => {
    let active = true
    setData(null)
    setError('')
    setPlaying(false)
    setPhase(0)
    const promise =
      cache.get(motion) ||
      fetch('/workout/illustrations/' + motion + '.json').then((r) => {
        if (!r.ok) throw Error()
        return r.json()
      })
    cache.set(motion, promise)
    promise
      .then((d) => {
        if (active) setData(d)
      })
      .catch(() => {
        cache.delete(motion)
        if (active)
          setError(
            'Illustration unavailable. Follow the written instructions below.',
          )
      })
    return () => {
      active = false
    }
  }, [motion])
  useEffect(() => {
    if (!playing || !data) return
    let frame,
      last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (
        !document.hidden &&
        mount.current?.getBoundingClientRect().bottom > 0 &&
        mount.current?.getBoundingClientRect().top < innerHeight
      )
        setPhase((p) => (p + (dt * speed) / data.duration) % 1)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, data, speed])
  const stage = data ? Math.min(3, Math.floor(phase * 4)) : 0
  return (
    <section
      className="illustration-viewer"
      ref={mount}
      aria-label="Illustrated exercise demonstration"
    >
      <div className="illustration-heading">
        <span>ILLUSTRATED TECHNIQUE</span>
        <span>Draft · review pending</span>
      </div>
      {data ? (
        <>
          <Drawing
            f={data.frames[Math.round(phase * 60)]}
            equipment={data.equipment}
            motion={motion}
            view={data.view}
            primary={primary}
            highlight={highlight}
          />
          <div className="illustration-caption">
            <strong>{data.labels[stage]}</strong>
            <p>{data.cues[stage]}</p>
          </div>
          <div className="illustration-steps">
            {data.labels.map((label, i) => (
              <button
                key={i}
                aria-pressed={stage === i}
                onClick={() => {
                  setPlaying(false)
                  setPhase(data.phases[i])
                }}
              >
                <span>{i + 1}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="illustration-controls">
            <button
              aria-label={
                playing ? 'Pause demonstration' : 'Play demonstration'
              }
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <input
              aria-label="Movement phase"
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={phase}
              onChange={(e) => {
                setPlaying(false)
                setPhase(+e.target.value)
              }}
            />
            <select
              aria-label="Playback speed"
              value={speed}
              onChange={(e) => setSpeed(+e.target.value)}
            >
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
            </select>
            <button
              aria-pressed={highlight}
              onClick={() => setHighlight(!highlight)}
            >
              Muscles
            </button>
          </div>
        </>
      ) : (
        <p role="status">{error || 'Loading illustration…'}</p>
      )}
    </section>
  )
}
