import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Anatomy from './Anatomy.jsx'
import studies from './studies.json'
import { EXDB } from '../lib/exercises-data.js'
import './workout.css'
function Review() {
  const [id, setId] = useState('3948'),
    exercise = EXDB.find((e) => e.id === id),
    study = studies[id]
  return (
    <main className="anatomy-review">
      <header>
        <div>
          <span className="eyebrow">WORKOUT / MOTION REVIEW</span>
          <h1>Anatomy lab</h1>
        </div>
        <select
          aria-label="Exercise"
          value={id}
          onChange={(e) => setId(e.target.value)}
        >
          {Object.keys(studies).map((id) => (
            <option key={id} value={id}>
              {EXDB.find((e) => e.id === id).n}
            </option>
          ))}
        </select>
        <a href="/">Back to Workout</a>
      </header>
      <Anatomy
        key={id}
        motion={study.motion}
        primary={[exercise.tg]}
        secondary={exercise.sm || []}
      />
      <p>
        Z-Anatomy / BodyParts3D anatomical surfaces · original Workout motion.
        Automatic skin weights and exercise technique remain unreviewed.
      </p>
    </main>
  )
}
const root =
  import.meta.hot?.data.root || createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<Review />)
