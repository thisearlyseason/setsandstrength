import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import GoalRing from './GoalRing.jsx'
import BodyMap from './BodyMap.jsx'
import CustomWorkout from './CustomWorkout.jsx'
vi.mock('../store/useStore.js',()=>({useStore:selector=>selector({S:{unit:'kg',customEx:[]}})}))
it('announces a ring goal without losing its value above target',()=>{
 const html=renderToStaticMarkup(<GoalRing value={5} target={3} label="Workouts"/>)
 expect(html).toContain('Workouts: 5')
 expect(html).toContain('stroke-dasharray="100 100"')
})
it('renders a female body and keeps missing measurements unknown',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><BodyMap S={{body:'female',unit:'kg',measurements:[]}}/></MemoryRouter>)
 expect(html).toContain('Female figure')
 expect(html).toContain('No reading yet')
 expect(html).not.toContain('0 kg')
})
it.each(['log','plan','workout'])('renders the %s composer without requiring an active workout',type=>{
 const html=renderToStaticMarkup(<MemoryRouter initialEntries={[`/create-workout?type=${type}`]}><CustomWorkout requireUser={()=>true}/></MemoryRouter>)
 expect(html).toContain(type==='log'?'Date completed':type==='plan'?'Add day':'Save workout')
})
