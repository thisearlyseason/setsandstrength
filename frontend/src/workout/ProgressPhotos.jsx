import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Camera, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore.js'
import { mediaStore } from '../lib/media-store.js'
import { localReferencedHashes } from '../lib/media-refs.js'
import { sha256Hex } from '../lib/sha256.js'
import { todayISO } from '../lib/format.js'
import { matchingPhotoPairs, validProgressPhoto, resolvePhotoComparison } from './progress-photos.js'

const update = (fn) => useStore.getState().update(fn)
export default function ProgressPhotos() {
  const cameraInput = useRef(null), fileInput = useRef(null)
  const owner = useStore((s) => s.user?.id || null)
  const mounted = useRef(true)
  const scope = useRef({ owner })
  if (scope.current.owner !== owner) scope.current = { owner }
  const token = scope.current
  const currentProfile = () => mounted.current && scope.current === token && (useStore.getState().user?.id || null) === owner
  const S = useStore((s) => s.S), nav = useNavigate(), [date, setDate] = useState(todayISO()), [pose, setPose] = useState('front'), [urlState, setUrlState] = useState(null), [pair, setPair] = useState(null), [message, setMessage] = useState('')
  const urls = urlState?.scope === token ? urlState.urls : {}
  const photos = (Array.isArray(S.progressPhotos) ? S.progressPhotos : []).filter(validProgressPhoto).slice().sort((a, b) => b.date.localeCompare(a.date))
  const pairs = useMemo(() => matchingPhotoPairs(photos, pose), [photos, pose])
  const comparison = resolvePhotoComparison(pairs, pair, urls)
  useEffect(() => {
    let active = true
    const made = []
    Promise.all(photos.map(async p => [p.id, p.hash, await mediaStore.url(p.hash)]))
      .then(entries => {
        if (!active || !currentProfile()) { entries.forEach(([, hash]) => mediaStore.release(hash)); return }
        made.push(...entries.map(([, hash]) => hash))
        setUrlState({ scope: token, urls: Object.fromEntries(entries.filter(([, , url]) => url).map(([id, , url]) => [id, url])) })
      }).catch(() => { if (active && currentProfile()) setMessage('Could not read the photo files on this device.') })
    return () => { active = false; made.forEach(hash => mediaStore.release(hash)) }
  }, [S.progressPhotos, token])
  useEffect(() => { setPair(null); setMessage('') }, [token])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const add = async (file) => {
    if (!date || date > todayISO()) { setMessage('Choose a valid date on or before today.'); return }
    if (!file) { setMessage('No photo selected. If access was denied, allow photo or camera access in device Settings.'); return }
    try {
      const bitmap = await createImageBitmap(file)
      if (!currentProfile()) { bitmap.close?.(); return }
      const canvas = document.createElement('canvas'), scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.()
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .9))
      if (!currentProfile()) return
      if (!blob) throw new Error('This image could not be prepared on the device.')
      const hash = await sha256Hex(blob)
      if (!currentProfile()) return
      await mediaStore.put(hash, blob, { mime: 'image/jpeg', pending: false })
      if (!currentProfile()) return
      update((s) => { s.progressPhotos = [...(s.progressPhotos || []), { id: crypto.randomUUID(), hash, date, pose, mime: 'image/jpeg', width: canvas.width, height: canvas.height, size: blob.size, at: Date.now() }] })
      setMessage('Photo file saved on this device. Dates and labels follow your account profile; photo files are not uploaded or sent to AI.')
    } catch (e) { if (currentProfile()) setMessage(e.message || 'Could not read this photo. Check photo access in device Settings.') }
  }
  const remove = async (p) => {
    if (!window.confirm(`Delete the ${p.pose} photo from ${p.date}?`)) return
    update((s) => { s.progressPhotos = (s.progressPhotos || []).filter((x) => x.id !== p.id) })
    setPair(null)
    // A different locally stashed profile may use the same content-addressed file.
    let stashed
    try { stashed = await useStore.getState().stashedMediaHashes() } catch { return }
    if (!currentProfile()) return
    if (!localReferencedHashes(useStore.getState().S).has(p.hash) && !stashed.has(p.hash)) await mediaStore.remove(p.hash)
  }

  return <><div className="page-title"><div><p className="eyebrow">PRIVATE ON THIS DEVICE</p><h1>Progress photos</h1><p>Photos stay in the app’s private media folder. Compare the same pose across two dates.</p></div><button className="outline" onClick={() => nav('/progress')}><Camera size={17} /> Progress</button></div>
    <section className="history-panel"><div className="builder-fields"><label>Date<input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Pose<select value={pose} onChange={(e) => setPose(e.target.value)}><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option></select></label></div><div className="builder-actions"><button className="outline" onClick={() => cameraInput.current?.click()}><Camera size={17} /> Take progress photo</button><button className="outline" onClick={() => fileInput.current?.click()}>Import photo</button></div><input hidden ref={cameraInput} type="file" accept="image/*" capture="environment" onCancel={() => setMessage('No photo selected. If camera access is denied, use Import photo or review camera permission in Settings.')} onChange={(e) => { void add(e.target.files?.[0]); e.target.value = '' }} /><input hidden ref={fileInput} type="file" accept="image/*" onChange={(e) => { void add(e.target.files?.[0]); e.target.value = '' }} /><p role="status" className="muted-copy">{message || `${photos.length} photos saved on this device. Photo files are not included in account sync or AI requests.`}</p>
      {pairs.length > 0 && <label>Compare same-pose dates<select value={pair?.join('|') || ''} onChange={(e) => setPair(e.target.value ? e.target.value.split('|') : null)}><option value="">Choose two dates</option>{pairs.filter(([a, b]) => urls[a.id] && urls[b.id]).map(([a, b]) => <option value={`${a.id}|${b.id}`} key={`${a.id}-${b.id}`}>{a.date} → {b.date}</option>)}</select></label>}
      {comparison && (() => { const [a, b] = comparison; return <div className="photo-compare"><figure><img src={urls[a.id]} alt={`${a.pose} progress photo from ${a.date}`} /><figcaption>{a.date} · {a.pose}</figcaption></figure><ArrowLeftRight aria-hidden="true" /><figure><img src={urls[b.id]} alt={`${b.pose} progress photo from ${b.date}`} /><figcaption>{b.date} · {b.pose}</figcaption></figure></div> })()}
      {!photos.length ? <p className="muted-copy">Your first photo starts a private timeline. No AI analysis is used.</p> : <div className="photo-grid">{photos.map((p) => <figure key={p.id}><>{urls[p.id] ? <img src={urls[p.id]} alt={`${p.pose} progress photo from ${p.date}`} /> : <p>Photo file is not stored on this device.</p>}</><figcaption>{p.date} · {p.pose}<button aria-label={`Delete ${p.pose} photo from ${p.date}`} onClick={() => remove(p)}><Trash2 size={16} /></button></figcaption></figure>)}</div>}
      {photos.length > 0 && !pairs.length && <p className="muted-copy">Add another {pose} photo on a different date to compare this pose.</p>}
    </section></>
}
