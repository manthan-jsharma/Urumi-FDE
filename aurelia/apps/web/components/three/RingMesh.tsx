'use client'

import { useRef, useEffect, MutableRefObject } from 'react'
import { useGLTF } from '@react-three/drei'
import { useSpring } from '@react-spring/three'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { METAL_CONFIGS } from '@/lib/materials'

useGLTF.preload('/models/twist-ring.glb')

// ─────────────────────────────────────────────────────────────────────────────
// Gem shape configs
//
//   seg        — main facet count (N)
//   sx / sz    — group scale → silhouette (oval stretch, marquise boat, etc.)
//   ry         — y-rotation (princess: corners forward; cushion: octagon aligned)
//   tableRatio — table facet width relative to girdle radius
//   midRatio   — mid-crown radius (kite/star junction) relative to girdle radius
//   crownFrac  — crown height as fraction of total depth
//
// Crown is split into two frustum layers (star zone + kite zone) offset by
// half a segment.  With flatShading the layers read as separate facets, exactly
// like a real cut stone.  Pavilion is a single N-sided cone pointing down.
// ─────────────────────────────────────────────────────────────────────────────
interface GemCfg {
  seg: number
  sx: number; sz: number; ry: number
  tableRatio: number; midRatio: number; crownFrac: number
}

const GEM_CFG: Record<string, GemCfg> = {
  //          seg  sx     sz     ry           table  mid    crown
  round:    { seg: 8,  sx: 1.0,  sz: 1.0,  ry: 0,            tableRatio: 0.55, midRatio: 0.78, crownFrac: 0.35 },
  oval:     { seg: 8,  sx: 1.35, sz: 0.72, ry: 0,            tableRatio: 0.52, midRatio: 0.76, crownFrac: 0.35 },
  princess: { seg: 4,  sx: 1.0,  sz: 1.0,  ry: Math.PI / 4,  tableRatio: 0.88, midRatio: 0.94, crownFrac: 0.22 },
  cushion:  { seg: 8,  sx: 1.0,  sz: 1.0,  ry: Math.PI / 8,  tableRatio: 0.62, midRatio: 0.82, crownFrac: 0.32 },
  marquise: { seg: 8,  sx: 1.75, sz: 0.52, ry: 0,            tableRatio: 0.48, midRatio: 0.72, crownFrac: 0.33 },
  pear:     { seg: 8,  sx: 1.12, sz: 0.80, ry: 0,            tableRatio: 0.52, midRatio: 0.75, crownFrac: 0.33 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Diamond / gem material
//
// flatShading: true  ← THE critical change.  Each polygon face gets its own
//   uniform normal computed per-fragment via derivatives.  This makes each
//   facet reflect / refract light at a different angle, producing the
//   characteristic fire-and-brilliance contrast pattern of a real cut stone.
//   With IOR 2.42, the refraction delta between adjacent flat faces is large
//   enough to produce clearly distinct "panes" of colour — just like real fire.
//
// envMapIntensity 2.0  — enough IBL to give visible sparkle without gold tint.
//   The white base colour + white attenuation absorb the studio warmth.
// ─────────────────────────────────────────────────────────────────────────────
function makeDiamondMat(envIntensity = 5.5, transmission = 0.88): THREE.MeshPhysicalMaterial {
  const hasTransmission = transmission > 0

  return new THREE.MeshPhysicalMaterial({
    // Slight blue-white — characteristic of a D/E grade brilliant diamond
    color:               new THREE.Color(hasTransmission ? '#ffffff' : '#eef4ff'),

    // Transmission path (requires scene.background to refract into)
    transmission:        hasTransmission ? transmission : 0,
    thickness:           hasTransmission ? 1.8  : 0,
    ior:                 2.42,
    attenuationDistance: hasTransmission ? 8.0  : 0,
    attenuationColor:    new THREE.Color('#ffffff'),

    roughness:           0.0,    // perfect mirror at every facet
    metalness:           0.0,
    envMapIntensity:     envIntensity,

    // When transmission === 0 render as opaque so depth sorts correctly against band
    transparent:         hasTransmission,
    depthWrite:          !hasTransmission,

    clearcoat:           1.0,    // secondary Fresnel layer → surface "wetness"
    clearcoatRoughness:  0.0,
    reflectivity:        1.0,

    flatShading:         true,   // each polygon = one flat mirror → distinct facet flashes
    side:                THREE.DoubleSide,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Faceted gem geometry
//
// Crown (2 layers, offset by half-segment so edges don't align):
//   Star zone  (top half)  : tableR → midR  [rotated π/N]
//   Kite zone  (bot half)  : midR   → R
//
// Looking from the front, alternating kite and star panels read at different
// specular angles — matching the visual rhythm of a real brilliant crown.
//
// Pavilion: single N-sided inverted cone (N triangular main facets → culet).
// With flatShading, the 8 faces show the classic "arrows" pattern visible in
// excellent-cut diamonds when viewed from below.
//
// Girdle: thicker closed cylinder (N×4 segments → nearly smooth ring), its
// closed caps fill the junction gap between kite zone and pavilion.
// ─────────────────────────────────────────────────────────────────────────────
export function makeDiamond(radius: number, totalHeight: number, shape = 'round', envIntensity = 5.5, transmission = 0.88): THREE.Group {
  const cfg    = GEM_CFG[shape] ?? GEM_CFG.round
  const N      = cfg.seg
  const crownH = totalHeight * cfg.crownFrac
  const girdH  = totalHeight * 0.028
  const pavilH = totalHeight - crownH - girdH
  const tableR = radius * cfg.tableRatio
  const midR   = radius * cfg.midRatio
  const halfC  = crownH / 2

  const mat = makeDiamondMat(envIntensity, transmission)
  const g   = new THREE.Group()

  // ── Table (flat N-gon cap at top) ─────────────────────────────
  const tableMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(tableR, tableR, 0.001, N, 1, false),
    mat,
  )
  tableMesh.position.y = crownH
  g.add(tableMesh)

  // ── Crown star zone (table → mid-crown, rotated π/N) ──────────
  // Open-ended: no cap faces → only the N flat trapezoidal side faces
  const starMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(tableR, midR, halfC, N, 1, true),
    mat,
  )
  starMesh.position.y = crownH - halfC / 2
  starMesh.rotation.y = Math.PI / N   // half-segment offset → interleaves with kite edges
  g.add(starMesh)

  // ── Crown kite zone (mid-crown → girdle) ──────────────────────
  const kiteMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(midR, radius, halfC, N, 1, true),
    mat,
  )
  kiteMesh.position.y = halfC / 2
  g.add(kiteMesh)

  // ── Girdle (smooth closed band, fills crown–pavilion gap) ──────
  // N×4 segments → very small flat faces approximate a smooth ring
  const girdMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, girdH, N * 4, 1, false),
    mat,
  )
  girdMesh.position.y = -girdH / 2
  g.add(girdMesh)

  // ── Pavilion — 2-layer (doubles the "arrows" pattern) ─────────
  //
  // Real round brilliants have 8 main pavilion facets + 16 lower-girdle facets.
  // Same 2-layer trick used in the crown: one cone at full radius, a second cone
  // at 96% radius rotated π/N so its N faces interleave with the first cone's N.
  // Result: 2N distinct flat faces each at a different azimuth → 2× sparkle scatter.
  //
  // Both cones are openEnded (no circular base cap) → only the triangular faces,
  // which all converge at the culet.

  // Outer / main facets
  const pavilMainMesh = new THREE.Mesh(
    new THREE.ConeGeometry(radius, pavilH, N, 1, true),
    mat,
  )
  pavilMainMesh.rotation.x = Math.PI
  pavilMainMesh.position.y = -girdH - pavilH / 2
  g.add(pavilMainMesh)

  // Inner / lower-girdle facets — rotated half-segment, slightly smaller radius
  // to avoid z-fighting at the girdle edge while keeping the same culet apex
  const pavilLGMesh = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.96, pavilH, N, 1, true),
    mat,
  )
  pavilLGMesh.rotation.x = Math.PI
  pavilLGMesh.rotation.y = Math.PI / N   // half-segment offset → interleaved
  pavilLGMesh.position.y = -girdH - pavilH / 2
  g.add(pavilLGMesh)

  // ── Culet — tiny flat N-gon at the apex ──────────────────────
  //
  // Without this, the cone apex is a perfect point which renders black (no face
  // normal → no reflection).  A small flat disc gives the authentic bright centre
  // spot visible through the table of every well-cut diamond when lit from above.
  // It also covers the z-fighting that both pavilion cones share at the apex.
  const culetR    = radius * 0.04
  const culetMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(culetR, culetR, 0.001, N, 1, false),
    mat,
  )
  culetMesh.position.y = -girdH - pavilH
  g.add(culetMesh)

  // ── Shape silhouette ──────────────────────────────────────────
  g.scale.set(cfg.sx, 1, cfg.sz)
  if (cfg.ry !== 0) g.rotation.y = cfg.ry

  return g
}

function disposeDiamond(group: THREE.Group) {
  group.traverse((node) => {
    const m = node as THREE.Mesh
    if (m.isMesh) {
      m.geometry.dispose()
      if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose())
      else (m.material as THREE.Material).dispose()
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Case A helper — multi-mesh GLB: replace placeholder with faceted gem
// Returns tracking refs needed for stone switching
// ─────────────────────────────────────────────────────────────────────────────
function installDiamond(
  stoneMesh: THREE.Mesh,
  sceneRoot: THREE.Object3D,
  stoneShape: string,
  envIntensity = 5.5,
  transmission = 0.88,
): { group: THREE.Group; parent: THREE.Object3D; pos: THREE.Vector3; radius: number } {
  stoneMesh.geometry.computeBoundingBox()
  const localBBox = stoneMesh.geometry.boundingBox!.clone()
  localBBox.applyMatrix4(stoneMesh.matrix)

  const center = new THREE.Vector3()
  localBBox.getCenter(center)
  const size = new THREE.Vector3()
  localBBox.getSize(size)

  const radius = Math.max(size.x, size.z) / 2 * 0.35
  const height = radius * 1.55

  const diamond = makeDiamond(radius, height, stoneShape, envIntensity, transmission)
  diamond.position.set(center.x, center.y + 0.15 * height, center.z)

  const parent = stoneMesh.parent ?? sceneRoot
  parent.add(diamond)

  const hiddenMat = new THREE.MeshBasicMaterial({ visible: false })
  stoneMesh.material = Array.isArray(stoneMesh.material)
    ? stoneMesh.material.map(() => hiddenMat)
    : hiddenMat

  return { group: diamond, parent, pos: diamond.position.clone(), radius }
}

// ─────────────────────────────────────────────────────────────────────────────

interface RingMeshProps {
  metalKey?: string
  stoneKey?: string
  autoRotate?: boolean
  rotateSpeed?: number
  stoneEnvIntensity?: number
  stoneTransmission?: number
  mouseRef?: MutableRefObject<{ x: number; y: number }>
  onReady?: () => void
}

export function RingMesh({
  metalKey           = '14k-yellow',
  stoneKey           = 'round',
  autoRotate         = false,
  rotateSpeed        = 0.35,
  stoneEnvIntensity  = 5.5,
  stoneTransmission  = 0.88,
  mouseRef,
  onReady,
}: RingMeshProps) {
  const groupRef            = useRef<THREE.Group>(null)
  const bandMaterialRef     = useRef<THREE.MeshPhysicalMaterial | null>(null)
  const diamondInstalledRef = useRef(false)
  const isInitialMountRef   = useRef(true)   // skip stone-switch effect on first mount
  const { scene }           = useGLTF('/models/twist-ring.glb')
  const clonedScene         = useRef(scene.clone(true))

  // Diamond tracking refs — used to replace the gem on stoneKey changes
  const diamondGroupRef  = useRef<THREE.Group | null>(null)
  const diamondParentRef = useRef<THREE.Object3D | null>(null)
  const girdlePosRef     = useRef<THREE.Vector3 | null>(null)
  const stoneRadiusRef   = useRef<number>(0.183)

  const config = METAL_CONFIGS[metalKey] ?? METAL_CONFIGS['14k-yellow']

  const spring = useSpring({
    color:           config.color,
    metalness:       config.metalness,
    roughness:       config.roughness,
    envMapIntensity: config.envMapIntensity,
    clearcoat:       config.clearcoat,
    config: { mass: 1, tension: 160, friction: 40 },
  })

  // ── Initial setup: install diamond once on mount ─────────────
  useEffect(() => {
    if (diamondInstalledRef.current) return
    diamondInstalledRef.current = true

    clonedScene.current.updateMatrixWorld(true)

    const allMeshes: THREE.Mesh[] = []
    clonedScene.current.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return
      const mesh = node as THREE.Mesh
      mesh.castShadow    = true
      mesh.receiveShadow = true
      allMeshes.push(mesh)
    })
    if (allMeshes.length === 0) return

    const createBandMat = (normalMap: THREE.Texture | null) =>
      new THREE.MeshPhysicalMaterial({
        color:              new THREE.Color(config.color),
        metalness:          config.metalness,
        roughness:          config.roughness,
        envMapIntensity:    config.envMapIntensity,
        clearcoat:          config.clearcoat,
        clearcoatRoughness: config.clearcoatRoughness,
        ...(normalMap ? { normalMap, normalScale: new THREE.Vector2(0.4, 0.4) } : {}),
        reflectivity: 1.0,
      })

    // ── Case A: Multiple meshes — identify stone by Y-center ─────
    if (allMeshes.length > 1) {
      const sceneBox = new THREE.Box3()
      allMeshes.forEach(m => {
        m.geometry.computeBoundingBox()
        sceneBox.union(m.geometry.boundingBox!)
      })
      const sceneHeight = sceneBox.max.y - sceneBox.min.y
      const stoneSplitY = sceneBox.min.y + sceneHeight * 0.65

      let stoneMeshFound: THREE.Mesh | null = null

      allMeshes.forEach(mesh => {
        const bbox    = mesh.geometry.boundingBox!
        const centerY = (bbox.min.y + bbox.max.y) / 2
        const oldMat  = mesh.material as THREE.MeshStandardMaterial
        const normalMap = (oldMat as any)?.normalMap ?? null

        if (centerY > stoneSplitY) {
          stoneMeshFound = mesh
        } else {
          const bandMat = createBandMat(normalMap)
          if (!bandMaterialRef.current) bandMaterialRef.current = bandMat
          mesh.material = bandMat
        }
      })

      if (stoneMeshFound) {
        const { group, parent, pos, radius } = installDiamond(
          stoneMeshFound!,
          clonedScene.current,
          stoneKey,
          stoneEnvIntensity,
          stoneTransmission,
        )
        diamondGroupRef.current  = group
        diamondParentRef.current = parent
        girdlePosRef.current     = pos
        stoneRadiusRef.current   = radius
      }
      return
    }

    // ── Case B: Single mesh — split geometry by Y threshold ──────
    //
    // GLB geometry analysis (KHR_mesh_quantization, normalized float coords):
    //   Full ring Y: [-1.0, 1.0]   X: ±0.825   Z: ±0.294
    //   Prong arms Y≈0.60–0.80 (xHalf=0.655→0.305); stone cap Y=0.80–1.0
    //
    // splitFraction 0.90 → splitY≈0.80: keeps shoulders + prong arms as gold,
    // hides only the stone placeholder cap behind the glass diamond.
    const mesh      = allMeshes[0]
    const geo       = mesh.geometry
    const oldMat    = mesh.material as THREE.MeshStandardMaterial
    const normalMap = (oldMat as any)?.normalMap ?? null

    geo.computeBoundingBox()
    const bbox        = geo.boundingBox!
    const totalHeight = bbox.max.y - bbox.min.y
    const splitY      = bbox.min.y + totalHeight * 0.90

    const positions = geo.attributes.position
    const index     = geo.index

    if (index && positions) {
      const bandIdx:  number[] = []
      const stoneIdx: number[] = []

      for (let i = 0; i < index.count; i += 3) {
        const i0 = index.getX(i), i1 = index.getX(i + 1), i2 = index.getX(i + 2)
        const avgY = (positions.getY(i0) + positions.getY(i1) + positions.getY(i2)) / 3
        if (avgY > splitY) stoneIdx.push(i0, i1, i2)
        else               bandIdx.push(i0, i1, i2)
      }

      if (bandIdx.length > 0 && stoneIdx.length > 0) {
        const UseArray = index.array instanceof Uint16Array ? Uint16Array : Uint32Array
        const merged   = new UseArray([...bandIdx, ...stoneIdx])
        geo.setIndex(new THREE.BufferAttribute(merged, 1))
        geo.clearGroups()
        geo.addGroup(0, bandIdx.length, 0)
        geo.addGroup(bandIdx.length, stoneIdx.length, 1)

        const bandMat   = createBandMat(normalMap)
        bandMaterialRef.current = bandMat
        mesh.material   = [bandMat, new THREE.MeshBasicMaterial({ visible: false })]

        // STONE_RADIUS from GLB binary analysis:
        //   Prong basket XZ ≈ ±0.305 float-space × 0.9 net scale → world r ≈ 0.165
        const STONE_RADIUS = 0.183
        stoneRadiusRef.current = STONE_RADIUS

        const girdleLocal = new THREE.Vector3(0, splitY, 0)
        girdleLocal.applyMatrix4(mesh.matrix)
        girdlePosRef.current = girdleLocal.clone()

        const diamond = makeDiamond(STONE_RADIUS, STONE_RADIUS * 1.55, stoneKey, stoneEnvIntensity, stoneTransmission)
        diamond.position.copy(girdleLocal)
        const parent = mesh.parent ?? clonedScene.current
        parent.add(diamond)
        diamondGroupRef.current  = diamond
        diamondParentRef.current = parent
        return
      }
    }

    // ── Fallback ──────────────────────────────────────────────────
    const bandMat = createBandMat(normalMap)
    bandMaterialRef.current = bandMat
    mesh.material = bandMat
  }, [])

  // ── Signal ready after first mount (model resolved from suspense) ──
  useEffect(() => {
    onReady?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stone switching — replace gem when stoneKey changes ───────
  useEffect(() => {
    // Skip on first mount — initial install above already used the correct shape
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }

    const parent = diamondParentRef.current
    const pos    = girdlePosRef.current
    if (!parent || !pos) return

    if (diamondGroupRef.current) {
      parent.remove(diamondGroupRef.current)
      disposeDiamond(diamondGroupRef.current)
      diamondGroupRef.current = null
    }

    const r       = stoneRadiusRef.current
    const diamond = makeDiamond(r, r * 1.55, stoneKey, stoneEnvIntensity, stoneTransmission)
    diamond.position.copy(pos)
    parent.add(diamond)
    diamondGroupRef.current = diamond
  }, [stoneKey])

  // ── Rotation + mouse ──────────────────────────────────────────
  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    if (!group) return

    if (autoRotate) {
      const t = clock.getElapsedTime()
      group.rotation.y += delta * rotateSpeed
      group.rotation.x  = Math.sin(t * 0.4) * 0.04
    }

    if (!autoRotate && mouseRef) {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      group.rotation.x += (my * 0.02 - group.rotation.x) * 0.05
      group.rotation.y += (mx * 0.02 - group.rotation.y) * 0.05
    }

    const mat = bandMaterialRef.current
    if (mat) {
      mat.color.set(spring.color.get())
      mat.metalness        = spring.metalness.get()
      mat.roughness        = spring.roughness.get()
      mat.envMapIntensity  = spring.envMapIntensity.get()
      mat.clearcoat        = spring.clearcoat.get()
      mat.needsUpdate      = false
    }
  })

  return (
    <>
      {/* Three-point jewelry lighting */}
      <spotLight
        position={[3, 5, 3]}
        intensity={120}
        angle={0.22}
        penumbra={0.6}
        color="#fff6e0"
        castShadow={false}
      />
      <spotLight
        position={[-5, 2, 1]}
        intensity={30}
        angle={0.5}
        penumbra={1}
        color="#ddeeff"
        castShadow={false}
      />
      {/* Down-light for table sparkle — reduced: crown key in Hero already covers this */}
      <spotLight
        position={[0, 6, 1]}
        intensity={22}
        angle={0.18}
        penumbra={0.3}
        color="#ffffff"
        castShadow={false}
      />
      {/* Under-lights for pavilion fire — reduced to avoid bottom band hot spot */}
      <pointLight position={[0, -2, 2]}  intensity={10} color="#ffffff" />
      <pointLight position={[0, -1, -4]} intensity={8}  color="#ffffff" />

      <group ref={groupRef}>
        <primitive object={clonedScene.current} scale={1.8} />
      </group>
    </>
  )
}
