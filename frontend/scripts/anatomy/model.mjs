// Original parametric surface authoring. No downloaded meshes or upstream imagery.
import * as T from 'three'
export const VERSION = 'anatomy-v2'
const flesh = new T.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.62,
})
const fascia = new T.MeshStandardMaterial({ color: 0xd9cbb5, roughness: 0.72 })
const deepTissue = new T.MeshStandardMaterial({
  color: 0x65352e,
  roughness: 0.85,
})
const skin = new T.MeshStandardMaterial({ color: 0xb59b88, roughness: 0.76 })
const rubber = new T.MeshStandardMaterial({ color: 0x252d32, roughness: 0.8 })
const steel = new T.MeshStandardMaterial({
  color: 0xa8b0b8,
  metalness: 0.85,
  roughness: 0.3,
})
const v = (a) => new T.Vector3(...a)
function mesh(parent, name, geometry, material, p = [0, 0, 0]) {
  const m = new T.Mesh(geometry, material)
  m.name = name
  m.position.set(...p)
  parent.add(m)
  return m
}
function ell(parent, name, p, s, mat = fascia) {
  const m = mesh(parent, name, new T.SphereGeometry(1, 32, 24), mat, p)
  m.scale.set(...s)
  return m
}
// Fusiform surfaces have asymmetric bellies, tendon ends and longitudinal fascicle ridges.
// Fiber color and relief are geometry/vertex data: crisp at any texture sampling resolution.
function muscle(parent, name, region, start, end, width, depth, bow = 0) {
  const a = v(start),
    b = v(end),
    axis = b.clone().sub(a),
    length = axis.length()
  const orientation = new T.Quaternion().setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    axis.normalize(),
  )
  const positions = [],
    colors = [],
    indices = [],
    rings = 28,
    sides = 40
  for (let j = 0; j <= rings; j++) {
    const t = j / rings,
      belly = Math.pow(Math.sin(Math.PI * t), 0.7),
      taper = 0.12 + 0.88 * belly
    for (let k = 0; k <= sides; k++) {
      const theta = (k / sides) * Math.PI * 2,
        ridge = 1 + 0.018 * Math.cos(theta * 24 + t * 2)
      const p = new T.Vector3(
        Math.cos(theta) * width * taper * ridge + bow * Math.sin(Math.PI * t),
        t * length,
        Math.sin(theta) * depth * taper * ridge,
      )
      positions.push(...p.applyQuaternion(orientation).add(a).toArray())
      const tendon = Math.pow(Math.abs(2 * t - 1), 12),
        fiber = 0.5 + 0.5 * Math.cos(theta * 24 + t * 2)
      const c = new T.Color()
        .setRGB(
          0.32 + 0.11 * fiber,
          0.065 + 0.035 * fiber,
          0.055 + 0.025 * fiber,
        )
        .lerp(new T.Color(0xdacbb6), tendon * 0.92)
      colors.push(c.r, c.g, c.b)
      if (j < rings && k < sides) {
        const n = j * (sides + 1) + k
        indices.push(
          n,
          n + sides + 1,
          n + 1,
          n + 1,
          n + sides + 1,
          n + sides + 2,
        )
      }
    }
  }
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  const m = mesh(parent, name, g, flesh)
  m.userData = {
    region,
    anatomicalName: name,
    authorship: 'Workout parametric source',
    reviewStatus: 'draft',
  }
  return m
}
function rod(parent, name, a, b, r, mat = fascia) {
  const av = v(a),
    bv = v(b),
    m = mesh(
      parent,
      name,
      new T.CylinderGeometry(r, r, bv.distanceTo(av), 16),
      mat,
      av.clone().add(bv).multiplyScalar(0.5).toArray(),
    )
  m.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    bv.sub(av).normalize(),
  )
  return m
}
export function createModel() {
  const scene = new T.Scene(),
    nodes = {}
  function group(name) {
    const g = new T.Group()
    g.name = name
    scene.add(g)
    nodes[name] = g
    return g
  }
  const pelvis = group('pelvis'),
    torso = group('torso')
  const core = new T.LatheGeometry(
    [
      [0.13, -0.03],
      [0.14, 0.02],
      [0.115, 0.1],
      [0.125, 0.19],
      [0.17, 0.29],
      [0.185, 0.37],
      [0.16, 0.43],
      [0.06, 0.48],
    ].map(([r, y]) => new T.Vector2(r, y)),
    64,
  )
  const coreMesh = mesh(torso, 'deep_trunk_tissue', core, deepTissue)
  coreMesh.scale.z = 0.58
  ell(pelvis, 'pelvic_fascia', [0, 0, 0], [0.145, 0.115, 0.105])
  // Anterior rectus, obliques, serratus; posterior erectors, trapezius and latissimus.
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R'
    for (let row = 0; row < 4; row++)
      muscle(
        torso,
        `rectus_abdominis_${side}_${row}`,
        'abdominals',
        [s * 0.043, 0.035 + row * 0.069, 0.105],
        [s * 0.043, 0.094 + row * 0.069, 0.115],
        0.037,
        0.022,
      )
    muscle(
      torso,
      `external_oblique_${side}`,
      'abdominals',
      [s * 0.105, 0.02, 0.065],
      [s * 0.16, 0.25, 0.075],
      0.047,
      0.031,
      s * 0.018,
    )
    for (let row = 0; row < 3; row++)
      muscle(
        torso,
        `serratus_anterior_${side}_${row}`,
        'serratus',
        [s * 0.12, 0.25 + row * 0.037, 0.1],
        [s * 0.19, 0.29 + row * 0.037, 0.035],
        0.018,
        0.015,
      )
    for (let band = 0; band < 3; band++)
      muscle(
        torso,
        `pectoralis_major_${side}_${band}`,
        'pectorals',
        [s * 0.014, 0.31 + band * 0.045, 0.104],
        [s * 0.205, 0.405, 0.08],
        0.038,
        0.038,
      )
    muscle(
      torso,
      `latissimus_dorsi_${side}`,
      'lats',
      [s * 0.06, 0.04, -0.09],
      [s * 0.195, 0.36, -0.055],
      0.068,
      0.035,
    )
    muscle(
      torso,
      `erector_spinae_${side}`,
      'spine',
      [s * 0.04, 0.015, -0.102],
      [s * 0.045, 0.43, -0.095],
      0.025,
      0.025,
    )
    muscle(
      torso,
      `trapezius_upper_${side}`,
      'traps',
      [s * 0.025, 0.57, -0.01],
      [s * 0.205, 0.425, -0.012],
      0.033,
      0.031,
    )
    muscle(
      torso,
      `trapezius_lower_${side}`,
      'traps',
      [s * 0.015, 0.25, -0.12],
      [s * 0.15, 0.425, -0.08],
      0.036,
      0.023,
    )
    muscle(
      torso,
      `infraspinatus_${side}`,
      'upper back',
      [s * 0.065, 0.39, -0.12],
      [s * 0.205, 0.39, -0.055],
      0.042,
      0.025,
    )
    muscle(
      pelvis,
      `gluteus_maximus_${side}`,
      'glutes',
      [s * 0.07, 0.035, -0.075],
      [s * 0.105, -0.1, -0.075],
      0.087,
      0.061,
    )
    muscle(
      pelvis,
      `gluteus_medius_${side}`,
      'glutes',
      [s * 0.095, 0.07, -0.01],
      [s * 0.145, -0.04, -0.01],
      0.045,
      0.045,
    )
    rod(
      torso,
      `clavicle_${side}`,
      [0, 0.455, 0.07],
      [s * 0.205, 0.43, 0.015],
      0.012,
    )
    const upper = group('upperArm' + side),
      fore = group('forearm' + side),
      hand = group('hand' + side)
    rod(
      upper,
      'upper_arm_fascia_' + side,
      [0, -0.02, 0],
      [0, -0.29, 0],
      0.031,
      deepTissue,
    )
    rod(
      fore,
      'forearm_fascia_' + side,
      [0, -0.01, 0],
      [0, -0.25, 0],
      0.024,
      deepTissue,
    )
    ell(upper, 'humeral_head_' + side, [0, -0.02, 0], [0.055, 0.055, 0.055])
    muscle(
      upper,
      `deltoid_anterior_${side}`,
      'deltoids',
      [0, 0.015, 0.015],
      [0, -0.14, 0.018],
      0.066,
      0.048,
    )
    muscle(
      upper,
      `deltoid_posterior_${side}`,
      'deltoids',
      [0, 0.015, -0.025],
      [0, -0.15, -0.015],
      0.06,
      0.04,
    )
    muscle(
      upper,
      `biceps_brachii_${side}`,
      'biceps',
      [0, -0.06, 0.027],
      [0, -0.285, 0.019],
      0.042,
      0.04,
    )
    muscle(
      upper,
      `triceps_brachii_${side}`,
      'triceps',
      [0, -0.065, -0.03],
      [0, -0.3, -0.018],
      0.048,
      0.038,
    )
    muscle(
      upper,
      `brachialis_${side}`,
      'biceps',
      [s * 0.03, -0.12, 0.005],
      [s * 0.028, -0.3, 0.006],
      0.026,
      0.026,
    )
    ell(fore, 'elbow_' + side, [0, 0, 0], [0.036, 0.036, 0.036])
    muscle(
      fore,
      `brachioradialis_${side}`,
      'forearms',
      [s * 0.02, -0.015, 0.012],
      [s * 0.018, -0.245, 0.01],
      0.033,
      0.031,
    )
    for (let i = 0; i < 3; i++)
      muscle(
        fore,
        `forearm_flexor_${side}_${i}`,
        'forearms',
        [(i - 1) * 0.021, -0.035, 0.025],
        [(i - 1) * 0.012, -0.25, 0.018],
        0.017,
        0.02,
      )
    muscle(
      fore,
      `forearm_extensors_${side}`,
      'forearms',
      [0, -0.025, -0.02],
      [0, -0.25, -0.015],
      0.032,
      0.025,
    )
    ell(hand, 'palm_' + side, [0, -0.045, 0], [0.044, 0.062, 0.022], skin)
    for (let finger = 0; finger < 4; finger++) {
      let x = (finger - 1.5) * 0.022
      const length = [0.063, 0.077, 0.071, 0.054][finger]
      rod(
        hand,
        `finger_${side}_${finger}`,
        [x, -0.075, 0.003],
        [x, -0.075 - length, 0.006],
        0.009,
        skin,
      )
      for (let j = 0; j < 3; j++)
        ell(
          hand,
          `knuckle_${side}_${finger}_${j}`,
          [x, -0.078 - (j * length) / 3, 0.009],
          [0.0095, 0.011, 0.0095],
          skin,
        )
    }
    rod(
      hand,
      'thumb_' + side,
      [s * 0.035, -0.015, 0],
      [s * 0.07, -0.067, 0.014],
      0.013,
      skin,
    )
    const thigh = group('thigh' + side),
      shin = group('shin' + side),
      foot = group('foot' + side)
    rod(
      thigh,
      'femoral_fascia_' + side,
      [0, -0.025, 0],
      [0, -0.41, 0],
      0.043,
      deepTissue,
    )
    muscle(
      thigh,
      `rectus_femoris_${side}`,
      'quadriceps',
      [0, -0.025, 0.05],
      [0, -0.385, 0.04],
      0.057,
      0.045,
    )
    muscle(
      thigh,
      `vastus_lateralis_${side}`,
      'quadriceps',
      [s * 0.045, -0.035, 0.015],
      [s * 0.043, -0.365, 0.026],
      0.052,
      0.05,
    )
    muscle(
      thigh,
      `vastus_medialis_${side}`,
      'quadriceps',
      [-s * 0.022, -0.16, 0.04],
      [-s * 0.034, -0.395, 0.035],
      0.039,
      0.033,
    )
    muscle(
      thigh,
      `biceps_femoris_${side}`,
      'hamstrings',
      [s * 0.035, -0.02, -0.05],
      [s * 0.035, -0.405, -0.025],
      0.04,
      0.041,
    )
    muscle(
      thigh,
      `semitendinosus_${side}`,
      'hamstrings',
      [-s * 0.028, -0.02, -0.05],
      [-s * 0.024, -0.405, -0.025],
      0.034,
      0.038,
    )
    muscle(
      thigh,
      `adductor_longus_${side}`,
      'adductors',
      [-s * 0.03, -0.01, 0],
      [-s * 0.046, -0.29, 0.005],
      0.041,
      0.034,
    )
    muscle(
      thigh,
      `sartorius_${side}`,
      'quadriceps',
      [s * 0.06, -0.015, 0.067],
      [-s * 0.038, -0.4, 0.049],
      0.011,
      0.009,
    )
    ell(shin, 'patella_' + side, [0, 0, 0.035], [0.033, 0.039, 0.017])
    rod(shin, 'tibia_' + side, [0, -0.045, 0.017], [0, -0.37, 0.016], 0.016)
    for (const k of [-1, 1])
      muscle(
        shin,
        `gastrocnemius_${side}_${k}`,
        'calves',
        [k * 0.023, -0.025, -0.021],
        [k * 0.013, -0.29, -0.028],
        0.03,
        0.039,
      )
    muscle(
      shin,
      `tibialis_anterior_${side}`,
      'tibialis',
      [s * 0.025, -0.03, 0.024],
      [s * 0.018, -0.36, 0.021],
      0.022,
      0.022,
    )
    rod(
      shin,
      'achilles_tendon_' + side,
      [0, -0.25, -0.036],
      [0, -0.415, -0.03],
      0.012,
    )
    ell(foot, 'heel_' + side, [0, 0.018, -0.025], [0.045, 0.047, 0.06], skin)
    ell(foot, 'instep_' + side, [0, 0.012, 0.053], [0.047, 0.043, 0.092], skin)
    for (let toe = 0; toe < 5; toe++)
      ell(
        foot,
        `toe_${side}_${toe}`,
        [(toe - 2) * 0.018, 0.002, 0.135 - Math.abs(toe - 1) * 0.008],
        [0.01, 0.019, 0.027],
        skin,
      )
  }
  rod(torso, 'sternum', [0, 0.29, 0.111], [0, 0.45, 0.077], 0.011)
  for (let j = 0; j < 12; j++)
    ell(
      torso,
      'spinous_process_' + j,
      [0, 0.02 + j * 0.038, -0.112],
      [0.013, 0.013, 0.013],
    )
  ell(torso, 'neck', [0, 0.515, 0], [0.052, 0.085, 0.055], skin)
  for (const s of [-1, 1])
    muscle(
      torso,
      'sternocleidomastoid_' + s,
      'neck',
      [s * 0.025, 0.46, 0.045],
      [s * 0.045, 0.59, 0.008],
      0.014,
      0.013,
    )
  ell(torso, 'cranium', [0, 0.68, 0], [0.085, 0.115, 0.086], skin)
  ell(torso, 'jaw', [0, 0.62, 0.033], [0.068, 0.055, 0.061], skin)
  ell(torso, 'nose', [0, 0.665, 0.083], [0.015, 0.027, 0.021], skin)
  for (const s of [-1, 1]) {
    ell(torso, 'ear_' + s, [s * 0.086, 0.67, 0], [0.016, 0.029, 0.018], skin)
    ell(
      torso,
      'orbit_' + s,
      [s * 0.033, 0.69, 0.074],
      [0.024, 0.011, 0.009],
      fascia,
    )
    ell(
      torso,
      'iris_' + s,
      [s * 0.033, 0.69, 0.082],
      [0.008, 0.008, 0.004],
      rubber,
    )
  }
  const bar = group('barbell')
  rod(bar, 'bar_shaft', [-0.95, 0, 0], [0.95, 0, 0], 0.014, steel)
  for (const s of [-1, 1]) {
    rod(bar, 'sleeve_' + s, [s * 0.65, 0, 0], [s * 0.97, 0, 0], 0.027, steel)
    const plate = mesh(
      bar,
      'plate_' + s,
      new T.CylinderGeometry(0.19, 0.19, 0.065, 64),
      rubber,
      [s * 0.72, 0, 0],
    )
    plate.rotation.z = Math.PI / 2
    rod(bar, 'collar_' + s, [s * 0.78, 0, 0], [s * 0.82, 0, 0], 0.045, steel)
  }
  for (const side of ['L', 'R']) {
    const d = group('dumbbell' + side)
    rod(d, 'handle_' + side, [-0.13, 0, 0], [0.13, 0, 0], 0.014, steel)
    for (const s of [-1, 1]) {
      const p = mesh(
        d,
        'hex_weight_' + side + s,
        new T.CylinderGeometry(0.075, 0.075, 0.075, 6),
        rubber,
        [s * 0.105, 0, 0],
      )
      p.rotation.z = Math.PI / 2
    }
  }
  const bench = group('bench')
  mesh(
    bench,
    'bench_pad',
    new T.BoxGeometry(0.32, 0.08, 1.15),
    rubber,
    [0, 0.44, 0],
  )
  for (const s of [-1, 1]) {
    rod(
      bench,
      'bench_leg' + s,
      [0, 0.04, s * 0.42],
      [0, 0.4, s * 0.42],
      0.035,
      steel,
    )
    rod(
      bench,
      'bench_foot' + s,
      [-0.26, 0.035, s * 0.42],
      [0.26, 0.035, s * 0.42],
      0.028,
      steel,
    )
  }
  return { scene, nodes }
}
