// Explicit local promotion from exported human review. Does not trust browser state.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const root='assets/exercise-illustrations/'
const manifest=JSON.parse(readFileSync(root+'manifest.json'))
const reviewPath=process.argv[2];if(!reviewPath)throw Error('Usage: node scripts/illustrations/promote.mjs work/review.json')
const reviews=JSON.parse(readFileSync(reviewPath));const approved=[]
const userAuthorized=process.argv.includes('--user-authorized')
for(const j of manifest.jobs){
 const r=reviews[j.key];if(!r||r.status!==(userAuthorized?'user-authorized':'approved'))continue
 if(j.blockingIssues?.length)throw Error('Unresolved visual blockers: '+j.key)
 const authorization=userAuthorized ? r.authorizedBy==='User in project chat'&&r.statement?.trim()&&r.threadId&&r.authorizedAt : r.qualifiedReview&&r.clothingReview&&r.poseReview
 if(!r.reviewer?.trim()||!r.notes?.trim()||!authorization||r.masterHash!==j.master?.sha256||r.assetSignature!==j.processingSignature||j.assets.length!==j.poses.length)throw Error('Incomplete or stale review: '+j.key)
 if(createHash('sha256').update(readFileSync(j.master.path)).digest('hex')!==r.masterHash)throw Error('Master changed after authorization: '+j.key)
 for(const a of [...j.assets,j.thumbnail]){
  if(!a?.path?.startsWith('/workout/illustration-pilot/')||a.path.includes('..'))throw Error('Invalid path')
  const data=readFileSync('frontend/public'+a.path)
  if(createHash('sha256').update(data).digest('hex')!==a.sha256)throw Error('Asset changed after review')
 }
 approved.push({j,r})
}
// Validate all reviews before publishing any files.
const indexPath='frontend/public/workout/illustration-approved.json'
let index={};try{index=JSON.parse(readFileSync(indexPath))}catch{}
for(const {j,r} of approved){
 const item=structuredClone(j);item.review=r
 for(const a of [...item.assets,item.thumbnail]){
  const dest=a.path.replace('/illustration-pilot/','/illustration-approved/')
  mkdirSync('frontend/public/workout/illustration-approved',{recursive:true})
  copyFileSync('frontend/public'+a.path,'frontend/public'+dest);a.path=dest
 }
 if(!userAuthorized){mkdirSync(root+'approved',{recursive:true});copyFileSync(j.master.path,root+'approved/'+j.key+'.png')}
 const review=userAuthorized?j.review:r
 const publication=userAuthorized?{status:'user-authorized',authorizedAt:r.authorizedAt,threadId:r.threadId,masterHash:r.masterHash,assetSignature:r.assetSignature}:undefined
 index[j.exerciseId]??={};index[j.exerciseId][j.variant]={exerciseId:item.exerciseId,canonicalName:item.canonicalName,variant:item.variant,poses:item.poses,assets:item.assets,thumbnail:item.thumbnail,review:{status:review.status,qualifiedReview:!!review.qualifiedReview,clothingReview:!!review.clothingReview,poseReview:!!review.poseReview},publication,video:item.video}
 if(userAuthorized)j.publicationAuthorization=r;else j.review=r
}
writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n')
writeFileSync(root+'manifest.json',JSON.stringify(manifest,null,2)+'\n')
console.log(`${approved.length} ${userAuthorized?'user-authorized':'reviewed'} variants promoted; no training records changed.`)
