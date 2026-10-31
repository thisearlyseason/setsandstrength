// Original vector drawing poses, generated from Workout-authored movement curves.
// No upstream exercise imagery or anatomical mesh is sampled or traced.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import * as T from 'three'
import { definitions, pose } from './movements.mjs'
const root = new URL('../../public/workout/illustrations/', import.meta.url)
mkdirSync(root, { recursive: true })
const front = new Set([
  'lateral-raise',
  'sumo-squat',
  'overhead-press',
  'alternating-curl',
  'shrug',
])
const index = {}
for (const d of definitions.filter((d) => d.motion !== 'locomotion')) {
  const frames = []
  for (let i = 0; i <= 60; i++) {
    const raw = pose(
      d.motion,
      (i / 60 +
        (d.motion === 'hinge' || d.motion.includes('bench-press') ? 0.5 : 0)) %
        1,
    ).transforms
    const project = (p) => [
      (front.has(d.motion) ? p[0] + p[2] * 0.18 : p[2] + p[0] * 0.32) * 220 +
        300,
      470 - p[1] * 220,
    ]
    const point = (name) => project(raw[name].position)
    const local = (name, p) =>
      project(
        new T.Vector3(...p)
          .applyQuaternion(new T.Quaternion(...raw[name].quaternion))
          .add(new T.Vector3(...raw[name].position))
          .toArray(),
      )
    frames.push({
      hip: point('pelvis'),
      neck: local('torso', [0, 0.57, 0]),
      head: local('torso', [0, 0.68, 0]),
      chest: local('torso', [0, 0.37, 0.04]),
      L: {
        shoulder: point('upperArmL'),
        elbow: point('forearmL'),
        wrist: point('handL'),
        grip: local('handL', [0, -0.065, 0]),
        hip: point('thighL'),
        knee: point('shinL'),
        ankle: point('footL'),
        toe: local('footL', [0, -0.01, 0.14]),
      },
      R: {
        shoulder: point('upperArmR'),
        elbow: point('forearmR'),
        wrist: point('handR'),
        grip: local('handR', [0, -0.065, 0]),
        hip: point('thighR'),
        knee: point('shinR'),
        ankle: point('footR'),
        toe: local('footR', [0, -0.01, 0.14]),
      },
      bar: point('barbell'),
      barLeft: local('barbell', [-0.7, 0, 0]),
      barRight: local('barbell', [0.7, 0, 0]),
      bench: local('bench', [0, 0.48, 0]),
      benchA: local('bench', [0, 0.48, -0.56]),
      benchB: local('bench', [0, 0.48, 0.56]),
    })
  }
  const phases =
    d.motion === 'unilateral' || d.motion === 'alternating-curl'
      ? [0, 0.25, 0.5, 0.75]
      : [0, 0.25, 0.5, 0.75]
  const catalog = JSON.parse(
    readFileSync(
      new URL(
        '../../../catalogue/exercises/' + d.exerciseId + '.json',
        import.meta.url,
      ),
    ),
  )
  if (d.motion === 'hammer-curl') catalog.instructions[1] = 'Keep your palms facing each other throughout the repetition; do not rotate the wrists into a palms-up curl.'
  const cueIndices = {
    squat: [0, 2, 3, 4],
    'barbell-curl': [0, 1, 2, 4],
    'alternating-curl': [0, 1, 4, 5],
    'loaded-calf-raise': [0, 1, 2, 2],
    'overhead-press': [0, 1, 2, 2],
    'sumo-squat': [0, 2, 3, 5],
    hinge: [1, 2, 3, 4],
    press: [0, 1, 2, 2],
    pull: [1, 3, 4, 4],
    unilateral: [0, 2, 3, 4],
    floor: [1, 3, 4, 5],
    'biceps-curl': [0, 1, 2, 4],
    'hammer-curl': [0, 3, 4, 6],
    'front-raise': [0, 1, 2, 2],
    'lateral-raise': [0, 2, 3, 3],
    shrug: [0, 2, 3, 3],
    'calf-raise': [0, 1, 2, 3],
    plank: [0, 2, 3, 4],
    'bench-press': [2, 3, 4, 5],
    'dumbbell-bench-press': [1, 2, 3, 3],
    'romanian-deadlift': [0, 1, 2, 2],
  }
  const cues = cueIndices[d.motion].map((i) => catalog.instructions[i])
  if (d.motion === 'hammer-curl')
    cues.splice(
      0,
      4,
      'Hold the weights with a neutral grip: palms face each other.',
      'Bend the elbows without rotating the wrists.',
      'Keep the upper arms near your sides and the palms facing inward.',
      'Lower smoothly, retaining the same grip.',
    )
  const data = {
    exerciseId: d.exerciseId,
    motion: d.motion,
    name: catalog.name,
    equipment: d.equipment,
    view: front.has(d.motion) ? 'front' : 'side',
    duration: d.duration,
    frames,
    phases,
    labels: ['Start', 'Move', 'End position', 'Return'],
    instructions: catalog.instructions,
    cues,
    reviewStatus: 'draft',
    provenance:
      'Original Workout vector illustration and motion; no source imagery or mesh used',
  }
  if (d.motion === 'unilateral')
    data.labels = ['Start', 'Left lunge', 'Stand', 'Right lunge']
  if (d.motion === 'alternating-curl')
    data.labels = ['Start', 'Left curl', 'Lower', 'Right curl']
  if (d.motion === 'floor')
    data.labels = ['Tabletop', 'Opposite arm / leg', 'Tabletop', 'Switch sides']
  if (d.motion === 'plank') data.labels = ['Set up', 'Hold', 'Hold', 'Hold']
  writeFileSync(new URL(d.motion + '.json', root), JSON.stringify(data))
  index[d.exerciseId] = {
    motion: d.motion,
    path: '/workout/illustrations/' + d.motion + '.json',
    reviewStatus: 'draft',
  }
}
writeFileSync(
  new URL('../../../src/workout/illustrations.json', root),
  JSON.stringify(index),
)
console.log(
  `Generated ${Object.keys(index).length} original vector pose sequences. Technique approval remains pending.`,
)
