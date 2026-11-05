import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './WorkoutApp.jsx'
import './workout.css'
import './intent.css'
import { handOverFromLaunchScreen } from '../lib/boot.js'

handOverFromLaunchScreen()
document.documentElement.lang = 'en'
document.documentElement.dir = 'ltr'
document.title = 'Sets & Strength — Move with intent'
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  navigator.serviceWorker.register('/workout-sw.js').catch(() => {})

import "./layout-refresh.css"
import './visual-dashboard.css'

import "./expressive-ui.css"
