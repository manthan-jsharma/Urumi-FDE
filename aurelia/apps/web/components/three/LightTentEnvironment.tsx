'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

// PMREMGenerator is the single most expensive per-canvas operation — 100–400ms GPU stall.
// Since the light tent geometry and parameters are identical across every canvas, we cache
// the generated render target per WebGL renderer. Each Canvas gets its own renderer (GL
// context), so generation happens exactly once per canvas lifetime, never on remount.
const pmremCache = new WeakMap<THREE.WebGLRenderer, THREE.WebGLRenderTarget>()

// Programmatic "light tent" environment map — 24 discrete emissive bulbs
// against a near-black backdrop.  Each bulb becomes one distinct sparkle
// on a diamond facet and one highlight arc on the gold band.
//
// Why not an HDRI? A neutral studio HDRI uniformly illuminates the ring,
// washing out the gold and flattening the diamond fire. A discrete bulb
// setup preserves the dark-luxury contrast: ~30% of facets blazing, ~70%
// near-black — which is how real jewelry photography looks.
//
// transparent: true → only set scene.environment, leave scene.background untouched.
// delay       → stagger PMREM generation so all three canvases don't spike GPU at once.
const SPOTS: Array<[number, number, number, number, string]> = [
  //  ── top cluster (table key + crown brilliance) ────────────────
  [ 0.0,  1.0,  0.0, 13, '#f0f8ff' ],
  [ 0.5,  0.9,  0.0, 11, '#ffffff' ],
  [-0.5,  0.9,  0.0, 11, '#fff8f0' ],
  [ 0.0,  0.9,  0.5, 11, '#ffffff' ],
  [ 0.0,  0.9, -0.5, 11, '#f0f0ff' ],
  [ 0.7,  0.7,  0.7,  8, '#ffffff' ],
  [-0.7,  0.7,  0.7,  8, '#fffaf0' ],
  [ 0.7,  0.7, -0.7,  8, '#f0f4ff' ],
  [-0.7,  0.7, -0.7,  8, '#ffffff' ],

  //  ── mid ring (side facets, warm/cool split for colour fire) ───
  [ 1.0,  0.2,  0.0,  7, '#fff5e0' ],
  [-1.0,  0.2,  0.0,  7, '#e8f0ff' ],
  [ 0.0,  0.2,  1.0,  7, '#ffffff' ],
  [ 0.0,  0.2, -1.0,  7, '#ffffff' ],
  [ 0.7,  0.2,  0.7,  6, '#fffaee' ],
  [-0.7,  0.2,  0.7,  6, '#eef4ff' ],
  [ 0.7,  0.2, -0.7,  6, '#ffffff' ],
  [-0.7,  0.2, -0.7,  6, '#f8f8ff' ],

  //  ── lower ring (pavilion fire from below) ─────────────────────
  [ 0.0, -0.6,  0.8,  6, '#ffffff' ],
  [ 0.0, -0.6, -0.8,  6, '#fff0f8' ],
  [ 0.8, -0.6,  0.0,  6, '#f8fff0' ],
  [-0.8, -0.6,  0.0,  6, '#f0f0ff' ],
  [ 0.6, -0.6,  0.6,  5, '#ffffff' ],
  [-0.6, -0.6, -0.6,  5, '#fffff8' ],
  [ 0.0, -1.0,  0.0,  5, '#e8f0ff' ],
]

const R = 5

export function LightTentEnvironment({
  transparent         = false,
  backgroundIntensity = 0.06,
  delay               = 0,
}: {
  transparent?:         boolean
  backgroundIntensity?: number
  delay?:               number
}) {
  const { gl, scene, invalidate } = useThree()

  useEffect(() => {
    let cancelled = false
    let rt: THREE.WebGLRenderTarget | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const applyEnv = (renderTarget: THREE.WebGLRenderTarget) => {
      scene.environment = renderTarget.texture
      if (!transparent) {
        scene.background = renderTarget.texture
        ;(scene as any).backgroundIntensity = backgroundIntensity
      }
      // Trigger a render so the env map is visible immediately — critical in demand
      // frameloop mode where setting scene.environment alone doesn't schedule a frame.
      invalidate()
    }

    const run = () => {
      if (cancelled) return

      // Cache hit: reuse existing env map for this GL context — zero GPU cost
      const cached = pmremCache.get(gl)
      if (cached) {
        applyEnv(cached)
        return
      }

      const pmrem = new THREE.PMREMGenerator(gl)

      const envScene = new THREE.Scene()
      envScene.background = new THREE.Color(0.008, 0.008, 0.013)

      SPOTS.forEach(([x, y, z, intensity, hex]) => {
        const len = Math.sqrt(x * x + y * y + z * z)
        const c = new THREE.Color(hex)
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(c.r * intensity, c.g * intensity, c.b * intensity),
        })
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), mat)
        mesh.position.set((x / len) * R, (y / len) * R, (z / len) * R)
        envScene.add(mesh)
      })

      rt = pmrem.fromScene(envScene)

      // Dispose temp scene geometry; keep rt alive — its texture lives in the cache
      envScene.traverse((node) => {
        const m = node as THREE.Mesh
        if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose() }
      })
      pmrem.dispose()

      if (cancelled) { rt.dispose(); rt = null; return }

      pmremCache.set(gl, rt)
      applyEnv(rt)
    }

    timer = setTimeout(run, delay)

    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
      scene.environment = null
      if (!transparent) scene.background = null
      // rt stays in pmremCache — reused if this GL context remounts LightTentEnvironment
    }
  }, [gl, scene, transparent, backgroundIntensity])

  return null
}
