import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { EXDB, EXALIAS } from '../../frontend/src/lib/exercises-data.js'
const root='assets/exercise-illustrations/'
const records=readdirSync('catalogue/exercises').map(f=>JSON.parse(readFileSync('catalogue/exercises/'+f))).filter(e=>e.name)
const selected={ '0868':['Start','Curl'], '0294':['Start','Curl'], '0025':['Arms extended','Lower to chest'], '0032':['Floor setup','Standing'], '0585':['Knees bent','Extend knees'], '0662':['High plank','Lower'], '0276':['Tabletop','Right arm and left leg extend','Return to tabletop','Left arm and right leg extend'], '0336':['Stand','Right lunge','Return','Left lunge'], '0463':['Hold'], '0334':['Start','Raise'], '0201':['Elbows bent','Extend elbows'], '3948':['Stand','Squat'] }
const stylePolicy=JSON.parse(readFileSync(root+'style-policy.json'))
const style='anatomical-white-v1'
const jobs=[]
for(const [id,poses] of Object.entries(selected)) {
 const e=records.find(e=>e.id===id); if(!e)throw Error(id)
 for(const variant of ['male','female']){
 const key=`${id}-${variant}-${style}`
 const prompt=`Use case: scientific-educational. Create a premium anatomical exercise illustration master, ${poses.length} equally sized panels in one horizontal row, separated by white gutters. Exercise: ${e.name} (${id}). Adult ${variant} model. Same person, camera, scale, equipment and lighting in every panel. Poses left to right: ${poses.join('; ')}. Instructions: ${e.instructions.join(' ')} Equipment: ${e.equipment}. Primary muscle metadata: ${e.target}; detailed primary map: ${(e.muscleMap?.primaries||[]).join(', ')||'not provided; requires qualified review'}. User-approved reference supplies style only: clean white background, grayscale anatomical detail, realistic proportions, red primary muscles, crisp detail and subtle shadows. Black shorts and shoes; female wears fitted sports bra, equal anatomical detail on visible muscle regions. Keep entire body and equipment visible. Correct joints, grips, cable routing and contact points. No text, captions, numbers, watermark, labels or decorative graphics. This is a sequence of still positions, not a movement video. ${stylePolicy.prompt} For leg extension use a selectorized stack machine, knee pivot aligned, shin roller above ankle (catalog wording footpad needs review).`
 jobs.push({key,exerciseId:id,canonicalName:e.name,variant,styleVersion:style,poses:poses.map((caption,i)=>({key:`p${i+1}`,caption})),equipment:e.equipment,primaryMuscles:e.muscleMap?.primaries||[e.target],metadataReview:!e.muscleMap?'Detailed muscle map absent; review target-to-anatomy mapping.':id==='0585'?'Footpad wording ambiguous; verify selectorized machine setup.':'Verify mapped regions and technique.',prompt,reference:{path:'.codex-attachments/2a25511d-6187-4051-944f-3bfcad230b73/97613625-9eb8-4ac5-8701-9647255d489f/10610.png',rights:'User confirmed ownership / permission for AI reference use in chat on 2026-10-31. No upstream media used as generation input.'},generation:{status:'pending',attempts:0},review:{status:'pending',notes:'',reviewer:''},assets:[],video:null})
 }
}
const path=root+'manifest.json'; const old=existsSync(path)?JSON.parse(readFileSync(path)).jobs:[]
for(let i=0;i<jobs.length;i++){const prior=old.find(j=>j.exerciseId===jobs[i].exerciseId&&j.variant===jobs[i].variant);if(prior)jobs[i]=prior}
// Preserve expanded catalog batches when regenerating the original pilot.
for(const prior of old){if(!jobs.some(j=>j.exerciseId===prior.exerciseId&&j.variant===prior.variant))jobs.push(prior)}
writeFileSync(path,JSON.stringify({schemaVersion:1,styleVersion:'per-variant',jobs},null,2)+'\n')
const missing={};for(const k of ['equipment','target','instructions','muscleMap','difficulty'])missing[k]=records.filter(e=>!e[k]||Array.isArray(e[k])&&!e[k].length).map(e=>e.id)
const aliasCount=Object.keys(EXALIAS).length
const audit={namedExercises:records.length,stableIdCount:new Set(records.map(e=>e.id)).size,compiledCatalogCount:EXDB.length,aliasCount,missing,duplicateNames:Object.entries(Object.groupBy(records,e=>e.name)).filter(([,a])=>a.length>1).map(([name,a])=>({name,ids:a.map(e=>e.id)})),equipment:Object.entries(Object.groupBy(records,e=>e.equipment)).map(([name,a])=>({name,count:a.length})),pilotExercises:12,variantMasters:jobs.length,poseImages:jobs.reduce((n,j)=>n+j.poses.length,0),thumbnails:jobs.length,fullCatalogPoseCount:null,fullCatalogReason:'Pose counts require per-exercise classification and qualified review; cannot assume two poses.'}
writeFileSync(root+'audit.json',JSON.stringify(audit,null,2)+'\n')
console.log(JSON.stringify({...audit,missing:Object.fromEntries(Object.entries(missing).map(([k,v])=>[k,v.length])),duplicateNames:audit.duplicateNames.length},null,2))
