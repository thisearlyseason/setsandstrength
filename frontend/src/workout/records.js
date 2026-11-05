import { hasCompletedWork } from '../lib/workout-model.js'
export function recordBadges(S, w) {
  const out = []
  for (const e of w.entries) {
    const rows = e.sets.filter(hasCompletedWork)
    const previousEntries = S.workouts.flatMap((w) =>
      w.entries.filter((x) => x.id === e.id),
    )
    const volume = (rows) =>
      rows
        .filter(hasCompletedWork)
        .reduce((n, r) => n + (r.w || 0) * (r.r || 0), 0)
    if (
      previousEntries.length &&
      volume(e.sets) > Math.max(...previousEntries.map((x) => volume(x.sets)))
    )
      out.push({ id: e.id, label: 'Volume PR' })
    const previous = S.workouts
      .flatMap((w) => w.entries.filter((x) => x.id === e.id))
      .flatMap((x) => x.sets.filter(hasCompletedWork))
    if (!previous.length) continue
    const metrics = [
      ['Weight PR', (r) => r.w || 0],
      ['Reps PR', (r) => r.r || 0],
      ['Hold PR', (r) => r.sec || 0],
    ]
    for (const [label, value] of metrics)
      if (Math.max(...rows.map(value)) > Math.max(...previous.map(value)))
        out.push({ id: e.id, label })
  }
  if ([1, 5, 10, 25, 50, 100].includes(S.workouts.length + 1))
    out.push({ label: S.workouts.length + 1 + ' workouts completed' })
  return out
}
