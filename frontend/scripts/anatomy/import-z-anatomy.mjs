// Adapted anatomy: Z-Anatomy / BodyParts3D, CC BY-SA 4.0.
// This adapter, rig weights and generated mesh adaptations are CC BY-SA 4.0.
// Original Workout motion files remain separately authored; no source animation is imported.
import * as T from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createModel } from './model.mjs'
import { definitions, createClip } from './movements.mjs'
const root = new URL('../../../', import.meta.url),
  out = new URL('frontend/public/workout/anatomy-z1/', root)
mkdirSync(out, { recursive: true })
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
const scene = new T.Scene(),
  skeletonBones = [],
  segments = [],
  boneIndex = {}
const V = (a) => new T.Vector3(...a)
function bone(name, a, b) {
  const o = new T.Bone()
  o.name = name
  o.position.set(...a)
  o.quaternion.setFromUnitVectors(V([0, -1, 0]), V(b).sub(V(a)).normalize())
  if (name === 'torso' || name === 'pelvis') o.quaternion.identity()
  scene.add(o)
  boneIndex[name] = skeletonBones.length
  skeletonBones.push(o)
  segments.push({ name, a: V(a), b: V(b) })
}
bone('pelvis', [0, 0.9, 0], [0, 0.82, 0])
bone('torso', [0, 0.9, 0], [0, 1.7, 0])
for (const [s, side] of [
  [-1, 'L'],
  [1, 'R'],
]) {
  bone('upperArm' + side, [s * 0.17, 1.4, -0.02], [s * 0.23, 1.09, -0.025])
  bone('forearm' + side, [s * 0.23, 1.09, -0.025], [s * 0.29, 0.84, -0.015])
  bone('hand' + side, [s * 0.29, 0.84, -0.015], [s * 0.32, 0.7, 0.005])
  bone('thigh' + side, [s * 0.075, 0.88, -0.01], [s * 0.08, 0.44, -0.02])
  bone('shin' + side, [s * 0.08, 0.44, -0.02], [s * 0.09, 0.075, -0.035])
  bone('foot' + side, [s * 0.09, 0.075, -0.035], [s * 0.09, 0.025, 0.12])
}
scene.updateMatrixWorld(true)
const skeleton = new T.Skeleton(skeletonBones)
skeleton.calculateInverses()
const groups = new Map(),
  inventory = [],
  excluded = []
const regionFor = (name) => {
  const n = name.toLowerCase()
  if (/tendon|aponeurosis|retinaculum|sheath|bursa|tract/.test(n))
    return 'connective tissue'
  for (const [pattern, region] of [
    [/pectoralis_major/, 'pectorals'],
    [/deltoid/, 'deltoids'],
    [/biceps_brachii|brachialis/, 'biceps'],
    [/triceps/, 'triceps'],
    [/rectus_femoris|vastus|sartorius/, 'quadriceps'],
    [/biceps_femoris|semitendinosus|semimembranosus/, 'hamstrings'],
    [/gluteus/, 'glutes'],
    [/gastrocnemius|soleus/, 'calves'],
    [/tibialis/, 'tibialis'],
    [/abdominis|abdominal/, 'abdominals'],
    [/latissimus/, 'lats'],
    [/trapezius/, 'traps'],
    [/adductor|gracilis/, 'adductors'],
    [/serratus/, 'serratus'],
    [/spinalis|multifidus|longissimus|iliocostalis/, 'spine'],
    [/carpi|digitorum|pollicis|brachioradialis/, 'forearms'],
  ])
    if (pattern.test(n)) return region
  return 'other muscles'
}
// Explicit physical bone names: exclude atlas annotation cubes and muscle attachment patches.
const physicalBone =
  /^(Femur[lr]|Tibia[lr]|Fibula[lr]|Patella[lr]|Hip_bone[lr]|Sacrum|Coccyx|Vertebra_[CTL]\d+|Atlas_\(C1\)|Axis_\(C2\)|Sternum|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)_rib[lr]|Rib_\d+[lr]|Costal_cartilage.*|Humerus[lr]|Radius[lr]|Ulna[lr]|Scapula[lr]|Clavicle[lr]|Mandible|Maxilla[lr]|[A-Za-z_]+_bone[lr]?|[A-Za-z_]*phalanx.*|[A-Za-z_]*phalange.*|[A-Za-z_]*metacarpal.*|[A-Za-z_]*metatarsal.*|[A-Za-z_]*tooth[lr]?|Talus[lr]|Calcaneus[lr])$/i
function closest(p, seg) {
  const d = seg.b.clone().sub(seg.a),
    t = T.MathUtils.clamp(p.clone().sub(seg.a).dot(d) / d.lengthSq(), 0, 1)
  return p.distanceTo(seg.a.clone().addScaledVector(d, t))
}
function weights(p, name, isBone, center) {
  const n = name.toLowerCase(),
    side = center.x < 0 ? 'L' : 'R',
    blend = (a, b, t) => [
      [boneIndex[a], 1 - T.MathUtils.clamp(t, 0, 1)],
      [boneIndex[b], T.MathUtils.clamp(t, 0, 1)],
    ]
  if (
    /rib|vertebra|sternum|costal|skull|mandible|maxilla|frontal|parietal|temporal|occipital|sphenoid|ethmoid|tooth|zygomatic|nasal|hyoid|scapula|clavicle/.test(
      n,
    )
  )
    return [[boneIndex.torso, 1]]
  if (/hip_bone|sacrum|coccyx/.test(n)) return [[boneIndex.pelvis, 1]]
  if (isBone) {
    for (const [pattern, bone] of [
      [/^femur/, 'thigh'],
      [/^tibia|^fibula|^patella/, 'shin'],
      [/^humerus/, 'upperArm'],
      [/^radius|^ulna/, 'forearm'],
    ])
      if (pattern.test(n)) return [[boneIndex[bone + side], 1]]
  }
  if (p.y > 1.46) return [[boneIndex.torso, 1]]
  if (
    !isBone &&
    /pectoralis|latissimus|serratus|trapezius|rhomboid|infraspinatus|supraspinatus|subscapularis|teres_/.test(
      n,
    )
  )
    return blend(
      'torso',
      'upperArm' + side,
      ((Math.abs(p.x) - 0.14) / 0.065) *
        T.MathUtils.smoothstep(p.y, 1.22, 1.33),
    )
  if (!isBone && /deltoid/.test(n))
    return blend('upperArm' + side, 'torso', (p.y - 1.34) / 0.09)
  if (
    !isBone &&
    /abdom|oblique|intercostal|diaphragm|spinalis|multifidus|longissimus|iliocostalis/.test(
      n,
    )
  )
    return blend('pelvis', 'torso', (p.y - 0.88) / 0.16)
  if (!isBone && /gluteus/.test(n))
    return blend('thigh' + side, 'pelvis', (p.y - 0.81) / 0.14)
  if (center.y < 0.14 && Math.abs(center.x) < 0.2)
    return blend('foot' + side, 'shin' + side, (p.y - 0.09) / 0.05)
  if (center.y < 0.93 && Math.abs(center.x) < 0.2) {
    if (p.y > 0.78) return blend('thigh' + side, 'pelvis', (p.y - 0.82) / 0.1)
    if (p.y > 0.4)
      return blend('shin' + side, 'thigh' + side, (p.y - 0.42) / 0.07)
    return [[boneIndex['shin' + side], 1]]
  }
  if (/biceps_brachii|triceps|brachialis|humerus/.test(n))
    return isBone
      ? [[boneIndex['upperArm' + side], 1]]
      : blend('forearm' + side, 'upperArm' + side, (p.y - 1.07) / 0.07)
  if (
    Math.abs(center.x) > 0.19 ||
    /brachioradialis|anconeus|pronator|supinator|carpi|pollicis|palmaris/.test(
      n,
    )
  ) {
    if (p.y > 1.1) return [[boneIndex['upperArm' + side], 1]]
    if (p.y > 0.86)
      return blend('forearm' + side, 'upperArm' + side, (p.y - 1.065) / 0.06)
    return blend('hand' + side, 'forearm' + side, (p.y - 0.81) / 0.055)
  }
  return [[boneIndex.torso, 1]]
}
function prepare(mesh, isBone) {
  const g = mesh.geometry.clone()
  g.applyMatrix4(mesh.matrixWorld)
  g.scale(0.01, 0.01, 0.01)
  g.computeBoundingBox()
  const center = g.boundingBox.getCenter(new T.Vector3())
  const pos = g.attributes.position,
    index = g.index,
    map = new Map(),
    sums = [],
    counts = [],
    remap = new Uint32Array(pos.count)
  // Spatial welding at sub-millimeter/1.5mm scale removes redundant atlas tessellation.
  const grid = isBone ? 0.0015 : 0.0025
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i),
      key = [
        Math.round(x / grid),
        Math.round(y / grid),
        Math.round(z / grid),
      ].join(',')
    let k = map.get(key)
    if (k === undefined) {
      k = sums.length / 3
      map.set(key, k)
      sums.push(0, 0, 0)
      counts.push(0)
    }
    sums[k * 3] += x
    sums[k * 3 + 1] += y
    sums[k * 3 + 2] += z
    counts[k]++
    remap[i] = k
  }
  for (let i = 0; i < counts.length; i++)
    for (let j = 0; j < 3; j++) sums[i * 3 + j] /= counts[i]
  const faces = [],
    seen = new Set(),
    n = index ? index.count : pos.count
  for (let i = 0; i < n; i += 3) {
    const a = remap[index ? index.getX(i) : i],
      b = remap[index ? index.getX(i + 1) : i + 1],
      c = remap[index ? index.getX(i + 2) : i + 2]
    if (a === b || a === c || b === c) continue
    const key = [a, b, c].sort((a, b) => a - b).join(',')
    if (seen.has(key)) continue
    seen.add(key)
    faces.push(
      a,
      mesh.matrixWorld.determinant() < 0 ? c : b,
      mesh.matrixWorld.determinant() < 0 ? b : c,
    )
  }
  const result = new T.BufferGeometry()
  result.setAttribute('position', new T.Float32BufferAttribute(sums, 3))
  result.setIndex(faces)
  result.computeVertexNormals()
  const skinI = [],
    skinW = []
  for (let i = 0; i < sums.length; i += 3) {
    const w = weights(V(sums.slice(i, i + 3)), mesh.name, isBone, center)
    skinI.push(w[0][0], w[1]?.[0] || 0, 0, 0)
    skinW.push(w[0][1], w[1]?.[1] || 0, 0, 0)
  }
  result.setAttribute('skinIndex', new T.Uint16BufferAttribute(skinI, 4))
  result.setAttribute('skinWeight', new T.Float32BufferAttribute(skinW, 4))
  g.dispose()
  return result
}
for (const filename of ['MuscularSystem100.fbx', 'SkeletalSystem100.fbx']) {
  const bytes = readFileSync(
      new URL('assets/anatomy/z-anatomy/' + filename, root),
    ),
    model = new FBXLoader().parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
  model.updateMatrixWorld(true)
  model.traverse((o) => {
    if (!o.isMesh) return
    const isBone = filename.startsWith('Skeletal')
    if (!isBone && /fascia[lrs]?$/i.test(o.name)) {
      excluded.push(o.name)
      return
    }
    if (isBone && !physicalBone.test(o.name)) {
      excluded.push(o.name)
      return
    }
    if (
      /inner_ear|cochlea|malleus|incus|stapes|kidney|nerve|foramen/i.test(
        o.name,
      )
    ) {
      excluded.push(o.name)
      return
    }
    const region = isBone ? 'skeleton' : regionFor(o.name),
      g = prepare(o, isBone)
    if (!groups.has(region)) groups.set(region, [])
    groups.get(region).push(g)
    inventory.push({
      name: o.name,
      source: filename,
      region,
      triangles: g.index.count / 3,
    })
  })
  console.log('Imported', filename, inventory.length, 'selected structures')
}
for (const [region, geometries] of groups) {
  const geometry = mergeGeometries(geometries),
    material = new T.MeshStandardMaterial({
      color: ['skeleton', 'connective tissue'].includes(region)
        ? 0xddd1b7
        : 0x9c4942,
      roughness: 0.7,
      metalness: 0,
    })
  const mesh = new T.SkinnedMesh(geometry, material)
  mesh.name = 'anatomy_' + region.replaceAll(' ', '_')
  mesh.userData = {
    region,
    license: 'CC-BY-SA-4.0',
    source: 'Z-Anatomy; BodyParts3D',
    reviewStatus: 'draft',
  }
  scene.add(mesh)
  mesh.bind(skeleton, new T.Matrix4())
  mesh.frustumCulled = false
  for (const g of geometries) g.dispose()
}
// Original equipment only. No procedural body geometry is carried forward.
const { nodes } = createModel()
for (const name of ['barbell', 'dumbbellL', 'dumbbellR', 'bench'])
  scene.add(nodes[name])
const exported = await new GLTFExporter().parseAsync(scene, {
  binary: false,
  onlyVisible: false,
})
const binary = Buffer.from(exported.buffers[0].uri.split(',')[1], 'base64')
const chunks = []
let parts = [],
  size = 0,
  index = 0
function flush() {
  if (!size) return
  const data = Buffer.concat(parts),
    uri = `anatomy-${index}.bin`
  writeFileSync(new URL(uri, out), data)
  chunks.push({ uri, byteLength: data.length })
  parts = []
  size = 0
  index++
}
for (const view of exported.bufferViews) {
  if (size + view.byteLength > 12 * 1024 * 1024) flush()
  const start = view.byteOffset || 0
  const data = binary.subarray(start, start + view.byteLength)
  view.buffer = index
  view.byteOffset = size
  parts.push(data)
  size += data.length
  const padding = (4 - (size % 4)) % 4
  if (padding) {
    parts.push(Buffer.alloc(padding))
    size += padding
  }
}
flush()
exported.buffers = chunks
exported.asset.copyright =
  'Z-Anatomy / Gauthier Kervyn and contributors; BodyParts3D / DBCLS. Adapted by Workout. CC BY-SA 4.0. Original equipment: Workout.'
writeFileSync(new URL('model.gltf', out), JSON.stringify(exported))
const audit = {
  version: 'anatomy-z1',
  source: JSON.parse(
    readFileSync(new URL('assets/anatomy/z-anatomy/source.json', root)),
  ),
  license: 'CC-BY-SA-4.0',
  meshes: groups.size,
  structures: inventory.length,
  triangles: inventory.reduce((n, x) => n + x.triangles, 0),
  binaryBytes: binary.length,
  modelSha256: createHash('sha256')
    .update(JSON.stringify(exported))
    .update(binary)
    .digest('hex'),
  inventory,
  excluded,
  reviewStatus: 'draft',
  limitations: [
    'Automatic skin weights require joint deformation review',
    'Source atlas geometry is not a movement rig',
    'No professional exercise or anatomical deformation approval',
  ],
}
writeFileSync(new URL('audit.json', out), JSON.stringify(audit, null, 2) + '\n')
console.log(
  JSON.stringify({
    structures: audit.structures,
    triangles: audit.triangles,
    megabytes: binary.length / 1e6,
  }),
)

// Retarget the original motion curves to the source skeleton's measured segment axes.
mkdirSync(new URL('motions/', out), { recursive: true })
for (const d of definitions) {
  const { clip } = createClip(d)
  for (const track of clip.tracks) {
    const [name, property] = track.name.split('.')
    if (property === 'scale' && boneIndex[name] !== undefined) {
      const source = segments[boneIndex[name]],
        len = source.a.distanceTo(source.b)
      const target = name.startsWith('upperArm')
        ? 0.3
        : name.startsWith('forearm')
          ? 0.27
          : name.startsWith('thigh')
            ? 0.43
            : name.startsWith('shin')
              ? 0.42
              : null
      if (target)
        for (let i = 1; i < track.values.length; i += 3)
          track.values[i] = target / len
    }
    if (property === 'quaternion' && name.startsWith('foot')) {
      const bind = skeletonBones[boneIndex[name]].quaternion
      for (let i = 0; i < track.values.length; i += 4) {
        const q = new T.Quaternion().fromArray(track.values, i).multiply(bind)
        q.toArray(track.values, i)
      }
    }
  }
  const serialized = T.AnimationClip.toJSON(clip)
  delete serialized.uuid
  writeFileSync(
    new URL('motions/' + d.motion + '.json', out),
    JSON.stringify(serialized),
  )
}
