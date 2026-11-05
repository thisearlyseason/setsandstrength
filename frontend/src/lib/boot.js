import { registerPlugin } from '@capacitor/core'

// Let fast starts show one turn of the seal. Slow starts can leave immediately.
export function bootWait(elapsed, duration) {
  if (!Number.isFinite(elapsed) || !Number.isFinite(duration)) return 0
  return Math.max(0, duration - elapsed)
}

export function hideBoot(e) {
  const b = document.getElementById('boot')
  if (!b || b.dataset.leaving) return
  b.dataset.leaving = '1'
  let wait = 0
  if (!(e instanceof Event)) {
    try {
      const spin = b.querySelector('img')?.getAnimations?.()[0]
      wait = bootWait(spin?.currentTime, spin?.effect?.getTiming().duration)
    } catch { wait = 0 }
  }
  setTimeout(() => {
    b.className = 'out'
    setTimeout(() => b.remove(), 260)
  }, wait)
}

// The phone's own launch screen stays up until the page has painted the boot screen, so the
// WebView starting up never shows as seconds of plain black (capacitor.config.json SplashScreen
// also drops it by itself after 8 s, should this never run).
export function handOverFromLaunchScreen() {
  try {
    if (!window.Capacitor?.isNativePlatform?.()) return
    registerPlugin('SplashScreen').hide({ fadeOutDuration: 180 }).catch(() => {})
  } catch { /* no plugin in this build: the launch screen goes on its own */ }
}
