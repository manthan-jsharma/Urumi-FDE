'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Programmatic "light tent" environment map
//
// Replaces the warm studio preset for diamond/gem rendering.
//
// A real light tent for gem photography is a dark room with many small bright
// point sources arranged in a hemisphere.  Each source becomes one distinct
// sparkle point on a flat facet — the more sources, the more "fire" you see.
//
// Implementation: build a tiny Three.js scene (dark sphere backdrop + 24 small
// emissive mesh "bulbs"), render it through PMREMGenerator → PMREM env map,
// set on scene.environment.  Color values > 1.0 give HDR brightness that causes
// Bloom to trigger on the reflected facets.
//
// Layout:
//   top cluster   — hits table + crown, key sources for brilliance
//   mid ring      — side facets, alternating warm/cool for colour variety
//   lower ring    — pavilion from below (fire / coloured dispersion)
//   nadir         — straight-down source for under-pavilion highlight
//
// [x, y, z, intensity, hex]  — position is normalized then placed at R=5
// ─────────────────────────────────────────────────────────────────────────────
const SPOTS: Array<[number, number, number, number, string]> = [
  //  ── top cluster ──────────────────────────────────────────────
  [ 0.0,  1.0,  0.0,  13, '#f0f8ff' ],   // zenith — key light for table
  [ 0.5,  0.9,  0.0,  11, '#ffffff' ],
  [-0.5,  0.9,  0.0,  11, '#fff8f0' ],   // slight warm
  [ 0.0,  0.9,  0.5,  11, '#ffffff' ],
  [ 0.0,  0.9, -0.5,  11, '#f0f0ff' ],   // slight cool
  [ 0.7,  0.7,  0.7,   8, '#ffffff' ],
  [-0.7,  0.7,  0.7,   8, '#fffaf0' ],
  [ 0.7,  0.7, -0.7,   8, '#f0f4ff' ],
  [-0.7,  0.7, -0.7,   8, '#ffffff' ],

  //  ── mid ring (side facets) ────────────────────────────────────
  [ 1.0,  0.2,  0.0,   7, '#fff5e0' ],   // warm left
  [-1.0,  0.2,  0.0,   7, '#e8f0ff' ],   // cool right — creates colour contrast
  [ 0.0,  0.2,  1.0,   7, '#ffffff' ],
  [ 0.0,  0.2, -1.0,   7, '#ffffff' ],
  [ 0.7,  0.2,  0.7,   6, '#fffaee' ],
  [-0.7,  0.2,  0.7,   6, '#eef4ff' ],
  [ 0.7,  0.2, -0.7,   6, '#ffffff' ],
  [-0.7,  0.2, -0.7,   6, '#f8f8ff' ],

  //  ── lower ring (pavilion fire from below) ─────────────────────
  [ 0.0, -0.6,  0.8,   6, '#ffffff' ],
  [ 0.0, -0.6, -0.8,   6, '#fff0f8' ],
  [ 0.8, -0.6,  0.0,   6, '#f8fff0' ],
  [-0.8, -0.6,  0.0,   6, '#f0f0ff' ],
  [ 0.6, -0.6,  0.6,   5, '#ffffff' ],
  [-0.6, -0.6, -0.6,   5, '#fffff8' ],
  [ 0.0, -1.0,  0.0,   5, '#e8f0ff' ],   // nadir — culet sparkle
]

const R = 5  // env sphere radius (world units)

// transparent: true → only set scene.environment, leave scene.background untouched.
// Use this when the Canvas has alpha:true and underlying DOM elements must show through.
// The diamond transmission will see the dark CSS background instead of the env map,
// which is acceptable when the page background is already near-black (#0a0a0a).
export function LightTentEnvironment({
  transparent         = false,
  backgroundIntensity = 0.06,
}: {
  transparent?:         boolean
  backgroundIntensity?: number
}) {
  const { gl, scene } = useThree()

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)

    const envScene = new THREE.Scene()
    // Very dark blue-black backdrop — like a black velvet photography table
    envScene.background = new THREE.Color(0.008, 0.008, 0.013)

    SPOTS.forEach(([x, y, z, intensity, hex]) => {
      const len = Math.sqrt(x * x + y * y + z * z)
      const c = new THREE.Color(hex)

      // HDR brightness: multiply channels by intensity (values > 1.0 → captured as
      // bright spots in PMREM → Bloom triggers on the reflected facets)
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(c.r * intensity, c.g * intensity, c.b * intensity),
      })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), mat)
      mesh.position.set((x / len) * R, (y / len) * R, (z / len) * R)
      envScene.add(mesh)
    })

    const rt     = pmrem.fromScene(envScene)
    const envMap = rt.texture

    // Clean up temporary env scene geometry
    envScene.traverse((node) => {
      const m = node as THREE.Mesh
      if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose() }
    })

    pmrem.dispose()

    scene.environment = envMap

    if (!transparent) {
      // Also use env map as scene.background — this is what the MeshPhysicalMaterial
      // transmission RT "sees through" the stone.  Without it, transmission shows the
      // solid dark canvas colour and the stone reads as a dark grey blob.
      // backgroundIntensity 0.06 keeps the visible background nearly black (preserving
      // the dark-luxury look) while the transmission pass still uses the full HDR tent
      // → each facet refracts a different slice of the bright spots → fire + life.
      scene.background = envMap
      ;(scene as any).backgroundIntensity = backgroundIntensity
    }

    return () => {
      scene.environment = null
      if (!transparent) scene.background = null
      rt.dispose()
    }
  }, [gl, scene, transparent, backgroundIntensity])

  return null
}
