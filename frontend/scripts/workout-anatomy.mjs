// Original procedural study. Geometry and motion authored for this fork, never sampled
// from the upstream licensed animations. Draft: not an anatomical/technique approval.
import * as T from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { writeFileSync } from 'node:fs'
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
  body = new T.Group()
body.name = 'body'
body.position.y = 1.05
scene.add(body)
const gray = new T.MeshStandardMaterial({
    color: 0x778582,
    roughness: 0.55,
    metalness: 0.12,
  }),
  dark = new T.MeshStandardMaterial({ color: 0x364340, roughness: 0.65 }),
  lime = new T.MeshStandardMaterial({ color: 0xc4ee55, roughness: 0.6 })
function joint(parent, name, pos) {
  const g = new T.Group()
  g.name = name
  g.position.set(...pos)
  parent.add(g)
  return g
}
function ell(parent, name, pos, scale, mat = gray) {
  const mesh = new T.Mesh(new T.SphereGeometry(1, 20, 14), mat)
  mesh.name = name
  mesh.position.set(...pos)
  mesh.scale.set(...scale)
  parent.add(mesh)
  return mesh
}
const torso = joint(body, 'torso', [0, 0, 0])
ell(torso, 'pelvis', [0, 0, 0], [0.19, 0.15, 0.12], dark)
ell(torso, 'ribcage', [0, 0.3, 0], [0.23, 0.28, 0.13])
ell(torso, 'abdominals', [0, 0.18, 0.105], [0.115, 0.17, 0.045], lime)
for (const side of [-1, 1]) {
  const tag = side < 0 ? 'L' : 'R'
  ell(
    torso,
    'pectorals' + tag,
    [side * 0.105, 0.43, 0.1],
    [0.105, 0.095, 0.05],
    lime,
  )
  const arm = joint(torso, 'arm' + tag, [side * 0.25, 0.42, 0])
  ell(arm, 'deltoids' + tag, [0, -0.03, 0], [0.1, 0.12, 0.1])
  ell(arm, 'biceps' + tag, [0, -0.17, 0.01], [0.075, 0.17, 0.07])
  const fore = joint(arm, 'forearm' + tag, [0, -0.3, 0])
  ell(fore, 'forearmMesh' + tag, [0, -0.13, 0], [0.06, 0.15, 0.055])
  ell(fore, 'hand' + tag, [0, -0.3, 0], [0.06, 0.085, 0.035], dark)
  const leg = joint(body, 'leg' + tag, [side * 0.105, -0.05, 0])
  ell(leg, 'quadriceps' + tag, [0, -0.22, 0.01], [0.105, 0.24, 0.1], lime)
  const shin = joint(leg, 'shin' + tag, [0, -0.45, 0])
  ell(shin, 'calves' + tag, [0, -0.2, 0], [0.07, 0.22, 0.07])
  ell(shin, 'foot' + tag, [0, -0.44, 0.06], [0.08, 0.05, 0.14], dark)
}
ell(torso, 'neck', [0, 0.61, 0], [0.065, 0.09, 0.065])
ell(torso, 'head', [0, 0.77, 0], [0.115, 0.155, 0.105])
ell(torso, 'face', [0, 0.76, 0.085], [0.07, 0.09, 0.03], dark)
const frames = 49,
  times = Array.from({ length: frames }, (_, i) => (i * 4) / (frames - 1))
function clip(name, fn) {
  const channels = {}
  for (const time of times) {
    const v = fn((time / 4) * 2 * Math.PI)
    for (const [key, val] of Object.entries(v)) {
      ;(channels[key] ||= []).push(...(Array.isArray(val) ? val : [val]))
    }
  }
  return new T.AnimationClip(
    name,
    4,
    Object.entries(channels).map(([path, vals]) =>
      path.endsWith('position')
        ? new T.VectorKeyframeTrack(path, times, vals)
        : new T.QuaternionKeyframeTrack(path, times, vals),
    ),
  )
}
const rot = (x = 0, y = 0, z = 0) =>
  new T.Quaternion().setFromEuler(new T.Euler(x, y, z)).toArray()
const animations = [
  'squat',
  'hinge',
  'press',
  'pull',
  'unilateral',
  'floor',
  'locomotion',
].map((name) =>
  clip(name, (t) => {
    const a = (1 - Math.cos(t)) / 2,
      out = { 'body.position': [0, 1.05, 0] }
    if (name === 'squat') {
      out['body.position'] = [0, 1.05 - 0.28 * a, -0.08 * a]
      out['torso.quaternion'] = rot(0.28 * a)
      for (const s of ['L', 'R']) {
        out['leg' + s + '.quaternion'] = rot(-0.95 * a)
        out['shin' + s + '.quaternion'] = rot(1.25 * a)
        out['arm' + s + '.quaternion'] = rot(-0.8 * a)
      }
    }
    if (name === 'hinge' || name === 'pull') {
      out['torso.quaternion'] = rot(name === 'pull' ? 0.8 : 0.9 * a)
      out['body.position'] = [0, 1.05 - 0.12 * a, -0.12 * a]
      for (const s of ['L', 'R']) {
        out['leg' + s + '.quaternion'] = rot(-0.25 * a)
        out['shin' + s + '.quaternion'] = rot(0.4 * a)
        out['arm' + s + '.quaternion'] = rot(
          name === 'pull' ? -0.6 + 0.6 * a : -0.6 * a,
        )
        out['forearm' + s + '.quaternion'] = rot(name === 'pull' ? -1.2 * a : 0)
      }
    }
    if (name === 'unilateral') {
      out['body.position'] = [0, 1.05 - 0.25 * a, 0]
      out['legL.quaternion'] = rot(-0.8 * a)
      out['shinL.quaternion'] = rot(1.1 * a)
      out['legR.quaternion'] = rot(0.4 * a)
      out['shinR.quaternion'] = rot(1.1 * a)
    }
    if (name === 'press') {
      out['body.position'] = [0, 0.55, 0]
      out['body.quaternion'] = rot(-Math.PI / 2)
      for (const s of ['L', 'R']) {
        out['arm' + s + '.quaternion'] = rot(-1.1 + 0.5 * a)
        out['forearm' + s + '.quaternion'] = rot(-1 * a)
      }
    }
    if (name === 'floor') {
      out['body.position'] = [0, 0.2, 0]
      out['body.quaternion'] = rot(Math.PI / 2)
      for (const [s, k] of [
        ['L', 1],
        ['R', -1],
      ]) {
        out['leg' + s + '.quaternion'] = rot(-1 + 0.4 * Math.sin(t) * k)
        out['shin' + s + '.quaternion'] = rot(1)
        out['arm' + s + '.quaternion'] = rot(-2 + 0.7 * Math.sin(t) * k)
      }
    }
    if (name === 'locomotion') {
      for (const [s, k] of [
        ['L', 1],
        ['R', -1],
      ]) {
        out['leg' + s + '.quaternion'] = rot(0.45 * Math.sin(t) * k)
        out['shin' + s + '.quaternion'] = rot(
          Math.max(0, 0.65 * Math.sin(t) * k),
        )
        out['arm' + s + '.quaternion'] = rot(-0.35 * Math.sin(t) * k)
      }
    }
    return out
  }),
)
const gltf = await new GLTFExporter().parseAsync(scene, { animations })
writeFileSync(
  new URL('../public/workout/anatomy.gltf', import.meta.url),
  JSON.stringify(gltf),
)
console.log('Original draft rig and seven motion studies exported.')
