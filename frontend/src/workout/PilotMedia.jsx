import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { figureOf, EXIDX, imgSrc } from '../lib/exercises.js'
import {
  PILOT_ENABLED,
  approvedVariant,
  downloadSelected,
} from './pilot-media.js'
let indexPromise
function getIndex() {
  return (indexPromise ||= fetch('/workout/illustration-approved.json')
    .then((r) => {
      if (!r.ok) throw Error('Media index unavailable')
      return r.json()
    })
    .catch((e) => {
      indexPromise = null
      throw e
    }))
}
export function useIllustrationIndex() {
  const [index, setIndex] = useState(null)
  useEffect(() => {
    let live = true
    if (PILOT_ENABLED) getIndex().then((value) => { if (live) setIndex(value) }).catch(() => {})
    return () => { live = false }
  }, [])
  return index
}
// Frame the figure rather than the catalog's uneven white margins. The source file
// stays intact. If pixels aren't readable (e.g. an external host), show the whole image.
function FramedStill({ src, alt, onError }) {
  const [frame, setFrame] = useState(null)
  function measure(e) {
    const img = e.currentTarget
    try {
      const c = document.createElement('canvas'),
        w = (c.width = img.naturalWidth),
        h = (c.height = img.naturalHeight)
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const pixels = ctx.getImageData(0, 0, w, h).data
      let l = w,
        r = -1,
        t = h,
        b = -1
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = 4 * (y * w + x)
          if (
            pixels[i + 3] > 40 &&
            Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 218
          ) {
            l = Math.min(l, x)
            r = Math.max(r, x)
            t = Math.min(t, y)
            b = Math.max(b, y)
          }
        }
      if (r < l) return
      const size = Math.max(r - l + 1, b - t + 1) * 1.08
      setFrame({
        width: (100 * w) / size + '%',
        height: (100 * h) / size + '%',
        left: 50 - (50 * (l + r + 1)) / size + '%',
        top: 50 - (50 * (t + b + 1)) / size + '%',
      })
    } catch {
      /* Use the original frame. */
    }
  }
  return (
    <div className="still-frame">
      <img
        className="pilot-existing"
        style={frame}
        src={src}
        alt={alt}
        onLoad={measure}
        onError={onError}
      />
    </div>
  )
}
export default function PilotMedia(props) {
  const variant = useStore((s) => figureOf(s.S))
  return <ExerciseMedia key={props.id} {...props} variant={variant} />
}
function ExerciseMedia({
  id,
  thumbnail = false,
  preview = false,
  children,
  variant,
}) {
  const S = useStore((s) => s.S),
    [index, setIndex] = useState(null),
    [failed, setFailed] = useState(false),
    [notice, setNotice] = useState(''),
    [watch, setWatch] = useState(false)
  useEffect(() => {
    if (PILOT_ENABLED)
      getIndex()
        .then(setIndex)
        .catch(() => {})
  }, [])
  useEffect(() => {
    setFailed(false)
    setWatch(false)
    setNotice('')
  }, [id, variant])
  const ex = EXIDX[id]
  const url = (v) =>
    ex?.img ? new URL(imgSrc(ex, v), new URL('/', location.href)).href : null
  const source = (v) =>
    approvedVariant(index, id, v)?.assets?.[0]?.path ||
    (ex?.fv || ex?.mv ? url(v) : null)
  const male = source('male'),
    female = source('female')
  const [probe, setProbe] = useState(null)
  useEffect(() => {
    let live = true
    if (!thumbnail && !preview && male && female && male !== female) {
      Promise.all(
        [male, female].map(
          (src) =>
            new Promise((resolve) => {
              const img = new Image()
              img.onload = () => resolve(true)
              img.onerror = () => resolve(false)
              img.src = src
            }),
        ),
      ).then((ok) => {
        if (live) setProbe({ male, female, ok })
      })
    }
    return () => {
      live = false
    }
  }, [thumbnail, preview, male, female])
  const checked =
    probe?.male === male && probe?.female === female ? probe.ok : null
  const opposite = variant === 'female' ? 'male' : 'female'
  const useOther =
    checked &&
    !checked[variant === 'female' ? 1 : 0] &&
    checked[variant === 'female' ? 0 : 1]
  const onlyOpposite = !source(variant) && !!source(opposite)
  const displayed = useOther || onlyOpposite ? opposite : variant
  const selector = checked?.every(Boolean) ? (
    <label>
      Illustration model
      <select
        value={variant}
        onChange={(e) => {
          const value = e.currentTarget.value
          useStore.getState().update((s) => {
            s.exFigure = value
          })
        }}
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </label>
  ) : null
  const job = PILOT_ENABLED ? approvedVariant(index, id, displayed) : null
  const legacy = url(displayed)
  useEffect(() => {
    setFailed(false)
  }, [legacy])
  const fallback =
    legacy && !failed ? (
      thumbnail ? (
        <img
          className="pilot-thumb"
          src={legacy}
          loading="lazy"
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        <FramedStill
          key={legacy}
          src={legacy}
          alt={`${EXIDX[id].n} illustration`}
          onError={() => setFailed(true)}
        />
      )
    ) : (
      children
    )
  if (preview)
    return job && !failed ? (
      <img
        className="pilot-thumb"
        src={job.thumbnail.path}
        alt={job.canonicalName}
        onError={() => setFailed(true)}
      />
    ) : (
      fallback
    )
  if (!job || failed)
    return thumbnail ? (
      fallback
    ) : (
      <section className="pilot-media">
        {selector}
        {fallback}
      </section>
    )
  if (thumbnail)
    return (
      <img
        className="pilot-thumb"
        loading="lazy"
        decoding="async"
        src={job.thumbnail.path}
        width={job.thumbnail.width}
        height={job.thumbnail.height}
        alt=""
        onError={() => setFailed(true)}
      />
    )
  const video =
    job.video?.reviewStatus === 'approved' &&
    job.video?.continuousMovement &&
    job.video?.path?.endsWith('.mp4')
      ? job.video
      : null
  return (
    <section className="pilot-media" aria-label="Exercise illustrations">
      {selector}
      <div className="pilot-poses">
        {job.assets.map((a, i) => (
          <figure key={a.path}>
            <img
              src={a.path}
              width={a.width}
              height={a.height}
              alt={`${job.canonicalName}: ${job.poses[i].caption}, ${displayed} model`}
              onError={() => setFailed(true)}
            />
            <figcaption>{job.poses[i].caption}</figcaption>
          </figure>
        ))}
      </div>
      <button
        className="outline"
        onClick={async () => {
          try {
            const ids = [
              ...new Set([
                id,
                ...(S.routines || []).flatMap((r) =>
                  (r.ex || []).map((e) => e.id),
                ),
                ...(S.active?.entries || []).map((e) => e.id),
              ]),
            ]
            setNotice(
              `${await downloadSelected(index, ids, displayed)} images available offline for selected workouts.`,
            )
          } catch (e) {
            setNotice(e.message)
          }
        }}
      >
        Download selected workout illustrations
      </button>
      {video && (
        <button className="outline" onClick={() => setWatch(!watch)}>
          Watch movement
        </button>
      )}
      {watch && video && (
        <video controls playsInline preload="none" src={video.path} />
      )}
      <p role="status">{notice}</p>
    </section>
  )
}
