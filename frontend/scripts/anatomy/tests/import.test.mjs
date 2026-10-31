import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const root = new URL('../../../../', import.meta.url),
  sourceRoot = new URL('assets/anatomy/z-anatomy/', root),
  assetRoot = new URL('frontend/public/workout/anatomy-z1/', root)
const read = (p) => JSON.parse(readFileSync(p)),
  model = read(new URL('model.gltf', assetRoot)),
  audit = read(new URL('audit.json', assetRoot))
test('Pinned source checksums and redistribution notice are retained', () => {
  const source = read(new URL('source.json', sourceRoot))
  assert.match(source.commit, /^[a-f0-9]{40}$/)
  for (const file of source.files)
    assert.equal(
      createHash('sha256')
        .update(readFileSync(new URL(file.name, sourceRoot)))
        .digest('hex'),
      file.sha256,
    )
  assert.match(
    readFileSync(new URL('NOTICE.txt', assetRoot), 'utf8'),
    /CC BY-SA 4.0/,
  )
  assert.equal(audit.license, 'CC-BY-SA-4.0')
})
test('Export excludes separately restricted systems and procedural body meshes', () => {
  assert.ok(audit.inventory.length > 500)
  for (const item of audit.inventory) {
    assert.ok(
      ['MuscularSystem100.fbx', 'SkeletalSystem100.fbx'].includes(item.source),
    )
    assert.doesNotMatch(
      item.name,
      /inner_ear|cochlea|malleus|incus|stapes|kidney|nerve|foramen/i,
    )
  }
  assert.ok(
    !model.nodes.some((n) =>
      ['cranium', 'deep_trunk_tissue', 'pelvic_fascia'].includes(n.name),
    ),
  )
  assert.ok(model.skins.length > 0)
})
test('Split glTF buffers are complete and normalized skin weights address valid bones', () => {
  const buffers = model.buffers.map((b) => {
    const data = readFileSync(new URL(b.uri, assetRoot))
    assert.equal(data.length, b.byteLength)
    assert.ok(data.length < 50 * 1024 * 1024)
    return data
  })
  function values(index) {
    const a = model.accessors[index],
      view = model.bufferViews[a.bufferView],
      b = buffers[view.buffer],
      stride = a.type === 'VEC4' ? 4 : 3
    const offset = (view.byteOffset || 0) + (a.byteOffset || 0)
    return {
      a,
      count: a.count,
      stride,
      get: (i) =>
        a.componentType === 5126
          ? b.readFloatLE(offset + i * 4)
          : b.readUInt16LE(offset + i * 2),
    }
  }
  for (const mesh of model.meshes)
    for (const p of mesh.primitives) {
      if (p.attributes.WEIGHTS_0 === undefined) continue
      const w = values(p.attributes.WEIGHTS_0),
        j = values(p.attributes.JOINTS_0)
      assert.equal(w.count, j.count)
      for (let v = 0; v < w.count; v++) {
        let sum = 0
        for (let k = 0; k < 4; k++) {
          const weight = w.get(v * 4 + k)
          assert.ok(Number.isFinite(weight) && weight >= 0 && weight <= 1)
          sum += weight
          assert.ok(j.get(v * 4 + k) < 14)
        }
        assert.ok(Math.abs(sum - 1) < 0.00001)
      }
    }
})
