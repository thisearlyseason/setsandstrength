import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import TrainingAnalysis from './TrainingAnalysis.jsx'
import ExerciseProgress from './ExerciseProgress.jsx'
import { todayISO } from '../lib/format.js'

vi.mock('../lib/exercises.js',()=>({allExercises:st=>[...(st.customEx || []),{id:'x',n:'Run',cat:'cardio',tg:'quads',sm:[]}],EXDB:[{id:'x',n:'Run',cat:'cardio',tg:'quads',sm:[]}],EXIDX:{x:{id:'x',n:'Run',cat:'cardio',tg:'quads',sm:[]}},isAssisted:()=>false}))
vi.mock('../store/useStore.js',()=>({useStore:selector=>selector({S:{customEx:[{id:'custom-merged',n:'Merged Chest Press',tg:'chest',cat:'strength',eq:'machine'}],unit:'kg',workouts:[{id:'a',d:todayISO(),entries:[{id:'custom-merged',sets:[{done:true,w:20,r:8,rir:2,feel:4}]},{id:'x',sets:[{done:true,mode:'cardio',min:10,speed:12,distance:2,distanceUnit:'km'}]}]}],routines:[],bodyweight:[],dayPlan:{}}})}))
it('renders training analysis with unrated cardio and explicitly unavailable energy',()=>{
 const html=renderToStaticMarkup(<TrainingAnalysis/> )
 expect(html).toContain('10 min')
 expect(html).toContain('no energy estimates')
 expect(html).toContain('Muscle: quads')
 expect(html).not.toContain('48h')
})
it('renders cardio progress with units, recent values and both named periods',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><ExerciseProgress/></MemoryRouter>)
 expect(html).toContain('12 km/h')
 expect(html).toContain('2 km')
 expect(html).toContain('Recent 30 days')
 expect(html).toContain('Previous 30 days')
 expect(html).toContain('600 sec')
})

it('resolves merged custom canonical exercises from the profile catalog for training credit',()=>{
 const html=renderToStaticMarkup(<TrainingAnalysis/>)
 expect(html).toContain('Exercise: Merged Chest Press')
 expect(html).toContain('1 work sets in 3 local days')
})
it('exposes muscle coverage as a semantic table with descriptive headers and row cells',()=>{
 const html=renderToStaticMarkup(<TrainingAnalysis/>)
 expect(html).toContain('role="table" aria-label="Weekly muscle coverage and recovery context"')
 expect(html.match(/role="columnheader"/g)).toHaveLength(5)
 expect(html.match(/role="rowheader"/g)).toHaveLength(10)
 expect(html.match(/role="cell"/g)).toHaveLength(40)
 expect(html).toContain('Weekly sets: current / prior four-week average')
})
