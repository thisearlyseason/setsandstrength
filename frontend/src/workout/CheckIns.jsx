import BodyMap from './BodyMap.jsx'
import BodyGoal from './BodyGoal.jsx'
import { writeWeightGoal } from './home-insights.js'
import { useState } from 'react'
import { Scale, Ruler } from 'lucide-react'
import { todayISO } from '../lib/format.js'
import { useStore } from '../store/useStore.js'
import HistoryChart from './HistoryChart.jsx'
import { estimatedLeanMass } from '../lib/units.js'
import {
  emptyMeasurement,
  fromMeasurementDisplay,
  measurementUnit,
  toMeasurementDisplay,
} from '../lib/measurements.js'

const fields = [
  ['weight', 'Weight'], ['bodyFat', 'Body fat'], ['neck', 'Neck'],
  ['chest', 'Chest'], ['shoulders', 'Shoulders'], ['upperArmLeft', 'Left biceps'],
  ['upperArmRight', 'Right biceps'], ['waist', 'Waist'], ['hips', 'Hips'],
  ['thighLeft', 'Left thigh'], ['thighRight', 'Right thigh'],
]
export default function CheckIns({ S, requireUser }) {
  const [chartField, setChartField] = useState('weight')
  const [date, setDate] = useState(todayISO()),
    [values, setValues] = useState({}),
    [message, setMessage] = useState('')
  const dates = [
    ...new Set([...S.bodyweight, ...S.measurements].map((e) => e.d)),
  ]
    .sort()
    .reverse()
  const unit = (k) =>
    k === 'weight' ? S.unit : measurementUnit(S.unit, { key: k })
  const value = (date, k) =>
    k === 'weight'
      ? S.bodyweight.find((e) => e.d === date)?.w
      : toMeasurementDisplay(
          S.measurements.find((e) => e.d === date)?.[k],
          S.unit,
          { key: k },
        )
  function save(e) {
    e.preventDefault()
    if (!requireUser()) return
    const entered = fields.filter(
      ([k]) => values[k] !== undefined && values[k] !== '' && Number.isFinite(+values[k]) && (k === 'bodyFat' ? +values[k] >= 0 && +values[k] <= 100 : +values[k] > 0),
    )
    if (!entered.length) {
      setMessage('Enter at least one measurement to save.')
      return
    }
    useStore.getState().update((s) => {
      for (const [k] of entered) {
        if (k === 'weight') {
          let row = s.bodyweight.find((x) => x.d === date)
          if (row) {
            row.w = +values[k]
            row.t = Date.now()
            delete row.src
          } else s.bodyweight.push({ d: date, w: +values[k], t: Date.now() })
          s.bodyweight.sort((a, b) => a.d.localeCompare(b.d))
        } else {
          let row = s.measurements.find((x) => x.d === date)
          if (!row) {
            s.measurements.push(emptyMeasurement(date, s.customMeasurements))
            row = s.measurements.at(-1)
          }
          row[k] = fromMeasurementDisplay(values[k], s.unit, { key: k })
          row.t = Date.now()
          s.measurements.sort((a, b) => a.d.localeCompare(b.d))
        }
      }
    })
    setValues({})
    setMessage('Check-in saved.')
  }
  return (
    <section className="check-ins visual-check-ins">
      <BodyMap S={S} onSelect={setChartField}/>
      <BodyGoal S={S} onSave={(value) => { if (!requireUser()) return false; useStore.getState().update((s) => writeWeightGoal(s, value)) }} />
      <details className="check-in-form layout-disclosure"><summary>+ Add a body check-in</summary>
      <p className="eyebrow">YOUR BASELINE</p>
      <h2>Body check-in</h2>
      <p className="muted-copy">
        Log what matters to you. Each reading is compared with your previous
        one.
      </p>
      <form onSubmit={save}>
        <label>
          Date
          <input
            required
            type="date"
            max={todayISO()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setValues({})
              setMessage('')
            }}
          />
        </label>
        <div className="reading-grid">
          {fields.map(([k, label]) => (
            <label key={k}>
              <span>
                {k === 'weight' ? <Scale size={16} /> : <Ruler size={16} />}{' '}
                {label} ({unit(k)})
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0.1"
                step="0.1"
                placeholder={String(value(date, k) ?? '-')}
                value={values[k] ?? ''}
                onChange={(e) => {
                  setValues({ ...values, [k]: e.target.value })
                  setMessage('')
                }}
              />
            </label>
          ))}
        </div>
        <button className="primary">Save check-in</button>
        <span role="status">{message}</span>
      </form>
      </details>
      <label>Chart measurement<select value={chartField} onChange={(e) => setChartField(e.target.value)}>{fields.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <HistoryChart title={fields.find(([key]) => key === chartField)?.[1] || 'Measurement'} unit={unit(chartField)} rows={dates.map((d) => ({ date: d, value: value(d, chartField) })).filter((r) => r.value != null)} />
      {!!dates.length && (
        <details className="week-details">
          <summary>Check-in history</summary>
          {dates.map((d, i) => (
            <div className="check-entry" key={d}>
              <strong>{new Date(d + 'T12:00:00').toLocaleDateString()}</strong>
              {fields.map(([k, label]) => {
                const n = value(d, k)
                if (n == null) return null
                const older = dates
                  .slice(i + 1)
                  .find((day) => value(day, k) != null)
                const delta = older
                  ? Math.round((n - value(older, k)) * 10) / 10
                  : null
                return (
                  <span key={k}>
                    {label}: {n} {unit(k)}
                    {delta != null && (
                      <small>
                        {delta > 0 ? '+' : ''}
                        {delta} {unit(k)} since last
                      </small>
                    )}
                  </span>
                )
              })}
              {(() => {
                const weightRow = S.bodyweight.find((e) => e.d === d)
                const fat = S.measurements.find((e) => e.d === d)?.bodyFat
                const measurements = S.measurements.find((e) => e.d === d)
                const lean = estimatedLeanMass(weightRow, fat, S.unit)
                const ratio = (a, b) => measurements?.[a] > 0 && measurements?.[b] > 0 ? (measurements[a] / measurements[b]).toFixed(2) : null
                return <>
                  {lean != null && <span>Estimated lean mass: {lean} {S.unit}</span>}
                  {ratio('shoulders', 'waist') && <span>Shoulder-to-waist ratio: {ratio('shoulders', 'waist')}</span>}
                  {ratio('chest', 'waist') && <span>Chest-to-waist ratio: {ratio('chest', 'waist')}</span>}
                  <button type="button" className="outline compact" onClick={() => {
                    if (!window.confirm(`Delete the check-in for ${d}?`)) return
                    useStore.getState().update((s) => { s.bodyweight = s.bodyweight.filter((e) => e.d !== d); s.measurements = s.measurements.filter((e) => e.d !== d) })
                    setMessage('Check-in deleted.')
                  }}>Delete check-in</button>
                </>
              })()}
            </div>
          ))}
        </details>
      )}
    </section>
  )
}
