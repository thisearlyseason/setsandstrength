import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pose } from '../movements.mjs'
const root = new URL('../../../../', import.meta.url)
const read = (p) => JSON.parse(readFileSync(new URL(p, root)))
const index = read('frontend/src/workout/illustrations.json')
test('Illustrations retain exercise identity, loop closure and phase cues', () => {
  assert.equal(Object.keys(index).length, 21)
  assert.equal(index['2258'], undefined, 'Uncorrected gait must remain pending')
  for (const [id, m] of Object.entries(index)) {
    const d = read('frontend/public' + m.path)
    assert.equal(d.exerciseId, id)
    assert.equal(d.frames.length, 61)
    assert.equal(d.cues.length, 4)
    assert.deepEqual(d.frames[0], d.frames[60])
    assert.equal(d.reviewStatus, 'draft')
    const visit = (x) => {
      if (typeof x === 'number') assert.ok(Number.isFinite(x))
      else if (x && typeof x === 'object') Object.values(x).forEach(visit)
    }
    visit(d.frames)
  }
})
test('Dead bug starts with upright thighs and horizontal shins; returns before switching sides', () => {
  for (const t of [0, 0.5, 1]) {
    const p = pose('floor', t).transforms
    for (const s of ['L', 'R']) {
      const hip = p['thigh' + s].position,
        knee = p['shin' + s].position,
        ankle = p['foot' + s].position
      assert.ok(Math.abs(knee[2] - hip[2]) < 0.005)
      assert.ok(Math.abs(knee[1] - ankle[1]) < 0.005)
      assert.ok(knee[1] - hip[1] > 0.42)
    }
  }
  const left = pose('floor', 0.25).transforms,
    right = pose('floor', 0.75).transforms
  assert.ok(left.footL.position[1] < left.footR.position[1])
  assert.ok(right.footR.position[1] < right.footL.position[1])
  assert.ok(left.handR.position[1] < left.handL.position[1])
  assert.ok(right.handL.position[1] < right.handR.position[1])
})
test('Deadlift starts low; bench press starts high; hammer grip does not instruct supination', () => {
  const deadlift = read('frontend/public' + index['0032'].path),
    bench = read('frontend/public' + index['0025'].path),
    hammer = read('frontend/public' + index['0313'].path)
  assert.ok(deadlift.frames[0].bar[1] > deadlift.frames[30].bar[1])
  assert.ok(bench.frames[0].bar[1] < bench.frames[30].bar[1])
  assert.match(hammer.cues[1], /without rotating/)
  assert.match(
    read('frontend/public/workout/catalog.json')['0313'].instructions[1],
    /do not rotate/,
  )
})
test('Active drawing viewer does not load WebGL, glTF or third-party models', () => {
  const code = readFileSync(
    new URL('frontend/src/workout/Illustration.jsx', root),
    'utf8',
  )
  assert.doesNotMatch(
    code,
    /import\(['"]three|GLTFLoader|WebGLRenderer|anatomy-z1|anatomy-v2/,
  )
})
test('Squat end poses reach thigh level; presses reach near-full elbow extension', () => {
  for (const motion of ['squat', 'sumo-squat']) {
    const p = pose(motion, 0.5).transforms
    for (const s of ['L', 'R'])
      assert.ok(
        Math.abs(p['thigh' + s].position[1] - p['shin' + s].position[1]) <
          0.005,
      )
  }
  for (const motion of [
    'overhead-press',
    'bench-press',
    'dumbbell-bench-press',
  ]) {
    const p = pose(motion, 0.5).transforms
    for (const s of ['L', 'R']) {
      const distance = Math.hypot(
        ...p['hand' + s].position.map(
          (v, i) => v - p['upperArm' + s].position[i],
        ),
      )
      assert.ok(distance > 0.565 && distance <= 0.571)
    }
  }
})
