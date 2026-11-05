import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {EXIDX,imgSrc} from '../lib/exercises.js'
import './workout.css'
const KEY='workout-illustration-human-review-v1'
function App(){
 const [manifest,setManifest]=useState(null),[error,setError]=useState(''),[id,setId]=useState('0868'),[variant,setVariant]=useState('male'),[reviews,setReviews]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}})
 useEffect(()=>{fetch('/workout/illustration-pilot/manifest.json').then(r=>{if(!r.ok)throw Error('Pilot review assets are unavailable in this build. Use the local development server.');return r.json()}).then(setManifest).catch(e=>setError(e.message))},[])
 useEffect(()=>setError(''),[id,variant])
 function save(key,patch){setReviews(old=>{const next={...old,[key]:{...old[key],...patch}};localStorage.setItem(KEY,JSON.stringify(next));return next})}
 function exportReview(){const url=URL.createObjectURL(new Blob([JSON.stringify(reviews,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='illustration-review.json';a.click();URL.revokeObjectURL(url)}
 if(!manifest)return <main className="pilot-review"><h1>Illustration pilot</h1><p role="status">{error||'Loading review manifest…'}</p></main>
 const jobs=manifest.jobs.filter(j=>j.exerciseId===id),job=jobs.find(j=>j.variant===variant),review=reviews[job.key]||{},ex=EXIDX[id]
 const complete=job.generation.status==='generated'&&job.assets.length===job.poses.length
 const canApprove=complete&&!job.blockingIssues?.length&&review.reviewer?.trim()&&review.notes?.trim()&&review.qualifiedReview&&review.clothingReview&&review.poseReview
 return <main className="pilot-review">
  <header><a href="/">← Sets &amp; Strength</a><h1>Illustration pilot review</h1><p>Generated drafts are never automatically published. Review both model variants separately. No movement videos have been approved.</p></header>
  <p><strong>Selected visual style:</strong> Detailed grayscale anatomy, red muscle highlights, white backgrounds, realistic equipment and complete opaque clothing. Match the preferred squat and leg-extension examples. Style selection does not approve movement accuracy.</p>
  <div className="pilot-toolbar"><label>Exercise<select value={id} onChange={e=>setId(e.target.value)}>{manifest.jobs.filter(j=>j.variant==='male').map(j=><option key={j.exerciseId} value={j.exerciseId}>{j.exerciseId} · {j.canonicalName}</option>)}</select></label><label>Model<select value={variant} onChange={e=>setVariant(e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></label><button className="outline" onClick={exportReview}>Export reviews</button></div>
  <h2>{job.canonicalName}</h2><p>{job.equipment} · Primary regions: {job.primaryMuscles.join(', ')}</p><p role="note">Metadata review: {job.metadataReview}</p>
  <details><summary>Existing media (licensed fallback, not generation input)</summary><img className="pilot-existing" src={'/'+imgSrc(ex,variant).replace(/^\//,'')} alt={`Existing ${job.canonicalName}`} onError={e=>{e.currentTarget.hidden=true}}/><p>Unmodified upstream 180 px image; retain upstream NOTICE. Noncommercial fork only.</p></details>
  {job.blockingIssues?.length>0&&<div role="alert"><strong>Revision required — approval blocked</strong><ul>{job.blockingIssues.map(issue=><li key={issue}>{issue}</li>)}</ul></div>}
  <p className="muted-copy">Asset version: {job.key}</p>
  {job.highlightTreatment&&<p>{job.highlightTreatment}</p>}
  <p>Asset inspection: {job.review.notes || "Awaiting visual and qualified review."}</p>
  <h3>Proposed {variant} illustrations · {review.status||job.review.status}</h3>
  {complete?<div className="pilot-poses">{job.assets.map((a,i)=><figure key={a.path}><img src={a.path} width={a.width} height={a.height} alt={`${job.canonicalName}, ${job.poses[i].caption}`} onError={()=>setError('A proposed image failed to load; do not approve.')}/><figcaption>{job.poses[i].caption} · {Math.round(a.bytes/1024)} KB · {a.width}×{a.height}</figcaption></figure>)}</div>:<p className="pending-media">{job.generation.status === "failed" ? "Generation failed; replacement required." : "Generation pending."} No substitute drawing.</p>}
  {error&&<p role="alert">{error}</p>}
  <fieldset><legend>Human review — {variant}</legend><p>Check anatomy, highlighted muscles, grip, joint alignment, equipment/cables, pose consistency, clipping, clothing, and phone readability. Exported approval must be explicitly promoted by the local pipeline.</p>
  <label>Reviewer<input value={review.reviewer||''} onChange={e=>save(job.key,{reviewer:e.target.value})}/></label>
  <label>Review notes<textarea rows="4" value={review.notes||''} onChange={e=>save(job.key,{notes:e.target.value})}/></label>
  <label><input type="checkbox" checked={review.qualifiedReview||false} onChange={e=>save(job.key,{qualifiedReview:e.target.checked})}/>Qualified movement/anatomy review completed, including flagged metadata</label>
  <label><input type="checkbox" checked={review.clothingReview||false} onChange={e=>save(job.key,{clothingReview:e.target.checked})}/>Opaque clothing covers front, sides and back in every pose; no cutaways or missing fabric</label>
  <label><input type="checkbox" checked={review.poseReview||false} onChange={e=>save(job.key,{poseReview:e.target.checked})}/>All poses match the exercise, alternate sides correctly where required, and show complete equipment and limbs without clipping</label>
  <div className="pilot-toolbar"><button className="primary" disabled={!canApprove||!!error} onClick={()=>save(job.key,{status:'approved',masterHash:job.master.sha256,assetSignature:job.processingSignature,reviewedAt:new Date().toISOString()})}>Approve variant</button><button className="outline" onClick={()=>save(job.key,{status:'rejected',masterHash:job.master?.sha256,reviewedAt:new Date().toISOString()})}>Reject variant</button><button className="outline" onClick={()=>save(job.key,{status:'pending'})}>Return to pending</button></div></fieldset>
  <details><summary>Exact generation prompt and provenance</summary><p>{job.reference.rights}</p><pre>{job.prompt}</pre></details>
  <p>{manifest.jobs.filter(j=>j.generation.status==='generated').length} / {manifest.jobs.length} masters generated. Reviews saved in this browser; export to preserve and promote.</p>
 </main>
}
createRoot(document.getElementById('root')).render(<App/> )
