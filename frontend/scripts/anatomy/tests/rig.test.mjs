import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import { createModel } from '../model.mjs'
import { definitions, pose, createClip } from '../movements.mjs'
const vector = (x) => new T.Vector3(...x)
const { scene, nodes } = createModel()
for (const d of definitions)
  test(`${d.motion}: finite transforms, fixed limb lengths, reachable contacts, seamless loop`, () => {
    for (let frame = 0; frame <= 120; frame++) {
      const p = pose(d.motion, frame / 120)
      assert.ok(
        p.checks.every((c) => c.residual < 0.001),
        'Unreachable target',
      )
      for (const [name, transform] of Object.entries(p.transforms)) {
        assert.ok(nodes[name], `Unknown rig target ${name}`)
        for (const values of Object.values(transform))
          assert.ok(values.every(Number.isFinite))
        assert.ok(
          Math.abs(new T.Quaternion(...transform.quaternion).length() - 1) <
            1e-6,
        )
      }
      for (const s of ['L', 'R'])
        for (const [start, end, length] of [
          ['thigh', 'shin', 0.43],
          ['shin', 'foot', 0.42],
          ['upperArm', 'forearm', 0.3],
          ['forearm', 'hand', 0.27],
        ]) {
          const distance = vector(p.transforms[start + s].position).distanceTo(
            vector(p.transforms[end + s].position),
          )
          assert.ok(
            Math.abs(distance - length) < 0.001,
            `${start + s} stretched: ${distance}`,
          )
        }
    }
    const a = pose(d.motion, 0).transforms,
      b = pose(d.motion, 1).transforms
    for (const name of Object.keys(a))
      for (const prop of Object.keys(a[name]))
        a[name][prop].forEach((x, i) =>
          assert.ok(
            Math.abs(x - b[name][prop][i]) < 1e-6,
            `${name} loop discontinuity`,
          ),
        )
    const { clip } = createClip(d)
    assert.equal(clip.name, d.motion)
    assert.equal(clip.duration, d.duration)
  })
test('Anatomy surfaces retain region tags, vertex fiber colors and outward normals', () => {
  let muscles = 0
  scene.traverse((o) => {
    if (!o.userData.region) return
    muscles++
    const g = o.geometry
    assert.ok(g.attributes.color)
    assert.ok(g.attributes.normal)
    for (const n of g.attributes.normal.array) assert.ok(Number.isFinite(n))
    assert.ok(g.index.count > 1000)
  })
  assert.ok(muscles >= 70)
  const sample = scene.getObjectByName('rectus_abdominis_L_0'),
    g = sample.geometry
  // At mid-belly theta=0 the outward normal points toward positive X.
  const index = 14 * 41
  assert.ok(g.attributes.normal.getX(index) > 0.5, 'Inverted surface winding')
})
test('Bodyweight clips hide all equipment; loaded clips retain their specified equipment', () => {
  for (const d of definitions) {
    const t = pose(d.motion, 0.5).transforms
    assert.equal(t.barbell.scale[0], d.equipment === 'barbell' ? 1 : 0)
    assert.equal(t.dumbbellL.scale[0], d.equipment === 'dumbbell' ? 1 : 0)
    assert.equal(t.bench.scale[0], d.motion.includes('bench-press') ? 1 : 0)
  }
})
