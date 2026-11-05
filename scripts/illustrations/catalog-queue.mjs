// Catalog-wide MEDIA queue. Exercise records remain in catalogue/exercises/.
// No network, generation, approval or publication side effects.
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root='assets/exercise-illustrations/'
const manifest=JSON.parse(readFileSync(root+'manifest.json'))
const records=readdirSync('catalogue/exercises').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync('catalogue/exercises/'+f))).filter(e=>e.name).sort((a,b)=>a.id.localeCompare(b.id))
const path=root+'catalog-queue.json'
const prior=existsSync(path)?JSON.parse(readFileSync(path)): {jobs:[]}
const old=new Map(prior.jobs.map(j=>[`${j.exerciseId}:${j.variant}`,j]))
const jobs=records.flatMap(e=>['male','female'].map(variant=>{
 const media=manifest.jobs.find(j=>j.exerciseId===e.id&&j.variant===variant)
 const fingerprint=createHash('sha256').update(JSON.stringify(e)).digest('hex')
 const previous=old.get(`${e.id}:${variant}`)
 const stable=previous?.metadataHash===fingerprint
 return {exerciseId:e.id,variant,source:`catalogue/exercises/${e.id}.json`,metadataHash:fingerprint,
  activeKey:media?.key||null,status:media?'generated-awaiting-review':stable?previous.status:'needs-pose-planning',
  requiredPoses:media?.poses|| (stable?previous.requiredPoses:null),
  issues:media?.blockingIssues||[...(!e.muscleMap?['Detailed muscle mapping needs review']:[]),'Pose count and exercise-specific technique must be planned before generation'],
  attempts:media?.generation?.attempts||previous?.attempts||0}
}))
const summary={exerciseCount:records.length,requiredVariants:jobs.length,generatedVariants:jobs.filter(j=>j.activeKey).length,remainingVariants:jobs.filter(j=>!j.activeKey).length,approvedVariants:manifest.jobs.filter(j=>j.review.status==='approved').length,blockedVariants:manifest.jobs.filter(j=>j.blockingIssues?.length).length,knownPoseImages:manifest.jobs.reduce((n,j)=>n+j.poses.length,0),totalPoseImages:null,costUSD:null,costNote:'No purchases or paid API authorized. Total image cost unavailable; unknown pose counts prevent a complete storage estimate.'}
const policyPath=root+'production-policy.json'
if(existsSync(policyPath)){
 const policy=JSON.parse(readFileSync(policyPath))
 const exceptions=new Set(policy.femaleExceptionExerciseIds||[])
 const active=jobs.filter(j=>policy.defaultVariants.includes(j.variant)||(j.variant==='female'&&exceptions.has(j.exerciseId)))
 summary.activePhase={name:policy.phase,requiredVariants:active.length,generatedVariants:active.filter(j=>j.activeKey).length,remainingVariants:active.filter(j=>!j.activeKey).length,blockedVariants:active.filter(j=>j.activeKey&&manifest.jobs.find(m=>m.key===j.activeKey)?.blockingIssues?.length).length}
}
writeFileSync(path,JSON.stringify({schemaVersion:1,summary,jobs})+'\n')
writeFileSync(root+'catalog-coverage.json',JSON.stringify(summary,null,2)+'\n')
console.log(JSON.stringify(summary,null,2))
