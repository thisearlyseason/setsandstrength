import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './WorkoutApp.jsx'
import './workout.css'
document.getElementById('boot')?.remove()
document.documentElement.lang = 'en'
document.documentElement.dir = 'ltr'
document.title = 'Workout — Find your next level'
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  navigator.serviceWorker.register('/workout-sw.js').catch(() => {})
