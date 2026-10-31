import { supabase } from './backend.js'
import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Pause, Play, Maximize2 } from 'lucide-react'
// One CPU-side base model; each viewer gets independent bones/materials.
const modelCache = new Map()
export default function Anatomy({
  motion = 'squat',
  primary = [],
  secondary = [],
}) {
  const mount = useRef(),
    api = useRef(null),
    [error, setError] = useState(''),
    [playing, setPlaying] = useState(
      !matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
    [speed, setSpeed] = useState(1),
    [highlight, setHighlight] = useState(false),
    [loading, setLoading] = useState(true),
    [progress, setProgress] = useState(0)
  const preferences = useRef({ playing, speed, highlight })
  preferences.current = { playing, speed, highlight }
  useEffect(() => {
    let disposed = false,
      cleanup = () => {}
    setError('')
    setLoading(true)
    setProgress(0)
    ;(async () => {
      const [T, { GLTFLoader }, { OrbitControls }, { clone }] =
        await Promise.all([
          import('three'),
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/addons/controls/OrbitControls.js'),
          import('three/addons/utils/SkeletonUtils.js'),
        ])
      if (disposed) return
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setClearColor(0xe9ede7, 0)
      renderer.toneMapping = T.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = T.PCFShadowMap
      mount.current.appendChild(renderer.domElement)
      const scene = new T.Scene(),
        camera = new T.PerspectiveCamera(35, 1, 0.1, 40)
      const focusHeight = ['press', 'plank', 'floor'].includes(motion)
        ? 0.3
        : motion.includes('bench-press')
          ? 0.65
          : 0.85
      camera.position.set(2.1, focusHeight + 0.45, 2.65)
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, focusHeight, 0)
      controls.enableDamping = true
      controls.minDistance = 2.5
      controls.maxDistance = 7
      controls.maxPolarAngle = Math.PI * 0.57
      controls.enablePan = false
      scene.add(new T.HemisphereLight(0xffffff, 0x798575, 2))
      const light = new T.DirectionalLight(0xffffff, 2)
      light.position.set(3, 5, 3)
      light.castShadow = true
      light.shadow.mapSize.set(2048, 2048)
      light.shadow.camera.left = -2
      light.shadow.camera.right = 2
      light.shadow.camera.top = 3
      light.shadow.camera.bottom = -2
      light.shadow.bias = -0.0005
      scene.add(light)
      const rim = new T.DirectionalLight(0xe7efff, 1.4)
      rim.position.set(-3, 2, -3)
      scene.add(rim)
      const floor = new T.Mesh(
        new T.CircleGeometry(1.25, 64),
        new T.MeshStandardMaterial({ color: 0xd9e0d1, roughness: 1 }),
      )
      floor.rotation.x = -Math.PI / 2
      floor.position.y = 0.002
      floor.receiveShadow = true
      scene.add(floor)
      let mixer,
        action,
        frame,
        visible = true,
        lastTime = performance.now(),
        materials = []
      const resize = new ResizeObserver(() => {
        if (!mount.current) return
        const { width, height } = mount.current.getBoundingClientRect()
        renderer.setPixelRatio(
          Math.min(devicePixelRatio, width < 600 ? 1.5 : 2),
        )
        renderer.setSize(width, height)
        camera.aspect = width / Math.max(1, height)
        camera.updateProjectionMatrix()
      })
      resize.observe(mount.current)
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
      })
      observer.observe(mount.current)
      api.current = {
        setPlaying: (v) => {
          if (action) action.paused = !v
        },
        setSpeed: (v) => {
          if (mixer) mixer.timeScale = v
        },
        reset: () => {
          camera.position.set(2.1, focusHeight + 0.45, 2.65)
          controls.target.set(0, focusHeight, 0)
        },
        highlight: (v) =>
          materials.forEach(({ m, color }) => {
            m.emissive.set(v ? color : 0x000000)
            m.emissiveIntensity = v ? 0.45 : 0
          }),
        seek: (v) => {
          if (action) {
            action.time = v * action.getClip().duration
            mixer.update(0)
          }
        },
        view: (side) => {
          camera.position.set(
            ...(side === 'front'
              ? [0, focusHeight + 0.3, 3.6]
              : side === 'side'
                ? [3.6, focusHeight + 0.3, 0]
                : [0, focusHeight + 0.3, -3.6]),
          )
          controls.target.set(0, focusHeight, 0)
        },
      }
      const render = () => {
        frame = requestAnimationFrame(render)
        const time = performance.now(),
          dt = Math.min((time - lastTime) / 1000, 0.05)
        lastTime = time
        if (!visible || document.hidden) return
        if (mixer) {
          mixer.update(dt)
          if (
            action &&
            Math.floor(time / 100) !== Math.floor((time - dt * 1000) / 100)
          )
            setProgress(action.time / action.getClip().duration)
        }
        controls.update()
        renderer.render(scene, camera)
      }
      render()
      cleanup = () => {
        cancelAnimationFrame(frame)
        resize.disconnect()
        observer.disconnect()
        controls.dispose()
        scene.traverse((o) => {
          if (!o.userData.cachedGeometry) o.geometry?.dispose()
          o.skeleton?.dispose()
          if (o.material) {
            for (const m of [].concat(o.material)) m.dispose()
          }
        })
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
        api.current = null
      }
      try {
        const base = '/workout/anatomy-z1/'
        const remote = supabase?.storage
          .from('exercise-assets')
          .getPublicUrl('anatomy-z1/').data.publicUrl
        const loader = new GLTFLoader()
        async function load(baseUrl) {
          if (!modelCache.has(baseUrl)) {
            modelCache.clear()
            modelCache.set(
              baseUrl,
              loader.loadAsync(baseUrl + 'model.gltf').catch((e) => {
                modelCache.delete(baseUrl)
                throw e
              }),
            )
          }
          const [baseModel, response] = await Promise.all([
            modelCache.get(baseUrl),
            fetch(baseUrl + 'motions/' + motion + '.json'),
          ])
          if (!response.ok) throw Error('Motion asset unavailable')
          const clip = T.AnimationClip.parse(await response.json())
          if (clip.name !== motion) throw Error('Motion identity mismatch')
          const cloned = clone(baseModel.scene)
          cloned.traverse((o) => {
            if (o.isMesh) o.userData.cachedGeometry = true
          })
          return { gltf: { scene: cloned }, clip }
        }
        let loaded
        try {
          loaded = await load(remote || base)
        } catch {
          loaded = await load(base)
        }
        const { gltf, clip } = loaded
        if (disposed) return
        scene.add(gltf.scene)
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return
          o.material = o.material.clone()
          o.castShadow = true
          o.receiveShadow = true
          const key = (o.userData.region || '').toLowerCase()
          const canonical = (x) =>
            ({
              quads: 'quadriceps',
              abs: 'abdominals',
              delts: 'deltoids',
              chest: 'pectorals',
              core: 'abdominals',
              'lower back': 'spine',
            })[x.toLowerCase()] || x.toLowerCase()
          const p = primary.some((x) => key === canonical(x))
          const s = secondary.some((x) => key === canonical(x))
          materials.push({
            m: o.material,
            color: p ? 0xb6e657 : s ? 0xb8a2e6 : 0x000000,
          })
        })
        mixer = new T.AnimationMixer(gltf.scene)
        action = mixer.clipAction(clip)
        action.play()
        action.paused = !preferences.current.playing
        mixer.timeScale = preferences.current.speed
        mixer.update(0)
        api.current.highlight(preferences.current.highlight)
        setLoading(false)
      } catch (e) {
        if (!disposed) setLoading(false)
        if (!disposed)
          setError(
            'The 3D preview could not load. Exercise instructions remain available.',
          )
      }
    })().catch(() => {
      if (!disposed) setLoading(false)
      if (!disposed)
        setError(
          '3D is unavailable on this device. Use the exercise instructions below.',
        )
    })
    return () => {
      disposed = true
      cleanup()
    }
  }, [motion, JSON.stringify(primary), JSON.stringify(secondary)])
  useEffect(() => api.current?.setPlaying(playing), [playing])
  useEffect(() => api.current?.setSpeed(speed), [speed])
  useEffect(() => api.current?.highlight(highlight), [highlight])
  return (
    <div className="anatomy-wrap">
      <div
        className="anatomy"
        ref={mount}
        aria-label="Interactive original movement study. Drag to rotate; scroll to zoom."
      />
      {loading && !error && (
        <p className="viewer-error" role="status">
          Loading anatomy and selected movement…
        </p>
      )}
      {error && (
        <p className="viewer-error" role="status">
          {error}
        </p>
      )}
      <div className="viewer-top">
        <span className="tag">ANATOMY · Z-ANATOMY</span>
        <span className="tag muted">Draft · review required</span>
      </div>
      <a
        className="anatomy-credit"
        href="/workout/anatomy-z1/NOTICE.txt"
        target="_blank"
        rel="noreferrer"
      >
        Z-Anatomy / BodyParts3D · CC BY-SA 4.0 · adapted
      </a>
      <div className="viewer-timeline">
        <label>
          Movement phase
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            disabled={loading || !!error}
            onChange={(e) => {
              setPlaying(false)
              api.current?.setPlaying(false)
              setProgress(+e.target.value)
              api.current?.seek(+e.target.value)
            }}
          />
        </label>
        <div>
          {['front', 'side', 'back'].map((side) => (
            <button key={side} onClick={() => api.current?.view(side)}>
              {side}
            </button>
          ))}
        </div>
      </div>
      <div className="viewer-controls">
        <button
          aria-label={playing ? 'Pause animation' : 'Play animation'}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <select
          aria-label="Animation speed"
          value={speed}
          onChange={(e) => setSpeed(+e.target.value)}
        >
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
        </select>
        <button onClick={() => api.current?.reset()} aria-label="Reset camera">
          <RotateCcw size={17} />
        </button>
        <button
          onClick={() => setHighlight(!highlight)}
          aria-pressed={highlight}
        >
          Muscles
        </button>
        <button
          onClick={() => mount.current?.parentElement.requestFullscreen?.()}
          aria-label="Fullscreen"
        >
          <Maximize2 size={17} />
        </button>
      </div>
    </div>
  )
}
