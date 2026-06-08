/**
 * generate-band-stones.js
 * Run: node scripts/generate-band-stones.js
 * Output: public/models/band-stones.glb
 *
 * 22 small round brilliants placed along the two helical strands of the
 * twist ring's band. The GLB uses GLTF node instancing — one shared
 * brilliant mesh, each stone is a node with its own translation/rotation/scale.
 *
 * Coordinate space: ring GLB node-space (raw accessor × node-scale 0.5).
 * In RingMesh.tsx the band stones group is added INSIDE clonedScene so it
 * inherits the same 1.8× primitive scale → effective world scale = 0.5 × 1.8 = 0.9.
 *
 * Ring geometry (from GLB analysis, after node-scale 0.5):
 *   Outer X extent: ±0.41  →  ring circle in XY plane, hole along Z axis
 *   Top (stone):     Y ≈ +0.50  (prong extends above ring arc)
 *   Ring arc radius: R ≈ 0.41
 *   Band Z half-width: ±0.15
 *
 * θ = 0° at top (+Y), measured clockwise: 90° = right (+X), 180° = bottom (−Y).
 * Stones span θ ∈ [GAP°, 360°−GAP°] leaving prong area clear.
 *
 * Tuning knobs at the top of CONFIG section below.
 */

const THREE = require('three')
const fs    = require('fs')
const path  = require('path')

const OUT = path.resolve(__dirname, '../public/models/band-stones.glb')

// ── CONFIG ───────────────────────────────────────────────────────────────────
// All units in ring node-space (×0.9 → world space, ×1.8 → after primitive scale)

const RING_R         = 0.36   // radial position of stone centres (node-space)
                               // ring outer radius ≈ 0.41, so this sits just inside
const STONE_SCALE    = 0.034  // uniform scale per stone (world ≈ 0.034 × 1.8 = 0.061)
const Z_AMP          = 0.058  // half-separation between the two strands in Z
                               // strands swap front/back around the ring (half-twist)
const N_PER_STRAND   = 11     // stones per strand (22 total)
const THETA_GAP_DEG  = 30     // degrees to skip at top (prong/setting zone)

// ── Geometry helpers ─────────────────────────────────────────────────────────

function v3(x, y, z) { return new THREE.Vector3(x, y, z) }

function buildGeometry(triangles) {
  const eps   = 1e-6
  const verts = []
  const inds  = []
  const map   = new Map()

  function key(v) {
    return `${Math.round(v.x/eps)*eps},${Math.round(v.y/eps)*eps},${Math.round(v.z/eps)*eps}`
  }
  function addVert(v) {
    const k = key(v)
    if (map.has(k)) return map.get(k)
    const i = verts.length / 3
    verts.push(v.x, v.y, v.z)
    map.set(k, i)
    return i
  }
  for (const [a, b, c] of triangles) inds.push(addVert(a), addVert(b), addVert(c))

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(inds)
  return geo
}

function fanTriangles(pts) {
  const t = []
  for (let i = 1; i < pts.length - 1; i++) t.push([pts[0], pts[i], pts[i+1]])
  return t
}

function stripTriangles(top, bot) {
  const N = top.length, t = []
  for (let i = 0; i < N; i++) {
    const j = (i+1) % N
    t.push([top[i], bot[i], bot[j]], [top[i], bot[j], top[j]])
  }
  return t
}

// ── Round brilliant geometry (same proportions as stones.glb) ────────────────
// Built at unit scale (girdle-radius = 1.0, table up +Y, culet at −Y).
// Each stone node applies STONE_SCALE as a uniform scale.

function buildBrilliant() {
  const N         = 8
  const tableR    = 0.54
  const crownH    = 0.30
  const girdleH   = 0.04
  const pavilionH = 0.86
  const midCrownR = 0.78
  const outline   = () => ({ rx: 1.0, rz: 1.0 })

  const tris = []
  const yTable    =  crownH + girdleH / 2
  const yUpperGrd =  girdleH / 2
  const yLowerGrd = -girdleH / 2
  const yCulet    = -(pavilionH + girdleH / 2)
  const yPavBreak = (yLowerGrd + yCulet) / 2
  const halfSeg   = Math.PI / N

  const tableRing = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + halfSeg
    return v3(tableR * Math.cos(a), yTable, tableR * Math.sin(a))
  })
  tris.push(...fanTriangles(tableRing))

  const starTip = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2
    const { rx, rz } = outline(a)
    return v3(midCrownR * rx * Math.cos(a), crownH * 0.55 + girdleH / 2, midCrownR * rz * Math.sin(a))
  })

  const mkGrd = (offset) => Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + offset
    const { rx, rz } = outline(a)
    return v3(rx * Math.cos(a), yUpperGrd, rz * Math.sin(a))
  })
  const upperGrdA = mkGrd(halfSeg)
  const upperGrdB = mkGrd(0)

  for (let i = 0; i < N; i++) {
    const j = (i+1) % N
    tris.push(
      [tableRing[i], tableRing[j], starTip[i]],
      [starTip[i], upperGrdA[i], upperGrdA[j]],
      [tableRing[j], starTip[i], upperGrdA[j]],
      [upperGrdA[j], upperGrdB[j], starTip[i]],
      [starTip[i], upperGrdB[j], starTip[j]],
    )
  }

  const lowerGrdA = upperGrdA.map(v => v3(v.x, yLowerGrd, v.z))
  const lowerGrdB = upperGrdB.map(v => v3(v.x, yLowerGrd, v.z))
  tris.push(...stripTriangles(upperGrdA, lowerGrdA), ...stripTriangles(upperGrdB, lowerGrdB))
  for (let i = 0; i < N; i++) {
    const j = (i+1) % N
    tris.push(
      [upperGrdA[j], upperGrdB[j], lowerGrdA[j]],
      [upperGrdB[j], lowerGrdB[j], lowerGrdA[j]],
    )
  }

  const culet     = v3(0, yCulet, 0)
  const pavBreakA = lowerGrdA.map(v => v3(v.x * 0.45, yPavBreak, v.z * 0.45))
  const pavBreakB = lowerGrdB.map(v => v3(v.x * 0.45, yPavBreak, v.z * 0.45))
  tris.push(...stripTriangles(lowerGrdA, pavBreakA), ...stripTriangles(lowerGrdB, pavBreakB))
  for (let i = 0; i < N; i++) {
    const j = (i+1) % N
    tris.push(
      [pavBreakA[i], culet, pavBreakA[j]],
      [pavBreakB[i], culet, pavBreakB[j]],
      [pavBreakA[j], pavBreakB[j], culet],
    )
  }

  return buildGeometry(tris)
}

// ── Stone placement: two helical strands ─────────────────────────────────────
//
// Ring circle: XY plane, θ=0 at top (+Y), clockwise → θ=π/2 at +X (right).
// Position on ring: P(θ) = (R·sinθ, R·cosθ, z(θ))
//
// Twist: the two strands oscillate in Z with opposite phases.
//   Strand 0: z =  Z_AMP · sin(θ)   → front at right (θ=90°), back at left
//   Strand 1: z = -Z_AMP · sin(θ)   → back at right, front at left
//
// Stone orientation: table faces radially outward (away from ring axis in XY).
// The brilliant is built with table in +Y. To face outward at ring angle θ,
// rotate about Z by −θ:
//   quaternion = [0, 0, sin(−θ/2), cos(−θ/2)]

function computeStones() {
  const gapRad   = THETA_GAP_DEG * Math.PI / 180
  const arcStart = gapRad
  const arcEnd   = 2 * Math.PI - gapRad
  const stones   = []

  for (let strand = 0; strand < 2; strand++) {
    const zSign = strand === 0 ? 1 : -1

    for (let n = 0; n < N_PER_STRAND; n++) {
      const t     = n / (N_PER_STRAND - 1)
      const theta = arcStart + t * (arcEnd - arcStart)

      const x = RING_R * Math.sin(theta)
      const y = RING_R * Math.cos(theta)
      const z = zSign * Z_AMP * Math.sin(theta)

      // Quaternion: rotate about Z axis by −theta
      const half = -theta / 2
      const qx = 0, qy = 0
      const qz = Math.sin(half)
      const qw = Math.cos(half)

      stones.push({
        name:        `band_stone_s${strand}_n${String(n).padStart(2, '0')}`,
        translation: [x, y, z],
        rotation:    [qx, qy, qz, qw],
        scale:       [STONE_SCALE, STONE_SCALE, STONE_SCALE],
      })
    }
  }

  return stones
}

// ── GLB writer — one shared mesh, N instanced nodes ──────────────────────────

function pad4(n) { return Math.ceil(n / 4) * 4 }

function writeGLBInstanced(geo, nodes, outPath) {
  const binParts  = []
  const accessors = []
  const bufViews  = []
  let   binOffset = 0

  function pushView(data, target) {
    const len = data.byteLength
    binParts.push(Buffer.from(data.buffer, data.byteOffset, len))
    bufViews.push({ buffer: 0, byteOffset: binOffset, byteLength: len, target })
    binOffset += len
  }

  geo.computeBoundingBox()
  const bb  = geo.boundingBox
  const pos = geo.attributes.position
  const idx = geo.index

  // Position accessor
  pushView(new Float32Array(pos.array), 34962)
  const posAcc = accessors.length
  accessors.push({
    bufferView:    bufViews.length - 1,
    componentType: 5126,
    count:         pos.count,
    type:          'VEC3',
    min:           [bb.min.x, bb.min.y, bb.min.z],
    max:           [bb.max.x, bb.max.y, bb.max.z],
  })

  // Index accessor
  pushView(new Uint32Array(idx.array), 34963)
  const idxAcc = accessors.length
  accessors.push({
    bufferView:    bufViews.length - 1,
    componentType: 5125,
    count:         idx.count,
    type:          'SCALAR',
  })

  const meshDefs = [{
    name:       'band_brilliant',
    primitives: [{ attributes: { POSITION: posAcc }, indices: idxAcc, mode: 4 }],
  }]

  // Each stone is a node pointing to mesh 0 with its own TRS transform
  const nodeDefs = nodes.map(n => ({
    name:        n.name,
    mesh:        0,
    translation: n.translation,
    rotation:    n.rotation,
    scale:       n.scale,
  }))

  // Pad binary
  const rawLen = binOffset
  const padLen = pad4(rawLen)
  const binBuf = Buffer.concat([...binParts, Buffer.alloc(padLen - rawLen)])

  // JSON
  const json = {
    asset:       { version: '2.0', generator: 'generate-band-stones.js' },
    scene:       0,
    scenes:      [{ nodes: nodeDefs.map((_, i) => i) }],
    nodes:       nodeDefs,
    meshes:      meshDefs,
    accessors,
    bufferViews: bufViews,
    buffers:     [{ byteLength: padLen }],
  }
  const jsonBytes  = Buffer.from(JSON.stringify(json), 'utf8')
  const padJsonLen = pad4(jsonBytes.length)
  const jsonBuf    = Buffer.concat([jsonBytes, Buffer.alloc(padJsonLen - jsonBytes.length, 0x20)])

  const totalLen = 12 + 8 + padJsonLen + 8 + padLen
  const header   = Buffer.alloc(12)
  header.writeUInt32LE(0x46546C67, 0)
  header.writeUInt32LE(2,          4)
  header.writeUInt32LE(totalLen,   8)

  const jsonChunk = Buffer.alloc(8)
  jsonChunk.writeUInt32LE(padJsonLen, 0)
  jsonChunk.writeUInt32LE(0x4E4F534A, 4)

  const binChunk = Buffer.alloc(8)
  binChunk.writeUInt32LE(padLen,    0)
  binChunk.writeUInt32LE(0x004E4942, 4)

  const glb = Buffer.concat([header, jsonChunk, jsonBuf, binChunk, binBuf])
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, glb)

  console.log(`\n✅ Written: ${outPath} (${(glb.length / 1024).toFixed(1)} KB)`)
  console.log(`   Mesh: 1 shared brilliant (${idx.count / 3} triangles, ${pos.count} vertices)`)
  console.log(`   Nodes: ${nodes.length} stones (${N_PER_STRAND} per strand × 2 strands)`)
}

// ── Run ──────────────────────────────────────────────────────────────────────

const geo    = buildBrilliant()
const stones = computeStones()

stones.forEach(s => {
  const [x, y, z] = s.translation
  const θdeg = (Math.atan2(x, y) * 180 / Math.PI).toFixed(1)
  console.log(`  ${s.name}  θ=${θdeg}°  z=${z.toFixed(3)}`)
})

writeGLBInstanced(geo, stones, OUT)
