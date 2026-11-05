import { useState } from 'react'
import RatingRadar from './RatingRadar.jsx'

export default function RatingExplorer({report,catalog}) {
  const [selected,setSelected]=useState('overall')
  const choices=[{key:'overall',label:'All working sets',rating:report.ratings.overall},
    ...report.ratings.sessions.map(r=>({key:`session:${r.id}`,label:`Session ${r.date}`,rating:r,session:r.id})),
    ...Object.entries(report.muscles).map(([id,r])=>({key:`muscle:${id}`,label:`Muscle: ${id}`,rating:r})),
    ...report.ratings.exercises.map(r=>({key:`exercise:${r.id}`,label:`Exercise: ${catalog[r.id]?.n || r.id}`,rating:r})),]
  const choice=choices.find(c=>c.key===selected) || choices[0]
  return <section><h3>Explore session, muscle and exercise ratings</h3><label>Rating scope<select value={choice.key} onChange={e=>setSelected(e.target.value)}>{choices.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label><p>Each unilateral row counts once. Effort uses the harder completed limb; feel averages completed limbs with ratings. Unfinished limbs are excluded.</p><p>{choice.label}: average RIR {choice.rating.averageRir ?? 'not rated'} from {choice.rating.rirSets} effort ratings; feel {choice.rating.averageFeel ?? 'not rated'} / 5 from {choice.rating.feelSets} ratings.</p><RatingRadar report={choice.rating}/><p>{choice.rating.progression}</p>{choice.session ? <a className="text-link" href={`/progress#workout-${encodeURIComponent(choice.session)}`}>Open source session</a> : <details><summary>Source sessions in this period</summary><ul>{report.ratings.sessions.filter(r=>!choice.rating.sourceIds || choice.rating.sourceIds.includes(r.id)).map(r=><li key={r.id}><a href={`/progress#workout-${encodeURIComponent(r.id)}`}>Session {r.date}</a>: {r.ratedSets} / {r.workingSets} working sets rated</li>)}</ul></details>}</section>
}
