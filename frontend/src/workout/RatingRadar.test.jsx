import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RatingRadar from './RatingRadar.jsx'
import { ratingReport } from './analysis.js'
it('explains insufficient ratings without drawing a score',()=>{
 const html=renderToStaticMarkup(<RatingRadar report={ratingReport([{done:true,rir:2}])}/>)
 expect(html).not.toContain('<polygon')
 expect(html).toContain('5')
 expect(html).toContain('1 / 1')
})
it('provides text values and axis definitions for every visual radar axis',()=>{
 const html=renderToStaticMarkup(<RatingRadar report={ratingReport(Array(5).fill({done:true,rir:2,feel:4}))}/>)
 expect(html).toContain('role="img"')
 expect(html).toContain('<table')
 expect(html).toContain('Reported effort')
 expect(html).toContain('80 / 100')
 expect(html).toContain('subjective scale')
})
