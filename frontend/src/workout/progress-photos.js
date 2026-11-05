const POSES = new Set(['front', 'side', 'back'])
export const validProgressPhoto = (p) => !!p && typeof p.id === 'string' && /^[a-f0-9]{64}$/.test(p.hash || '') && /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') && POSES.has(p.pose)
export function matchingPhotoPairs(photos = [], pose = 'front') {
  const rows = photos.filter((p) => validProgressPhoto(p) && p.pose === pose).sort((a, b) => a.date.localeCompare(b.date))
  const pairs = []
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) if (rows[i].date !== rows[j].date) pairs.push([rows[i], rows[j]])
  return pairs
}

export function resolvePhotoComparison(pairs, selected, urls) {
  if (!Array.isArray(selected) || selected.length !== 2) return null
  const pair = pairs.find(([a, b]) => a.id === selected[0] && b.id === selected[1])
  return pair && pair.every((p) => typeof urls[p.id] === 'string' && urls[p.id]) ? pair : null
}
