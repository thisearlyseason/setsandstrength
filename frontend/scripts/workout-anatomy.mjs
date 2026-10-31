import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { AnimationClip } from 'three'
import { writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createModel, VERSION } from './anatomy/model.mjs'
import { definitions, createClip, pose } from './anatomy/movements.mjs'
globalThis.FileReader = class {
  readAsArrayBuffer(b) {
    b.arrayBuffer().then((r) => {
      this.result = r
      this.onloadend?.()
    })
  }
  readAsDataURL(b) {
    b.arrayBuffer().then((r) => {
      this.result =
        'data:application/octet-stream;base64,' +
        Buffer.from(r).toString('base64')
      this.onloadend?.()
    })
  }
}
const root = new URL('../public/workout/' + VERSION + '/', import.meta.url)
mkdirSync(root, { recursive: true })
mkdirSync(new URL('motions/', root), { recursive: true })
const { scene, nodes } = createModel(),
  rest = pose('squat', 0)
for (const [name, transform] of Object.entries(rest.transforms)) {
  nodes[name].position.fromArray(transform.position)
  nodes[name].quaternion.fromArray(transform.quaternion)
  nodes[name].scale.fromArray(transform.scale)
}
// Equipment starts visible in the asset so exporters retain geometry; selected clips hide it.
for (const name of ['barbell', 'dumbbellL', 'dumbbellR', 'bench'])
  nodes[name].scale.set(1, 1, 1)
const gltf = await new GLTFExporter().parseAsync(scene, {
  binary: false,
  onlyVisible: false,
})
const binary = Buffer.from(gltf.buffers[0].uri.split(',')[1], 'base64')
gltf.buffers[0].uri = 'anatomy.bin'
writeFileSync(new URL('anatomy.bin', root), binary)
writeFileSync(new URL('model.gltf', root), JSON.stringify(gltf))
let triangles = 0,
  meshes = 0,
  regions = new Set()
scene.traverse((o) => {
  if (o.isMesh) {
    meshes++
    triangles += o.geometry.index
      ? o.geometry.index.count / 3
      : o.geometry.attributes.position.count / 3
    if (o.userData.region) regions.add(o.userData.region)
  }
})
const audit = []
for (const d of definitions) {
  const { clip, maxConstraintResidual } = createClip(d)
  const serialized = AnimationClip.toJSON(clip)
  delete serialized.uuid // Stable content hashes across reproducible generation.
  const data = JSON.stringify(serialized)
  writeFileSync(new URL('motions/' + d.motion + '.json', root), data)
  audit.push({
    ...d,
    maxConstraintResidual,
    sha256: createHash('sha256').update(data).digest('hex'),
    reviewStatus: 'draft',
  })
}
const report = {
  version: VERSION,
  meshes,
  triangles,
  regions: [...regions].sort(),
  binaryBytes: binary.length,
  modelSha256: createHash('sha256').update(binary).digest('hex'),
  motions: audit,
  limitations: [
    'Parametric anatomical approximation; not anatomist-reviewed',
    'Segment articulation, not a deforming production skin',
    'Walking is a stationary gait study',
    'Contact residuals measure reachability, not instructional correctness',
  ],
}
writeFileSync(
  new URL('audit.json', root),
  JSON.stringify(report, null, 2) + '\n',
)
console.log(
  JSON.stringify(
    {
      version: VERSION,
      meshes,
      triangles,
      modelMB: binary.length / 1e6,
      clips: audit.length,
      maxResidual: Math.max(...audit.map((a) => a.maxConstraintResidual)),
    },
    null,
    2,
  ),
)
