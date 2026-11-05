import { it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RatingExplorer from './RatingExplorer.jsx'
import { trainingReport } from './analysis.js'
it('offers session muscle and exercise rating views with the selected source evidence',()=>{
 const report=trainingReport([{id:'source',d:'2026-11-04',entries:[{id:'x',sets:[{done:true,r:8,rir:2}]}]}],{x:{tg:'chest'}},'2026-11-04')
 const html=renderToStaticMarkup(<RatingExplorer report={report} catalog={{x:{n:'Press'}}}/>)
 expect(html).toContain('Session 2026-11-04')
 expect(html).toContain('Muscle: chest')
 expect(html).toContain('Exercise: Press')
 expect(html).toContain('/progress#workout-source')
 expect(html).toContain('1 / 1')
})
