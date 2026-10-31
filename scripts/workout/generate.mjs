import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { EXDB, EXALIAS } from '../../frontend/src/lib/exercises-data.js'
import { execFileSync } from 'node:child_process'
const dir = new URL('../../', import.meta.url)
process.chdir(dir.pathname)
const source = execFileSync('git', ['rev-parse', 'upstream/main'], {
  encoding: 'utf8',
}).trim()
const named = readdirSync('catalogue/exercises')
  .map((f) => JSON.parse(readFileSync('catalogue/exercises/' + f)))
  .filter((x) => x.name)
// Fork correction: neutral grip remains constant during a hammer curl.
const hammer = named.find((x) => x.id === '0313')
if (hammer)
  hammer.instructions[1] =
    'Keep your palms facing each other throughout the repetition; do not rotate the wrists into a palms-up curl.'
const ids = new Set(EXDB.map((x) => x.id))
if (named.length !== ids.size || named.some((x) => !ids.has(x.id)))
  throw Error('Catalog parity failed')
const sports = [
  [
    'basketball',
    'Basketball',
    'Own the court',
    'Jumping, landing and lateral strength',
    ['3948', '0514', '0336', '0662', '0276'],
  ],
  [
    'hockey',
    'Hockey',
    'Stronger on the ice',
    'Single-leg strength, lateral control and conditioning',
    ['0336', '6607', '0032', '0027', '0701'],
  ],
  [
    'volleyball',
    'Volleyball',
    'Rise above the net',
    'Landing control, jumping and shoulder preparation',
    ['3948', '0514', '0997', '0662', '1241'],
  ],
  [
    'baseball',
    'Baseball',
    'Power every play',
    'Rotation, acceleration and shoulder preparation',
    ['3408', '0336', '0027', '0997', '0276'],
  ],
  [
    'soccer',
    'Soccer',
    'Go the full distance',
    'Change of direction, leg strength and conditioning',
    ['0336', '6607', '3948', '0894', '0701'],
  ],
  [
    'running',
    'Running',
    'Find your stride',
    'Calf capacity, supporting strength and trunk control',
    ['0894', '0336', '3948', '1241', '0276'],
  ],
  [
    'general',
    'General fitness',
    'Built for everyday',
    'Full-body strength, mobility and conditioning',
    ['3948', '0662', '0027', '0032', '0276'],
  ],
]
const tracks = [
  ['beginner', 'Beginner', 'adult'],
  ['intermediate', 'Intermediate', 'adult'],
  ['advanced', 'Advanced', 'adult'],
  ['youth-13', 'Ages 13–15', '13-15'],
  ['youth-16', 'Ages 16–17', '16-17'],
]
const alternatives = {
  '0032': '3948',
  '0027': '3899',
  '0336': '3948',
  '0997': '0662',
  6607: '2258',
  '0894': '2258',
  '0514': '3948',
}
const programs = sports.flatMap(([sport, label, title, focus, movements]) =>
  tracks.map(([track, level, age], i) => {
    const youth = age !== 'adult'
    // Youth foundation is intentionally a different session: coordination, supported control,
    // low-impact movement and supervision; no loaded deadlifts or maximal power prescriptions.
    const youthSkills = {
      basketball: ['3948', '2258', '1241', '0276'],
      hockey: ['6607', '0336', '1241', '0701'],
      volleyball: ['3948', '0997', '1241', '0276'],
      baseball: ['3408', '0997', '1241', '0701'],
      soccer: ['6607', '3948', '0894', '0701'],
      running: ['2258', '0894', '3948', '0276'],
      general: ['3948', '0662', '1241', '0276'],
    }
    const main = youth ? youthSkills[sport] : movements
    const weeks = Array.from({ length: 4 }, (_, w) => ({
      week: w + 1,
      note: youth
        ? [
            'Learn each movement with an adult supervisor.',
            'Repeat with control; add no load automatically.',
            'Improve consistency, not maximum effort.',
            'Review technique and enjoyment with your supervisor.',
          ][w]
        : [
            'Establish comfortable starting loads and clean technique.',
            'Repeat good sessions; use logged performance to guide progression.',
            'Progress only when target repetitions remain controlled.',
            'Reduce volume and review your baseline.',
          ][w],
      sessions: Array.from({ length: youth ? 2 : 3 }, (_, day) => ({
        name: [
          'Movement foundation',
          'Strength & control',
          'Conditioning & balance',
        ][day],
        offset: w * 7 + [0, 2, 4][day],
        sections: [
          {
            name: 'Warm-up',
            exercises: ['2258', '3408'].map((id) => ({
              id,
              sets: 1,
              reps: 8,
              sec: id === '2258' ? 120 : 0,
              mode: id === '2258' ? 'time' : 'reps',
              weight: 0,
              rest: 30,
            })),
          },
          {
            name: 'Main',
            exercises: main
              .filter(
                (id, j) =>
                  youth || day === 0 || (day === 1 ? j % 2 === 0 : j % 2 === 1),
              )
              .map((id, j) => ({
                id,
                sets: w === 3 ? 2 : youth ? 2 : i + 2,
                reps: youth ? (age === '13-15' ? 6 : 8) : 8,
                weight: 0,
                rest: youth ? 90 : 75,
                mode: 'reps',
                policy: youth ? 'off' : 'double',
                repsMin: 6,
                alternatives: alternatives[id] ? [alternatives[id]] : [],
                note: youth
                  ? 'Adult supervision. Stop when control or comfort changes.'
                  : j === 1
                    ? 'Keep every repetition controlled.'
                    : '',
              })),
          },
          {
            name: 'Cooldown',
            exercises: [{ id: '1051', sets: 1, reps: 6, weight: 0, rest: 30 }],
          },
        ],
      })),
    }))
    return {
      id: `${sport}-${track}`,
      version: 1,
      sport,
      label,
      title,
      focus,
      track,
      level,
      ageBand: age,
      reviewStatus: 'draft',
      weeks,
      duration: 4,
      supervision: youth
        ? 'Adult supervision required'
        : 'Self-directed adult training',
      description: youth
        ? 'Movement skills, coordination and controlled practice. Draft for qualified youth-coaching review.'
        : 'A four-week foundation with adjustable scheduling and equipment substitutions. Draft for qualified coaching review.',
    }
  }),
)
for (const p of programs)
  for (const w of p.weeks)
    for (const s of w.sessions)
      for (const section of s.sections)
        for (const e of section.exercises)
          if (!ids.has(e.id)) throw Error('Unknown exercise ' + e.id)
const drawings = JSON.parse(
  readFileSync('frontend/src/workout/illustrations.json'),
)
const pilots = Object.fromEntries(
  Object.entries(drawings).map(([id, d]) => [id, d.motion]),
)
const manifest = EXDB.map((x) => ({
  exerciseId: x.id,
  model: null,
  medium: 'vector-illustration',
  illustrationAsset: drawings[x.id]?.path || null,
  motion: pilots[x.id] || null,
  motionAsset: null,
  assetVersion: pilots[x.id] ? 'illustrations-v1' : null,
  equipment: x.eq,
  camera: [3, 2, 5],
  primary: [x.tg],
  secondary: x.sm || [],
  provenance: pilots[x.id]
    ? 'Original Workout 2D vector drawings and movement curves; no upstream imagery or anatomical mesh used; technique review pending'
    : null,
  reviewStatus: pilots[x.id] ? 'draft' : 'pending',
  difficulty: null,
  movement: pilots[x.id] || null,
}))
mkdirSync('frontend/public/workout', { recursive: true })
writeFileSync(
  'frontend/public/workout/catalog.json',
  JSON.stringify(Object.fromEntries(named.map((x) => [x.id, x]))),
)
writeFileSync('frontend/public/workout/media.json', JSON.stringify(manifest))
writeFileSync(
  'frontend/src/workout/studies.json',
  JSON.stringify(
    Object.fromEntries(
      manifest.filter((m) => m.model).map((m) => [m.exerciseId, m]),
    ),
  ),
)
writeFileSync('frontend/src/workout/programs.json', JSON.stringify(programs))
writeFileSync(
  'docs/workout/upstream.json',
  JSON.stringify(
    {
      repository: 'https://github.com/DuarteSantos8/openGym',
      commit: source,
      namedExercises: EXDB.length,
      aliases: Object.keys(EXALIAS).length,
      exerciseIds: [...ids].sort(),
    },
    null,
    2,
  ),
)
const q = (v) => "'" + JSON.stringify(v).replaceAll("'", "''") + "'::jsonb"
const sql = [
  '-- Generated by scripts/workout/generate.mjs. No user records are seeded.',
]
for (const x of named)
  sql.push(
    `insert into public.exercise_catalog(id,metadata) values ('${x.id}',${q(x)}) on conflict(id) do update set metadata=excluded.metadata;`,
  )
for (const x of programs)
  sql.push(
    `insert into public.program_templates(id,version,review_status,content) values ('${x.id}',1,'draft',${q(x)}) on conflict(id) do update set content=excluded.content;`,
  )
for (const x of manifest)
  sql.push(
    `insert into public.exercise_media(exercise_id,manifest,review_status) values ('${x.exerciseId}',${q(x)},'${x.reviewStatus}') on conflict(exercise_id) do update set manifest=excluded.manifest, review_status=excluded.review_status;`,
  )
writeFileSync('supabase/seed.sql', sql.join('\n'))
console.log(
  `Preserved ${EXDB.length} exercises, ${Object.keys(EXALIAS).length} aliases; generated ${programs.length} draft programs and ${manifest.length} media entries.`,
)
