import * as T from 'three'
export const definitions = [
  ['3948', 'squat', 'body weight'],
  ['0031', 'barbell-curl', 'barbell'],
  ['0285', 'alternating-curl', 'dumbbell'],
  ['0417', 'loaded-calf-raise', 'dumbbell'],
  ['0426', 'overhead-press', 'dumbbell'],
  ['1064', 'sumo-squat', 'body weight'],
  ['0032', 'hinge', 'barbell'],
  ['0662', 'press', 'body weight'],
  ['0027', 'pull', 'barbell'],
  ['0336', 'unilateral', 'dumbbell'],
  ['0276', 'floor', 'body weight'],
  ['2258', 'locomotion', 'body weight'],
  ['0294', 'biceps-curl', 'dumbbell'],
  ['0313', 'hammer-curl', 'dumbbell'],
  ['0310', 'front-raise', 'dumbbell'],
  ['0334', 'lateral-raise', 'dumbbell'],
  ['0406', 'shrug', 'dumbbell'],
  ['3018', 'calf-raise', 'body weight'],
  ['0463', 'plank', 'body weight'],
  ['0025', 'bench-press', 'barbell'],
  ['0289', 'dumbbell-bench-press', 'dumbbell'],
  ['1459', 'romanian-deadlift', 'dumbbell'],
].map(([exerciseId, motion, equipment]) => ({
  exerciseId,
  motion,
  equipment,
  duration: motion === 'locomotion' ? 1.6 : 6,
}))
const V = (a) => new T.Vector3(...a),
  down = V([0, -1, 0]),
  Q = (x) => new T.Quaternion().setFromEuler(new T.Euler(x, 0, 0))
// Analytic two-link IK. Endpoints are never silently stretched. Residuals are audited.
export function solveIK(start, end, l1, l2, pole) {
  const delta = end.clone().sub(start),
    raw = delta.length(),
    d = Math.max(0.00001, Math.min(raw, l1 + l2 - 0.000001)),
    axis = delta.normalize()
  const bend = pole.clone().addScaledVector(axis, -pole.dot(axis)).normalize()
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
    height = Math.sqrt(Math.max(0, l1 * l1 - along * along))
  const middle = start
    .clone()
    .addScaledVector(axis, along)
    .addScaledVector(bend, height)
  const reachableEnd = start.clone().addScaledVector(axis, d)
  return { middle, end: reachableEnd, residual: Math.abs(raw - d) }
}
export function pose(motion, t) {
  const kind =
    {
      'barbell-curl': 'biceps-curl',
      'alternating-curl': 'biceps-curl',
      'loaded-calf-raise': 'calf-raise',
      'sumo-squat': 'squat',
    }[motion] || motion
  const a = (1 - Math.cos(t * Math.PI * 2)) / 2,
    p = {},
    checks = []
  let hip = V([0, 0.9, 0]),
    trunk = Q(0),
    feet = { L: V([-0.11, 0.03, 0]), R: V([0.11, 0.03, 0]) }
  const bench = kind.includes('bench-press'),
    prone = kind === 'press' || kind === 'plank'
  if (kind === 'squat') {
    hip = V([0, 0.9 - 0.35 * a, -0.19 * a])
    trunk = Q(0.38 * a)
    feet = { L: V([-0.16, 0.03, 0]), R: V([0.16, 0.03, 0]) }
  }
  if (motion === 'sumo-squat') {
    hip = V([0, 0.88 - 0.3 * a, -0.1 * a])
    trunk = Q(0.15 * a)
    feet = { L: V([-0.26, 0.03, 0]), R: V([0.26, 0.03, 0]) }
  }
  if (['hinge', 'romanian-deadlift', 'pull'].includes(kind)) {
    const b = kind === 'pull' ? 1 : a
    hip = V([0, 0.9 - (kind === 'hinge' ? 0.29 : 0.13) * b, -0.2 * b])
    trunk = Q((kind === 'romanian-deadlift' ? 0.95 : 1.05) * b)
  }
  if (kind === 'unilateral') {
    const phase = (t * 2) % 1,
      step = Math.sin(phase * Math.PI),
      bend = step * step,
      active = t < 0.5 ? 'L' : 'R'
    hip = V([0, 0.9 - 0.34 * bend, 0.24 * step])
    feet[active].z = 0.52 * step
    feet[active].y += 0.06 * Math.sin(phase * 2 * Math.PI) ** 2
    trunk = Q(0.08 * bend)
  }
  if (kind === 'calf-raise') {
    hip.y += 0.105 * a
    feet.L.y += 0.105 * a
    feet.R.y += 0.105 * a
    feet.L.z = 0.135 * (1 - Math.cos(0.9 * a))
    feet.R.z = feet.L.z
  }
  if (kind === 'locokind') {
    hip.y = 0.85 + 0.018 * Math.cos(t * 4 * Math.PI)
    for (const [s, k] of [
      ['L', 0],
      ['R', 0.5],
    ]) {
      const phase = (t + k) % 1
      feet[s] = V([
        s === 'L' ? -0.1 : 0.1,
        0.03 + (phase < 0.5 ? Math.sin(phase * 2 * Math.PI) * 0.11 : 0),
        0.24 * Math.cos(phase * 2 * Math.PI),
      ])
    }
  }
  if (prone) {
    const height =
        (kind === 'plank' ? 0.258 : 0.31) - (kind === 'press' ? 0.12 * a : 0),
      rise = height - 0.12,
      tilt = Math.asin(rise / 0.885)
    hip = V([0, height, -0.85 + Math.sqrt(0.885 * 0.885 - rise * rise)])
    trunk = Q(Math.PI / 2 - tilt)
    feet = { L: V([-0.105, 0.12, -0.85]), R: V([0.105, 0.12, -0.85]) }
  }
  if (kind === 'floor') {
    hip = V([0, 0.16, 0])
    trunk = Q(-Math.PI / 2)
  }
  if (bench) {
    hip = V([0, 0.58, 0.21])
    trunk = Q(-Math.PI / 2)
    feet = { L: V([-0.28, 0.03, 0.76]), R: V([0.28, 0.03, 0.76]) }
  }
  function set(name, pos, q = new T.Quaternion(), scale = [1, 1, 1]) {
    p[name] = { position: pos.toArray(), quaternion: q.toArray(), scale }
  }
  function segment(name, start, end) {
    set(
      name,
      start,
      new T.Quaternion().setFromUnitVectors(
        down,
        end.clone().sub(start).normalize(),
      ),
    )
  }
  const local = (a) => V(a).applyQuaternion(trunk).add(hip)
  set(
    'pelvis',
    hip,
    prone || bench || kind === 'floor' ? trunk : new T.Quaternion(),
  )
  set('torso', hip, trunk)
  let barTarget = null
  const hands = {}
  for (const [side, s] of [
    ['L', -1],
    ['R', 1],
  ]) {
    const origin = hip
      .clone()
      .add(
        V([s * 0.105, -0.035, 0]).applyQuaternion(
          prone || bench || kind === 'floor' ? trunk : new T.Quaternion(),
        ),
      )
    let ankle = feet[side]
    if (kind === 'floor') {
      const extend = side === 'L' ? a : 1 - a
      ankle = V([s * 0.11, 0.55 - 0.4 * extend, 0.4 + 0.43 * extend])
    }
    const leg = solveIK(
      origin,
      ankle,
      0.43,
      0.42,
      V([motion === 'sumo-squat' ? s * 0.35 : 0, prone ? -1 : 1, 1]),
    )
    checks.push({ name: 'ankle' + side, residual: leg.residual })
    segment('thigh' + side, origin, leg.middle)
    segment('shin' + side, leg.middle, leg.end)
    set(
      'foot' + side,
      leg.end,
      Q(kind === 'calf-raise' ? 0.9 * a : prone ? 1.1 : 0),
    )
    if (motion === 'sumo-squat')
      p['foot' + side].quaternion = new T.Quaternion()
        .setFromAxisAngle(V([0, 1, 0]), s * 0.4)
        .toArray()
    let shoulder = local([s * 0.17, 0.5, 0])
    if (kind === 'shrug') shoulder.y += 0.055 * a
    let elbow,
      hand,
      handQ = new T.Quaternion()
    if (['hinge', 'pull'].includes(kind)) {
      const reach = 0.569
      const dx = s * 0.28 - shoulder.x,
        dz = 0.15 - shoulder.z
      const y =
        kind === 'hinge'
          ? shoulder.y - Math.sqrt(reach * reach - dx * dx - dz * dz)
          : 0.49 + 0.37 * a
      hand = V([s * 0.28, y, 0.15])
      barTarget = V([0, y - 0.06, 0.15])
      const arm = solveIK(shoulder, hand, 0.3, 0.27, V([s * 0.5, 0, -1]))
      elbow = arm.middle
      hand = arm.end
      checks.push({ name: 'grip' + side, residual: arm.residual })
    } else if (kind === 'plank') {
      elbow = V([shoulder.x, shoulder.y - 0.3, shoulder.z])
      hand = elbow.clone().add(V([0, 0, 0.27]))
      handQ = Q(-Math.PI / 2)
    } else if (prone) {
      hand = V([s * 0.25, 0.023, 0.47])
      const arm = solveIK(shoulder, hand, 0.3, 0.27, V([s, 0, -0.6]))
      elbow = arm.middle
      hand = arm.end
      checks.push({ name: 'palm' + side, residual: arm.residual })
      handQ = Q(-Math.PI / 2)
    } else if (bench) {
      hand = V([
        s * (kind === 'bench-press' ? 0.3 : 0.29 - 0.08 * a),
        0.77 + 0.32 * a,
        -0.15,
      ])
      const arm = solveIK(shoulder, hand, 0.3, 0.27, V([s, 0, 0]))
      elbow = arm.middle
      hand = arm.end
      barTarget = V([0, hand.y - 0.06, hand.z])
      checks.push({ name: 'benchGrip' + side, residual: arm.residual })
    } else if (kind === 'overhead-press' || motion === 'sumo-squat') {
      hand =
        kind === 'overhead-press'
          ? V([s * 0.22, 1.4 + 0.5 * a, 0.02])
          : local([s * 0.035, 0.34, 0.2])
      const arm = solveIK(shoulder, hand, 0.3, 0.27, V([s, -0.3, 0]))
      elbow = arm.middle
      hand = arm.end
      checks.push({ name: 'newGrip' + side, residual: arm.residual })
      handQ = kind === 'overhead-press' ? Q(Math.PI) : new T.Quaternion()
    } else {
      let upper = 0,
        flex = 0,
        abduct = 0
      if (kind === 'squat') upper = -1.3 * a
      if (['biceps-curl', 'hammer-curl'].includes(kind))
        flex =
          -2.05 *
          (motion === 'alternating-curl'
            ? (side === 'L' && t < 0.5) || (side === 'R' && t >= 0.5)
              ? Math.sin(t * 2 * Math.PI) ** 2
              : 0
            : a)
      if (kind === 'front-raise') upper = -1.5 * a
      if (kind === 'lateral-raise') abduct = s * 1.45 * a
      if (kind === 'locokind')
        upper = (side === 'L' ? 1 : -1) * 0.32 * Math.sin(t * 2 * Math.PI)
      if (kind === 'floor')
        upper = -Math.PI / 2 - (side === 'L' ? 1 - a : a) * 1.3
      const uq = new T.Quaternion().setFromEuler(new T.Euler(upper, 0, abduct))
      const fq = uq.clone().multiply(Q(flex))
      // Standing arm world orientation maintains vertical hanging hands during hip hinges.
      const base = kind === 'floor' ? trunk : new T.Quaternion()
      elbow = shoulder
        .clone()
        .add(V([0, -0.3, 0]).applyQuaternion(uq).applyQuaternion(base))
      hand = elbow
        .clone()
        .add(V([0, -0.27, 0]).applyQuaternion(fq).applyQuaternion(base))
      handQ = base.clone().multiply(fq)
      if (kind === 'hammer-curl')
        handQ.multiply(
          new T.Quaternion().setFromAxisAngle(V([0, 1, 0]), (s * Math.PI) / 2),
        )
    }
    segment('upperArm' + side, shoulder, elbow)
    segment('forearm' + side, elbow, hand)
    set('hand' + side, hand, handQ)
    hands[side] = { hand, handQ }
  }
  const equipment = definitions.find((d) => d.motion === motion)?.equipment
  for (const side of ['L', 'R']) {
    const { hand, handQ } = hands[side]
    const grip = V([0, -0.065, 0]).applyQuaternion(handQ).add(hand)
    set(
      'dumbbell' + side,
      grip,
      handQ,
      equipment === 'dumbbell' ? [1, 1, 1] : [0, 0, 0],
    )
  }
  if (motion === 'barbell-curl') {
    const { hand, handQ } = hands.L
    barTarget = V([0, -0.065, 0]).applyQuaternion(handQ).add(hand)
    barTarget.x = 0
  }
  set(
    'barbell',
    barTarget || V([0, 0, 0]),
    new T.Quaternion(),
    equipment === 'barbell' ? [1, 1, 1] : [0, 0, 0],
  )
  set('bench', V([0, 0, 0]), new T.Quaternion(), bench ? [1, 1, 1] : [0, 0, 0])
  return { transforms: p, checks }
}
export function createClip(definition) {
  const frames = 121,
    times = Array.from(
      { length: frames },
      (_, i) => (i / (frames - 1)) * definition.duration,
    ),
    channels = {},
    checks = []
  for (let i = 0; i < frames; i++) {
    const result = pose(definition.motion, i / (frames - 1))
    checks.push(...result.checks)
    for (const [node, values] of Object.entries(result.transforms))
      for (const [property, valuesArray] of Object.entries(values))
        (channels[node + '.' + property] ||= []).push(...valuesArray)
  }
  const tracks = Object.entries(channels).map(([path, values]) =>
    path.endsWith('quaternion')
      ? new T.QuaternionKeyframeTrack(path, times, values)
      : new T.VectorKeyframeTrack(path, times, values),
  )
  return {
    clip: new T.AnimationClip(definition.motion, definition.duration, tracks),
    maxConstraintResidual: Math.max(0, ...checks.map((c) => c.residual)),
  }
}
