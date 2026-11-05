import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Anatomy from './Illustration.jsx'
import studies from './illustrations.json'
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
          <h1>Illustration studio</h1>
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
        <a href="/illustration-review.html">Anatomical pilot review</a>
        <a href="/">Back to Sets &amp; Strength</a>
      </header>
      <Anatomy
        key={id}
        motion={study.motion}
        primary={[exercise.tg]}
        secondary={exercise.sm || []}
      />
      <p>
        Original 2D drawings and motion. Drafts are checked against catalog
        instructions, but are not professionally approved. Walking and missing
        demonstrations remain pending.
      </p>
    </main>
  )
}
const root =
  import.meta.hot?.data.root || createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<Review />)
