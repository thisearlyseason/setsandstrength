import { supabase } from './backend.js'
import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Pause, Play, Maximize2 } from 'lucide-react'
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
    [highlight, setHighlight] = useState(true)
  useEffect(() => {
    let disposed = false,
      cleanup = () => {}
    setError('')
    ;(async () => {
      const [T, { GLTFLoader }, { OrbitControls }] = await Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/controls/OrbitControls.js'),
      ])
      if (disposed) return
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setClearColor(0xe9ede7, 0)
      mount.current.appendChild(renderer.domElement)
      const scene = new T.Scene(),
        camera = new T.PerspectiveCamera(35, 1, 0.1, 40)
      camera.position.set(2.2, 1.6, 3.3)
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 0.95, 0)
      controls.enableDamping = true
      controls.minDistance = 2.5
      controls.maxDistance = 7
      controls.maxPolarAngle = Math.PI * 0.57
      controls.enablePan = false
      scene.add(new T.HemisphereLight(0xffffff, 0x798575, 2))
      const light = new T.DirectionalLight(0xffffff, 2)
      light.position.set(3, 5, 3)
      scene.add(light)
      const floor = new T.Mesh(
        new T.CircleGeometry(1.25, 64),
        new T.MeshStandardMaterial({ color: 0xd9e0d1, roughness: 1 }),
      )
      floor.rotation.x = -Math.PI / 2
      floor.position.y = 0.01
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
          camera.position.set(2.2, 1.6, 3.3)
          controls.target.set(0, 0.95, 0)
        },
        highlight: (v) =>
          materials.forEach(({ m, color }) =>
            m.color.set(v ? color : 0x85928c),
          ),
      }
      const render = () => {
        frame = requestAnimationFrame(render)
        const time = performance.now(),
          dt = Math.min((time - lastTime) / 1000, 0.05)
        lastTime = time
        if (!visible || document.hidden) return
        if (mixer) mixer.update(dt)
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
          o.geometry?.dispose()
          if (o.material) {
            for (const m of [].concat(o.material)) m.dispose()
          }
        })
        renderer.dispose()
        renderer.domElement.remove()
        api.current = null
      }
      try {
        const assetUrl = supabase?.storage
          .from('exercise-assets')
          .getPublicUrl('anatomy.gltf').data.publicUrl
        const loader = new GLTFLoader()
        let gltf
        try {
          gltf = await loader.loadAsync(assetUrl || '/workout/anatomy.gltf')
        } catch {
          gltf = await loader.loadAsync('/workout/anatomy.gltf')
        }
        if (disposed) {
          gltf.scene.traverse((o) => {
            o.geometry?.dispose()
            o.material?.dispose()
          })
          return
        }
        scene.add(gltf.scene)
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return
          o.material = o.material.clone()
          const key = o.name.toLowerCase()
          const canonical = (x) =>
            ({
              quads: 'quadriceps',
              abs: 'abdominals',
              delts: 'deltoids',
              chest: 'pectorals',
              core: 'abdominals',
              glutes: 'pelvis',
            })[x.toLowerCase()] || x.toLowerCase()
          const p = primary.some((x) => key.includes(canonical(x))),
            s = secondary.some((x) => key.includes(canonical(x)))
          o.material.color.set(p ? 0xb6e657 : s ? 0xb8a2e6 : 0x86948c)
          materials.push({ m: o.material, color: o.material.color.getHex() })
        })
        mixer = new T.AnimationMixer(gltf.scene)
        const clip = gltf.animations.find((x) => x.name === motion)
        if (!clip) throw Error('Motion study unavailable')
        action = mixer.clipAction(clip)
        action.play()
        action.paused = !playing
        mixer.timeScale = speed
      } catch (e) {
        if (!disposed)
          setError(
            'The 3D preview could not load. Exercise instructions remain available.',
          )
      }
    })().catch(() => {
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
      {error && (
        <p className="viewer-error" role="status">
          {error}
        </p>
      )}
      <div className="viewer-top">
        <span className="tag">ORIGINAL 3D STUDY</span>
        <span className="tag muted">Unreviewed prototype</span>
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
