import { modeForSet, completedVolumeOf, hasCompletedWork, isSideSet } from '../lib/workout-model.js'
import { speedLabel, toSpeed } from '../lib/speed.js'
const MUSCLE_GROUPS = {
  chest: /chest|pectorals?/, back: /back|lats?|rhomboids?/, shoulders: /shoulders?|delts?/,
  biceps: /biceps?/, triceps: /triceps?/, quads: /quads?|quadriceps/,
  hamstrings: /hamstrings?/, glutes: /glutes?/, calves: /calves?/, core: /core|abs|obliques/,
}
export const isWarmup = set => !!set && (!!set.warmup || [set.phase, set.kind, set.type].some(v=>/^warm[-_ ]?up$/i.test(String(v || '').trim())))
const notWarmup = set => !!set && !isWarmup(set)
export const isWork = set => notWarmup(set) && hasCompletedWork(set) && (!isSideSet(set) || [set.sides.L,set.sides.R].some(isWork))
// Keep the source row intact; numeric samples are only completed limbs. A side-row still
// counts once for coverage, workload and rated-set denominators.
export const completedAnalysisRows = set => !isWork(set) ? [] : isSideSet(set) ? ['L','R'].flatMap(side=>isWork(set.sides[side]) ? [{...set.sides[side],side}] : []) : [set]
export const muscleGroups = Object.keys(MUSCLE_GROUPS)
const numeric = (v) => v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null
const positive = (v) => numeric(v) > 0 ? Number(v) : null
const round = (v) => Math.round(v * 100) / 100
const max = (xs) => xs.length ? Math.max(...xs) : null
export const loggedSeconds = (s) => positive(s.durationSec) ?? positive(s.seconds) ?? ((positive(s.sec) || 0) + (positive(s.min) || 0) * 60 || null)
const loadVolume = s => completedAnalysisRows(s).reduce((n,row)=>n+completedVolumeOf(row),0)
export const musclesOf = (ex) => {
  const text = `${ex?.tg || ''} ${ex?.mg || ''} ${(ex?.sm || []).join(' ')}`.toLowerCase()
  return Object.entries(MUSCLE_GROUPS).filter(([, re]) => re.test(text)).map(([m]) => m)
}
const volumeOf = (workouts) => workouts.reduce((n, w) => n + (w.entries || []).reduce((m, e) => m + (e.sets || []).filter(isWork).reduce((v, s) => v + loadVolume(s), 0), 0), 0)
const dayAt = (d, offset) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + offset); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }

export function exerciseProgress(workouts, exerciseId, { assisted = false, speedUnit = 'kmh', unit = 'kg' } = {}) {
  const sessions = (workouts || []).slice().sort((a,b) => String(a.d).localeCompare(String(b.d))).flatMap((w) => (w.entries || []).filter((e) => String(e.id) === String(exerciseId) && (e.sets || []).some(isWork)).map((e) => ({ workout: w, entry: e })))
  const rows = sessions.flatMap(({ entry }) => entry.sets.filter(isWork))
  const recent = sessions.at(-1), recentRows = recent?.entry.sets.filter(isWork) || []
  const history = sessions.map(({ workout, entry }) => ({ date: workout.d, workoutId: workout.id, sets: entry.sets.filter(isWork) }))
  const sampleRows = rows.flatMap(completedAnalysisRows), recentSamples = recentRows.flatMap(completedAnalysisRows)
  const metrics = []
  const addMetric = (key, label, metricUnit, get, least = false) => {
    const values = sampleRows.map(get).filter(v => v != null)
    if (!values.length) return
    const pick = vs => vs.length ? (least ? Math.min(...vs) : Math.max(...vs)) : null
    metrics.push({ key, label, unit: metricUnit, best: pick(values), recent: pick(recentSamples.map(get).filter(v => v != null)), history: history.map(h => ({date:h.date, value:pick(h.sets.flatMap(completedAnalysisRows).map(get).filter(v=>v!=null))})), least })
  }
  addMetric('load', assisted ? 'Recorded assistance (lower is less assistance)' : 'Recorded load', unit, s=>assisted && numeric(s.w) === 0 ? 0 : positive(s.w), assisted)
  addMetric('reps', 'Repetitions', 'reps', s=>positive(s.r))
  addMetric('duration', 'Logged duration per set', 'sec', loggedSeconds)
  addMetric('speed', 'Recorded speed', speedLabel(speedUnit), s=>positive(s.speed) == null ? null : toSpeed(Number(s.speed), speedUnit))
  for (const distanceUnit of [...new Set(sampleRows.filter(s=>positive(s.distance ?? s.dist)).map(s=>s.distanceUnit || s.distUnit || 'unit not recorded'))]) {
    addMetric(`distance:${distanceUnit}`, 'Recorded distance', distanceUnit, s=>(s.distanceUnit || s.distUnit || 'unit not recorded') === distanceUnit ? positive(s.distance ?? s.dist) : null)
  }
  addMetric('calculatedDistance:km', 'Distance calculated from logged speed × time', 'km', s=>positive(s.speed) && positive(s.min) ? round(Number(s.speed)*Number(s.min)/60) : null)
  const calculatedDistance = metrics.find(m=>m.key==='calculatedDistance:km')
  if (calculatedDistance) calculatedDistance.derived = true
  const metric = key => metrics.find(m=>m.key===key)
  const measured = sampleRows.map(s=>positive(s.w)).filter(v=>v!=null)
  const estimates = assisted ? [] : sampleRows.filter(s=>modeForSet(s)==='reps' && positive(s.w) && positive(s.r) && Number(s.r)<=30).map(s=>Number(s.w)*(1+Number(s.r)/30))
  const ratings = ratingReport(rows)
  return { assisted, metrics, history, sessions:sessions.length, recentDate:recent?.workout.d || null,
    bestLoad:metric('load')?.best ?? null, recentBestLoad:metric('load')?.recent ?? null,
    recentMax:max(recentSamples.map(s=>positive(s.w)).filter(v=>v!=null)), maxLoad:max(measured),
    maxReps:metric('reps')?.best ?? null, recentReps:metric('reps')?.recent ?? null,
    maxDurationSec:metric('duration')?.best ?? null, recentDurationSec:metric('duration')?.recent ?? null,
    maxDistance:metrics.find(m=>m.key.startsWith('distance:'))?.best ?? calculatedDistance?.best ?? null, recentDistance:metrics.find(m=>m.key.startsWith('distance:'))?.recent ?? calculatedDistance?.recent ?? null,
    maxSpeed:metric('speed')?.best ?? null, recentSpeed:metric('speed')?.recent ?? null,
    volume:rows.reduce((n,s)=>n+loadVolume(s),0), estimated1RM:estimates.length ? round(Math.max(...estimates)) : null,
    ...ratings }
}

export function muscleCoverage(workouts, catalogById, today, targets = {}) {
  const days = Array.from({ length: 7 }, (_, i) => dayAt(today, i - 6))
  const credited = Object.fromEntries(Object.keys(MUSCLE_GROUPS).map((m) => [m, new Set()]))
  const evidence = {}
  const dailyLoads = {}
  for (const w of workouts || []) {
    if (!days.includes(w.d)) continue
    const daily = dailyLoads[w.d] ||= Object.fromEntries(Object.keys(MUSCLE_GROUPS).map((m) => [m, 0]))
    for (const muscle of Object.keys(daily)) {
      const sets = (w.entries || []).reduce((n, entry) => n + (musclesOf(catalogById?.[entry.id]).includes(muscle) ? (entry.sets || []).filter(isWork).length : 0), 0)
      daily[muscle] += sets
      if (sets) evidence[`${muscle}:${w.d}`] = [...new Set([...(evidence[`${muscle}:${w.d}`] || []), w.id])]
    }
  }
  for (const [date, daily] of Object.entries(dailyLoads))
    for (const [muscle, sets] of Object.entries(daily)) if (sets >= 3) credited[muscle].add(date)
  const actual = Object.fromEntries(Object.entries(credited).map(([m, set]) => [m, [...set].sort()]))
  return { days, target: Object.fromEntries(Object.keys(MUSCLE_GROUPS).map((m) => [m, Number(targets[m]) || 2])), actual, evidence }
}

export function muscleLastTraining(workouts, catalogById, today) {
  const result = Object.fromEntries(Object.keys(MUSCLE_GROUPS).map((m) => [m, null]))
  for (const w of workouts || []) {
    if (!w.d || w.d > today) continue
    for (const entry of w.entries || []) if ((entry.sets || []).some(isWork)) for (const muscle of musclesOf(catalogById[entry.id])) {
      if (!result[muscle] || result[muscle] < w.d) result[muscle] = w.d
    }
  }
  return result
}

export function monthlyComparison(workouts, today, bodyweight = []) {
  const start = dayAt(today, -29), prevStart = dayAt(today, -59), prevEnd = dayAt(today, -30)
  const current = (workouts || []).filter((w) => w.d >= start && w.d <= today)
  const previous = (workouts || []).filter((w) => w.d >= prevStart && w.d <= prevEnd)
  const workingSets = (ws) => ws.reduce((n, w) => n + (w.entries || []).reduce((a, e) => a + (e.sets || []).filter(isWork).length, 0), 0)
  const metric = (a, b) => ({ current: a, previous: b, changePct: b ? Math.round((a - b) / b * 100) : null })
  const delta = (from, to) => { const rows = (bodyweight || []).filter((x) => x.d >= from && x.d <= to && Number(x.w) > 0).sort((a, b) => a.d.localeCompare(b.d)); return rows.length >= 2 ? Math.round((rows.at(-1).w - rows[0].w) * 1000) / 1000 : null }
  const currentWeight = delta(start, today), previousWeight = delta(prevStart, prevEnd)
  return { sessions: metric(current.length, previous.length), workingSets: metric(workingSets(current), workingSets(previous)), volume: metric(volumeOf(current), volumeOf(previous)), weightChange: { current: currentWeight, previous: previousWeight, change: currentWeight != null && previousWeight != null ? Math.round((currentWeight - previousWeight) * 1000) / 1000 : null }, coverage: { currentDays: current.length ? new Set(current.map((w) => w.d)).size : 0, previousDays: previous.length ? new Set(previous.map((w) => w.d)).size : 0 } }
}

export function comparableLiftChanges(workouts, catalogById, today) {
  const start = dayAt(today, -89), groups = new Map()
  for (const workout of workouts || []) {
    if (workout.d < start || workout.d > today) continue
    for (const entry of workout.entries || []) {
      const ex = catalogById[entry.id]
      if (!ex || !['strength', 'calisthenics', 'olympic'].includes(ex.cat) || /assisted/i.test(`${ex.n} ${ex.eq}`)) continue
      const best = new Map()
      for (const set of (entry.sets || []).flatMap(completedAnalysisRows)) {
        const reps = Number(set.r), load = Number(set.w)
        if (!Number.isFinite(load) || load <= 0 || !Number.isInteger(reps) || reps <= 0) continue
        if (load > (best.get(reps) || 0)) best.set(reps, load)
      }
      for (const [reps, load] of best) {
        const key = `${entry.id}:${reps}`
        if (!groups.has(key)) groups.set(key, { id: entry.id, reps, samples: [] })
        groups.get(key).samples.push({ date: workout.d, load, workoutId: workout.id })
      }
    }
  }
  const out = []
  for (const group of groups.values()) {
    const byDate = new Map()
    for (const sample of group.samples) if (!byDate.has(sample.date) || byDate.get(sample.date).load < sample.load) byDate.set(sample.date, sample)
    const samples = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    if (samples.length < 3) continue
    const first = samples[0], last = samples.at(-1)
    out.push({ ...group, samples, first, last, sampleSize: samples.length, change: last.load - first.load, changePct: Math.round((last.load - first.load) / first.load * 1000) / 10, updated: last.date })
  }
  return out.sort((a, b) => b.sampleSize - a.sampleSize).filter((x, i, all) => all.findIndex((y) => y.id === x.id) === i)
}

export function exercisePeriodComparison(workouts, exerciseId, today, options = {}) {
  const currentStart = dayAt(today, -29), previousStart = dayAt(today, -59), previousEnd = dayAt(today, -30)
  const metric = (start, end) => exerciseProgress((workouts || []).filter((w) => w.d >= start && w.d <= end), exerciseId, options)
  const current = metric(currentStart, today), previous = metric(previousStart, previousEnd)
  return { current, previous, currentRange: `${currentStart} to ${today}`, previousRange: `${previousStart} to ${previousEnd}`, volumeChangePct: previous.volume > 0 ? Math.round((current.volume - previous.volume) / previous.volume * 1000) / 10 : null }
}

// Only actual ratings count. Failure flags and unlogged values are not ratings.
export function ratingReport(sets) {
  const rows = (sets || []).filter(isWork).map(set=>{
    if(!isSideSet(set)) return set
    const sides=completedAnalysisRows(set)
    const rirs=sides.map(s=>numeric(s.rir) ?? (numeric(s.rpe)==null ? null : 10-Number(s.rpe))).filter(v=>v!=null && v>=0 && v<=10)
    const feels=sides.map(s=>numeric(s.feel)).filter(v=>v!=null && v>=1 && v<=5)
    return {done:true,rir:rirs.length ? Math.min(...rirs) : null,feel:feels.length ? feels.reduce((a,b)=>a+b,0)/feels.length : null}
  })
  const rirs = rows.map(s => numeric(s.rir) ?? (numeric(s.rpe) == null ? null : 10 - Number(s.rpe))).filter(v=>v!=null && v>=0 && v<=10)
  const feels = rows.map(s=>numeric(s.feel)).filter(v=>v!=null && v>=1 && v<=5)
  const ratedSets = rows.filter(s=>(numeric(s.rir)!=null && s.rir>=0 && s.rir<=10) || (numeric(s.rpe)!=null && s.rpe>=0 && s.rpe<=10) || (numeric(s.feel)!=null && s.feel>=1 && s.feel<=5)).length
  const average = xs => xs.length ? round(xs.reduce((a,b)=>a+b,0)/xs.length) : null
  const averageRir = average(rirs), averageFeel = average(feels), ratingCoverage = rows.length ? ratedSets/rows.length : 0
  return { workingSets:rows.length, ratedSets, ratingCoverage, rirSets:rirs.length, feelSets:feels.length, averageRir, averageFeel, hardSets:rirs.filter(v=>v<=3).length,
    progression:rirs.length<5 ? 'Log effort on at least 5 working sets before using the effort summary to review progression.' : `Average logged RIR ${averageRir} from ${rirs.length} sets. Review this alongside comparable reps and loads before changing a target.`,
    radar:rirs.length>=5 && feels.length>=5 ? [
      {label:'Rating coverage',value:round(ratingCoverage*100),definition:'Percentage of completed working sets with a valid RIR, RPE or feel rating.'},
      {label:'Reported effort',value:round((10-averageRir)*10),definition:'100 minus average RIR × 10. RPE is converted to RIR as 10 − RPE; higher means closer to reported failure.'},
      {label:'Reported feel',value:round(averageFeel*20),definition:'Average logged feel (1–5) × 20. This is the original subjective scale, not a fitness score.'},
    ] : null }
}

export function trainingReport(workouts, catalogById, today) {
  const start = dayAt(today,-6), recentStart = dayAt(today,-2)
  const selected = (workouts || []).filter(w=>w.d>=start && w.d<=today)
  const allRows = selected.flatMap(w=>(w.entries || []).flatMap(e=>(e.sets || []).filter(isWork).map(set=>({set,entry:e,workout:w}))))
  const sumLogged = values => {const xs=values.filter(v=>v!=null);return xs.length ? xs.reduce((a,b)=>a+b,0) : null}
  const lastTraining = muscleLastTraining(workouts, catalogById, today)
  const muscles = Object.fromEntries(muscleGroups.map(m=>{
    const rows=allRows.filter(row=>musclesOf(catalogById?.[row.entry.id]).includes(m))
    const recent=rows.filter(row=>row.workout.d>=recentStart), ratings=ratingReport(rows.map(row=>row.set))
    const hard=ratingReport(recent.map(row=>row.set)).hardSets
    const lastDate = lastTraining[m], daysSince = lastDate ? Math.round((new Date(`${today}T12:00:00Z`) - new Date(`${lastDate}T12:00:00Z`))/86400000) : null
    return [m,{...ratings,sourceIds:[...new Set(rows.map(row=>row.workout.id))],lastDate,daysSince,recentSets:recent.length,loggedSeconds:sumLogged(rows.map(row=>loggedSeconds(row.set))),
      recovery:(lastDate ? `Last trained ${lastDate} (${daysSince} local days ago). ` : 'No training logged. ') + (recent.length ? `${recent.length} work sets in 3 local days; ${hard} rated close to failure (RIR ≤3). ${recent.length>=6 || hard>=3 ? 'Higher recent workload: consider a lighter exposure if still fatigued.' : 'Review soreness and readiness before the next exposure.'}` : rows.length ? 'No working sets in the last 3 local days; readiness was not measured.' : 'No working sets in the last 7 local days.') }]
  }))
  const byExercise = [...new Set(allRows.map(row=>String(row.entry.id)))].map(id=>({id,sourceIds:[...new Set(allRows.filter(row=>String(row.entry.id)===id).map(row=>row.workout.id))],...ratingReport(allRows.filter(row=>String(row.entry.id)===id).map(row=>row.set))}))
  return {muscles,workingSets:allRows.length,trainingDays:new Set(allRows.map(row=>row.workout.d)).size,
    cardioSeconds:sumLogged(allRows.filter(row=>modeForSet(row.set,row.entry.target)==='cardio' || (catalogById?.[row.entry.id]?.cat==='cardio' && modeForSet(row.set,row.entry.target)==='time')).map(row=>loggedSeconds(row.set))),
    // kcal is an explicit logged/imported field; no duration-based calorie estimate.
    energyKcal:sumLogged(allRows.map(row=>numeric(row.set.kcal)).filter(v=>v!=null && v>=0)),
    ratings:{overall:ratingReport(allRows.map(row=>row.set)),sessions:selected.map(w=>({id:w.id,date:w.d,...ratingReport(allRows.filter(row=>row.workout===w).map(row=>row.set))})),exercises:byExercise}}
}

export function plannedMuscleCoverage(routines, dayPlan, catalogById, today) {
  const start = dayAt(today,-6)
  const planned = Object.fromEntries(muscleGroups.map(m=>[m,[]]))
  const templates = Object.fromEntries(muscleGroups.map(m=>[m,[]]))
  const scheduled = new Set(Object.values(dayPlan || {}).flat())
  const count = routine => {
    const counts = Object.fromEntries(muscleGroups.map(m=>[m,0]))
    for (const entry of routine?.ex || []) {
      if (!isWork({...entry,done:true})) continue
      const n = Array.isArray(entry.sets) ? entry.sets.filter(s=>isWork({...s,done:true})).length : Math.max(0,Math.floor(Number(entry.sets)||0))
      for (const muscle of musclesOf(catalogById?.[entry.id])) counts[muscle]+=n
    }
    return counts
  }
  for (const [date,ids] of Object.entries(dayPlan || {})) {
    if(date<start || date>today) continue
    const counts=Object.fromEntries(muscleGroups.map(m=>[m,0]))
    for(const id of new Set(ids || [])) {const c=count((routines || []).find(r=>r.id===id));for(const m of muscleGroups) counts[m]+=c[m]}
    for(const m of muscleGroups) if(counts[m]>=3) planned[m].push(date)
  }
  for(const routine of routines || []) if(!routine.cancelledAt && !scheduled.has(routine.id)) {
    const counts=count(routine)
    for(const m of muscleGroups) if(counts[m]>=3) templates[m].push(routine.id)
  }
  return {planned,templates}
}
