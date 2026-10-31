import { readFileSync, writeFileSync } from 'node:fs'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { Box3, Vector3 } from 'three'
const records = []
for (const file of ['MuscularSystem100.fbx', 'SkeletalSystem100.fbx']) {
  const bytes = readFileSync(
    new URL('../../../assets/anatomy/z-anatomy/' + file, import.meta.url),
  )
  const model = new FBXLoader().parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
  model.updateMatrixWorld(true)
  model.traverse((o) => {
    if (o.isMesh) {
      const box = new Box3().setFromObject(o)
      records.push({
        file,
        name: o.name,
        vertices: o.geometry.attributes.position.count,
        triangles:
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3,
        min: box.min.toArray(),
        max: box.max.toArray(),
        color: o.material?.color?.getHexString(),
      })
    }
  })
  console.log(
    file,
    new Box3().setFromObject(model).getSize(new Vector3()).toArray(),
  )
}
writeFileSync(
  new URL('../../../work/anatomy/source-inspection.json', import.meta.url),
  JSON.stringify(records, null, 2),
)
console.log(
  'Meshes:',
  records.length,
  'triangles:',
  records.reduce((n, r) => n + r.triangles, 0),
)
console.log(records.slice(0, 12))
