import {readFileSync,existsSync} from 'node:fs'
const {jobs}=JSON.parse(readFileSync('assets/exercise-illustrations/manifest.json'))
const rows=jobs.map(j=>({key:j.key,generation:existsSync(`assets/exercise-illustrations/generated/${j.key}.png`)?'master saved':j.generation.status,review:j.review.status,poses:j.poses.length,attempts:j.generation.attempts}))
if(process.argv.includes('--prompts'))console.log(JSON.stringify(jobs.filter(j=>!existsSync(`assets/exercise-illustrations/generated/${j.key}.png`)).map(j=>({key:j.key,prompt:j.prompt,reference:j.reference,status:j.generation.status})),null,2))
else console.table(rows)
