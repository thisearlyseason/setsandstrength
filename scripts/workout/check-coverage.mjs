import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { EXDB, EXALIAS } from '../../frontend/src/lib/exercises-data.js'
const root = new URL('../../', import.meta.url),
  read = (p) => JSON.parse(readFileSync(new URL(p, root)))
const baseline = read('docs/workout/upstream.json'),
  media = read('frontend/public/workout/media.json'),
  programs = read('frontend/src/workout/programs.json')
const ids = EXDB.map((e) => e.id).sort(),
  mapped = new Map(media.map((m) => [m.exerciseId, m])),
  errors = []
if (JSON.stringify(ids) !== JSON.stringify(baseline.exerciseIds))
  errors.push('Catalog differs from pinned upstream')
if (Object.keys(EXALIAS).length !== baseline.aliases)
  errors.push('Alias count changed')
if (
  media.length !== ids.length ||
  mapped.size !== ids.length ||
  ids.some((id) => !mapped.has(id))
)
  errors.push('Media manifest does not cover catalog exactly once')
if (programs.length !== 35 || new Set(programs.map((p) => p.id)).size !== 35)
  errors.push('Expected 35 distinct programs')
for (const p of programs) {
  if (p.weeks.length !== 4) errors.push(p.id + ' lacks four weeks')
  for (const w of p.weeks)
    for (const s of w.sessions)
      for (const sec of s.sections)
        for (const e of sec.exercises)
          for (const id of [e.id, ...(e.alternatives || [])])
            if (!mapped.has(id)) errors.push('Unknown program exercise ' + id)
}
const assets = new Map()
for (const m of media) {
  if (m.illustrationAsset) {
    if (
      !m.illustrationAsset.startsWith('/workout/illustrations/') ||
      m.illustrationAsset.includes('..') ||
      !existsSync(new URL('frontend/public' + m.illustrationAsset, root))
    )
      errors.push('Missing illustration ' + m.exerciseId)
    else {
      const drawing = read('frontend/public' + m.illustrationAsset)
      if (
        drawing.exerciseId !== m.exerciseId ||
        drawing.motion !== m.motion ||
        drawing.frames?.length !== 61 ||
        drawing.cues?.length !== 4
      )
        errors.push('Invalid illustration ' + m.exerciseId)
    }
  }
  if (!m.model) continue
  const path = new URL('frontend/public' + m.model, root)
  if (
    !m.model.startsWith('/workout/') ||
    m.model.includes('..') ||
    !existsSync(path)
  ) {
    errors.push('Missing or invalid original asset for ' + m.exerciseId)
    continue
  }
  if (!assets.has(m.model)) assets.set(m.model, JSON.parse(readFileSync(path)))
  for (const buffer of assets.get(m.model).buffers || []) {
    if (!buffer.uri || buffer.uri.startsWith('data:')) continue
    const binary = new URL(buffer.uri, path)
    if (
      buffer.uri.includes('..') ||
      buffer.uri.startsWith('/') ||
      !existsSync(binary) ||
      readFileSync(binary).length !== buffer.byteLength
    )
      errors.push('Missing or mismatched model buffer for ' + m.exerciseId)
  }
  if (m.motionAsset) {
    if (
      !m.motionAsset.startsWith('/workout/') ||
      m.motionAsset.includes('..') ||
      !existsSync(new URL('frontend/public' + m.motionAsset, root))
    ) {
      errors.push('Missing independent motion for ' + m.exerciseId)
    } else {
      const clip = read('frontend/public' + m.motionAsset)
      if (
        clip.name !== m.motion ||
        !clip.tracks?.length ||
        !(clip.duration > 0)
      )
        errors.push('Invalid motion clip for ' + m.exerciseId)
      const nodes = new Set(assets.get(m.model).nodes.map((n) => n.name))
      if (clip.tracks?.some((t) => !nodes.has(t.name.split('.')[0])))
        errors.push('Motion targets absent rig node for ' + m.exerciseId)
    }
  } else if (!assets.get(m.model).animations?.some((a) => a.name === m.motion))
    errors.push('Missing motion clip for ' + m.exerciseId)
  if (EXDB.find((e) => e.id === m.exerciseId)?.eq !== m.equipment)
    errors.push('Equipment metadata mismatch for ' + m.exerciseId)
}
const approved = media.filter(
  (m) =>
    m.reviewStatus === 'approved' &&
    (m.model || m.illustrationAsset) &&
    m.motion &&
    m.review?.reviewer &&
    m.review?.date &&
    m.review?.equipmentVerified &&
    m.review?.techniqueVerified &&
    m.review?.anatomyVerified,
)
const report = {
  upstream: baseline.commit,
  catalog: ids.length,
  aliases: baseline.aliases,
  manifest: media.length,
  originalMotionStudies: media.filter((m) => m.reviewStatus === 'draft').length,
  approvedDemonstrations: approved.length,
  pendingDemonstrations: media.filter((m) => m.reviewStatus === 'pending')
    .length,
  programs: programs.length,
  approvedPrograms: programs.filter(
    (p) =>
      p.reviewStatus === 'approved' && p.review?.reviewer && p.review?.date,
  ).length,
  structuralErrors: errors,
  publicLaunchReady: false,
}
report.publicLaunchReady =
  errors.length === 0 &&
  approved.length === ids.length &&
  report.approvedPrograms === 35
writeFileSync(
  new URL('docs/workout/coverage.json', root),
  JSON.stringify(report, null, 2) + '\n',
)
console.log(JSON.stringify(report, null, 2))
if (
  errors.length ||
  (process.argv.includes('--release') && !report.publicLaunchReady)
)
  process.exitCode = 1
