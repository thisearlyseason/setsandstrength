export const intervalRemaining = (timer, now = Date.now()) => Math.max(0, Math.ceil((timer?.endsAt ? timer.endsAt - now : timer?.remainingMs || 0) / 1000))
export function nextIntervalPhase(timer) {
  if (!timer || timer.phase === 'done') return timer
  if (timer.phase === 'work' && timer.round < timer.rounds) return { ...timer, phase: 'rest' }
  if (timer.phase === 'rest') return { ...timer, phase: 'work', round: timer.round + 1 }
  return { ...timer, phase: 'done', endsAt: 0, remainingMs: 0 }
}
export function catchUpInterval(timer, now = Date.now()) {
  let next = timer
  while (next?.endsAt && next.endsAt <= now && next.phase !== 'done') {
    const oldEnd = next.endsAt
    next = nextIntervalPhase(next)
    if (next.phase === 'done') break
    const duration = next.phase === 'work' ? next.workSec : next.restSec
    next.endsAt = oldEnd + duration * 1000
  }
  return next
}
