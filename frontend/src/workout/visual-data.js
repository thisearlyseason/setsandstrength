export function ringProgress(value, target) {
  if (value == null || !Number.isFinite(value) || !Number.isFinite(target) || target <= 0) return null
  return Math.max(0, Math.min(1, value / target))
}
export function measurementTrend(rows, key) {
  const valid = rows.filter(r => r[key] != null && r[key] !== '' && Number.isFinite(Number(r[key]))).slice().sort((a,b)=>a.d.localeCompare(b.d))
  const last=valid.at(-1), previous=valid.at(-2)
  const value=last ? Number(last[key]) : null
  const delta=last && previous ? Math.round((value-Number(previous[key]))*10)/10 : null
  return {value,date:last?.d || null,previousDate:previous?.d || null,delta,direction:delta == null ? 'unknown' : delta>0 ? 'increase' : delta<0 ? 'decrease' : 'steady'}
}
