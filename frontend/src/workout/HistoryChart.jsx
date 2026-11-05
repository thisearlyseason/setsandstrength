import { useId, useState } from 'react'
import { todayISO } from '../lib/format.js'

export default function HistoryChart({ title, rows, unit, allowPeriod = true }) {
  const [period, setPeriod] = useState('30'), id = useId()
  const cutoff = new Date(`${todayISO()}T12:00:00`)
  cutoff.setDate(cutoff.getDate() - Number(period) + 1)
  const from = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
  const data = rows.filter((r) => Number.isFinite(r.value) && (!allowPeriod || period === 'all' || r.date >= from)).slice().sort((a, b) => a.date.localeCompare(b.date))
  const min = Math.min(...data.map((r) => r.value)), max = Math.max(...data.map((r) => r.value))
  const points = data.map((r, i) => `${20 + i * 560 / Math.max(1, data.length - 1)},${160 - (r.value - min) * 130 / Math.max(1, max - min)}`).join(' ')
  return <section className="history-chart visual-history-chart"><h3>{title}</h3>{allowPeriod && <label>History range<select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="30">30 days</option><option value="90">90 days</option><option value="all">All history</option></select></label>}{data.length ? <><svg viewBox="0 0 600 190" role="img" aria-labelledby={id}><title id={id}>{title}: {data.length} readings. Values are listed in the table below.</title><path d="M20 10V170H580" fill="none" stroke="currentColor" opacity=".25"/><polygon points={`20,170 ${points} ${20+(data.length-1)*560/Math.max(1,data.length-1)},170`} fill="currentColor" opacity=".09"/><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3"/>{data.map((r, i) => <circle key={i} cx={20 + i * 560 / Math.max(1, data.length - 1)} cy={160 - (r.value - min) * 130 / Math.max(1, max - min)} r="4" fill="currentColor"><title>{r.date}: {r.value} {unit}</title></circle>)}</svg><details><summary>Inspect {data.length} values</summary><div className="chart-values"><table><caption>{title} ({unit})</caption><thead><tr><th>Date</th><th>Value</th></tr></thead><tbody>{data.map((r, i) => <tr key={i}><th scope="row">{r.date}</th><td>{r.value} {unit}</td></tr>)}</tbody></table></div></details></> : <p>No readings in this period.</p>}</section>
}
