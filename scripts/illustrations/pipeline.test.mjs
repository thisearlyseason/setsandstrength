import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
const manifest=JSON.parse(readFileSync('assets/exercise-illustrations/manifest.json'))
const pilotIds=new Set(['0868','0294','0025','0032','0585','0662','0276','0336','0463','0334','0201','3948'])
const pilotJobs=manifest.jobs.filter(j=>pilotIds.has(j.exerciseId))
test('pilot uses twelve canonical catalog IDs, both variants, and variable pose counts',()=>{
 assert.equal(new Set(pilotJobs.map(j=>j.exerciseId)).size,12)
 assert.equal(pilotJobs.length,24)
 for(const j of manifest.jobs){const ex=JSON.parse(readFileSync(`catalogue/exercises/${j.exerciseId}.json`));assert.equal(ex.name,j.canonicalName);assert.equal(ex.equipment,j.equipment)}
 assert.equal(manifest.jobs.find(j=>j.exerciseId==='0463').poses.length,1)
 assert.equal(manifest.jobs.find(j=>j.exerciseId==='0276').poses.length,4)
})
test('promotion rejects incomplete clothing review without modifying production index',()=>{
 mkdirSync('work/illustrations-pilot',{recursive:true});const j=manifest.jobs.find(j=>j.master)
 const before=readFileSync('frontend/public/workout/illustration-approved.json','utf8')
 const file='work/illustrations-pilot/invalid-review.json'
 writeFileSync(file,JSON.stringify({[j.key]:{status:'approved',reviewer:'Test',notes:'Not a real approval',qualifiedReview:true,masterHash:j.master.sha256}}))
 const result=spawnSync(process.execPath,['scripts/illustrations/promote.mjs',file],{encoding:'utf8'})
 assert.notEqual(result.status,0);assert.match(result.stderr,/Incomplete or stale review/)
 assert.equal(readFileSync('frontend/public/workout/illustration-approved.json','utf8'),before)
})
test('normal build contains no candidate media',()=>assert.equal(existsSync('frontend/dist/workout/illustration-pilot'),false))

test('promotion rejects a stale crop signature even with all review checkboxes set',()=>{
 const j=manifest.jobs.find(j=>j.master)
 const before=readFileSync('frontend/public/workout/illustration-approved.json','utf8')
 const file='work/illustrations-pilot/stale-crop-review.json'
 writeFileSync(file,JSON.stringify({[j.key]:{status:'approved',reviewer:'Test',notes:'Not a real approval',qualifiedReview:true,clothingReview:true,poseReview:true,masterHash:j.master.sha256,assetSignature:'obsolete-crop'}}))
 const result=spawnSync(process.execPath,['scripts/illustrations/promote.mjs',file],{encoding:'utf8'})
 assert.notEqual(result.status,0);assert.match(result.stderr,/Incomplete or stale review/)
 assert.equal(readFileSync('frontend/public/workout/illustration-approved.json','utf8'),before)
})

test('all pilot pose crops have delivery dimensions and content hashes, including grid masters',()=>{
 assert.equal(pilotJobs.length,24)
 assert.equal(pilotJobs.reduce((n,j)=>n+j.assets.length,0),54)
 for(const j of manifest.jobs){
  assert.equal(j.generation.status,'generated')
  assert.equal(j.assets.length,j.poses.length)
  assert.equal(j.processingSignature.length,64)
  for(const a of j.assets){assert.ok(a.width>0&&a.height>0);assert.equal(a.sha256.length,64);assert.ok(existsSync('frontend/public'+a.path));assert.ok(a.path.includes(a.sha256.slice(0,12)))}
 }
 assert.equal(manifest.jobs.find(j=>j.exerciseId==='0336').layout.rows,2)
 assert.equal(manifest.jobs.find(j=>j.exerciseId==='0276').cropBounds.length,4)
})

test('known movement blockers cannot be overridden by an exported approval',()=>{
 const j=manifest.jobs.find(j=>j.blockingIssues?.length)
 assert.ok(j)
 const before=readFileSync('frontend/public/workout/illustration-approved.json','utf8')
 const file='work/illustrations-pilot/blocked-movement-review.json'
 writeFileSync(file,JSON.stringify({[j.key]:{status:'approved',reviewer:'Test',notes:'Not a real approval',qualifiedReview:true,clothingReview:true,poseReview:true,masterHash:j.master.sha256,assetSignature:j.processingSignature}}))
 const result=spawnSync(process.execPath,['scripts/illustrations/promote.mjs',file],{encoding:'utf8'})
 assert.notEqual(result.status,0);assert.match(result.stderr,/Unresolved visual blockers/)
 assert.equal(readFileSync('frontend/public/workout/illustration-approved.json','utf8'),before)
})

test('user authorization cannot publish blocked artwork or a stale asset version',()=>{
 const before=readFileSync('frontend/public/workout/illustration-approved.json','utf8')
 const blocked=manifest.jobs.find(j=>j.blockingIssues?.length)
 const clear=manifest.jobs.find(j=>!j.blockingIssues?.length)
 const file='work/illustrations-pilot/user-publication-invalid.json'
 for(const [j,signature,expected] of [[blocked,blocked.processingSignature,/Unresolved visual blockers/],[clear,'stale',/Incomplete or stale review/]]){
  writeFileSync(file,JSON.stringify({[j.key]:{status:'user-authorized',authorizedBy:'User in project chat',reviewer:'User in project chat',notes:'Test only',statement:'Test authorization',threadId:'test',authorizedAt:'2026-11-04',masterHash:j.master.sha256,assetSignature:signature}}))
  const result=spawnSync(process.execPath,['scripts/illustrations/promote.mjs',file,'--user-authorized'],{encoding:'utf8'})
  assert.notEqual(result.status,0);assert.match(result.stderr,expected)
  assert.equal(readFileSync('frontend/public/workout/illustration-approved.json','utf8'),before)
 }
})

test('catalog queue covers every canonical exercise and both variants without changing IDs',()=>{
 const queue=JSON.parse(readFileSync('assets/exercise-illustrations/catalog-queue.json'))
 assert.equal(queue.jobs.length,5632*2)
 assert.equal(new Set(queue.jobs.map(j=>`${j.exerciseId}:${j.variant}`)).size,queue.jobs.length)
 for(const j of manifest.jobs){const q=queue.jobs.find(q=>q.exerciseId===j.exerciseId&&q.variant===j.variant);assert.equal(q.activeKey,j.key)}
 assert.equal(queue.summary.remainingVariants,queue.jobs.length-manifest.jobs.length)
})
