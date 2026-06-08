/**
 * generate-stones.js
 * Run once: node scripts/generate-stones.js
 * Output:   public/models/stones.glb
 *
 * Builds geometrically accurate cut-stone meshes for all 6 shapes and packs
 * them into a single GLB.  RingMesh.tsx loads the GLB once and picks the mesh
 * by name based on stoneKey.
 *
 * Each stone is centred at origin, girdle at y=0, table up (+y), culet down (-y).
 * Scale is normalised: girdle radius = 1.0.  RingMesh applies world scale.
 *
 * Facet approach: flatShading is applied by the THREE material at runtime — the
 * geometry here just needs correct vertex positions (no normals needed in the GLB).
 */

const THREE = require('three')
const fs   = require('fs')
const path = require('path')

// ── Output path ──────────────────────────────────────────────────────────────
const OUT = path.resolve(__dirname, '../public/models/stones.glb')

// ── Geometry helpers ─────────────────────────────────────────────────────────

function v3(x, y, z) { return new THREE.Vector3(x, y, z) }

/**
 * Build an indexed BufferGeometry from a flat list of triangles.
 * Each triangle is [v0, v1, v2] where each v is a THREE.Vector3.
 * Vertices are deduplicated within epsilon to keep the index small.
 */
function buildGeometry(triangles) {
  const eps     = 1e-6
  const verts   = []   // [x,y,z, x,y,z, ...]
  const indices = []
  const map     = new Map()

  function key(v) {
    const x = Math.round(v.x / eps) * eps
    const y = Math.round(v.y / eps) * eps
    const z = Math.round(v.z / eps) * eps
    return `${x},${y},${z}`
  }

  function addVertex(v) {
    const k = key(v)
    if (map.has(k)) return map.get(k)
    const idx = verts.length / 3
    verts.push(v.x, v.y, v.z)
    map.set(k, idx)
    return idx
  }

  for (const [a, b, c] of triangles) {
    indices.push(addVertex(a), addVertex(b), addVertex(c))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(indices)
  return geo
}

/**
 * Distribute N points evenly around an ellipse (rx, rz) at height y.
 * angleOffset rotates the ring by that many radians.
 */
function ellipseRing(N, rx, rz, y, angleOffset = 0) {
  return Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + angleOffset
    return v3(rx * Math.cos(a), y, rz * Math.sin(a))
  })
}

/**
 * Triangulate a convex polygon (fan from first vertex).
 */
function fanTriangles(pts) {
  const tris = []
  for (let i = 1; i < pts.length - 1; i++) {
    tris.push([pts[0], pts[i], pts[i + 1]])
  }
  return tris
}

/**
 * Connect two rings of the same length with a strip of quads (2 tris each).
 * top[i] connects to bot[i], wrapping around.
 */
function stripTriangles(top, bot) {
  const N    = top.length
  const tris = []
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N
    tris.push([top[i], bot[i], bot[j]])
    tris.push([top[i], bot[j], top[j]])
  }
  return tris
}

// ── Brilliant-family builder ─────────────────────────────────────────────────
/**
 * Builds a brilliant-cut stone with the given outline shape.
 *
 * The standard round brilliant has:
 *   - 1  table  (flat N-gon, top face)
 *   - N  upper-girdle facets  (table → upper girdle)
 *   - N  star facets          (interleaved with upper girdle)
 *   - N  kite/bezel facets    (star → lower girdle)
 *   - N  lower-girdle facets  (kite → girdle)
 *   - N  pavilion main facets (girdle → pavilion break)
 *   - N  lower-pavilion facets
 *   - 1  culet
 *
 * We use N=8 (the standard for a brilliant), giving 57 facets.
 *
 * outline: function(angle) → {rx, rz} for the girdle outline at that angle.
 *   For a circle: () => ({rx:1, rz:1})
 *   For an oval:  (a) => ({rx:1.5, rz:1.0})
 *
 * proportions (all relative to girdle radius = 1.0):
 *   tableR   : table radius (flat top face)
 *   crownH   : crown height
 *   girdleH  : girdle thickness
 *   pavilionH: pavilion depth
 *   midCrownR: radius at crown break (between star and kite zones)
 */
function buildBrilliant({
  N          = 8,
  outline    = () => ({ rx: 1.0, rz: 1.0 }),
  tableR     = 0.53,
  crownH     = 0.16,
  girdleH    = 0.03,
  pavilionH  = 0.43,
  midCrownR  = 0.78,
}) {
  const tris = []

  // Heights
  const yTable    =  crownH + girdleH / 2
  const yUpperGrd =  girdleH / 2
  const yLowerGrd = -girdleH / 2
  const yCulet    = -(pavilionH + girdleH / 2)

  // Pavilion break — halfway down
  const yPavBreak = (yLowerGrd + yCulet) / 2

  const halfSeg = Math.PI / N

  // ── Table ring (N vertices, flat at yTable, radius tableR) ───────────────
  const tableRing = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + halfSeg
    return v3(tableR * Math.cos(a), yTable, tableR * Math.sin(a))
  })

  // ── Table face (fan) ─────────────────────────────────────────────────────
  tris.push(...fanTriangles(tableRing))

  // ── Crown star-facet tips (N points, at midCrownR, halfway in height) ────
  // These interleave with the table ring edges.
  // Star tips sit at the outline shape, rotated 0 (vs table ring at halfSeg offset).
  const starTip = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2
    const { rx, rz } = outline(a)
    const r = midCrownR
    return v3(r * rx * Math.cos(a), crownH * 0.55 + girdleH / 2, r * rz * Math.sin(a))
  })

  // ── Upper girdle ring (at girdle, full outline radius) ───────────────────
  // Two sets: aligned with table (halfSeg offset) and aligned with star tips (0)
  const upperGrdA = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + halfSeg
    const { rx, rz } = outline(a)
    return v3(rx * Math.cos(a), yUpperGrd, rz * Math.sin(a))
  })
  const upperGrdB = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2
    const { rx, rz } = outline(a)
    return v3(rx * Math.cos(a), yUpperGrd, rz * Math.sin(a))
  })

  // ── Crown: table → star tips → upper girdle ──────────────────────────────
  // Each "kite" facet: table[i], table[i+1], starTip[i]  (upper star)
  //                    starTip[i], upperGrdA[i], upperGrdA[i+1]  (lower kite)
  // Plus upper-girdle triangles between star tips and girdle
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N

    // Upper star facet: table edge → star tip
    tris.push([tableRing[i], tableRing[j], starTip[i]])

    // Kite facet: star tip → upper girdle (two triangles = quad)
    tris.push([starTip[i], upperGrdA[i], upperGrdA[j]])
    tris.push([tableRing[j], starTip[i], upperGrdA[j]])

    // Upper girdle facet (small triangle between girdle A and B)
    tris.push([upperGrdA[j], upperGrdB[j], starTip[i]])
    tris.push([starTip[i], upperGrdB[j], starTip[j]])
  }

  // ── Girdle (thin band between upper and lower girdle) ────────────────────
  const lowerGrdA = upperGrdA.map(v => v3(v.x, yLowerGrd, v.z))
  const lowerGrdB = upperGrdB.map(v => v3(v.x, yLowerGrd, v.z))

  tris.push(...stripTriangles(upperGrdA, lowerGrdA))
  tris.push(...stripTriangles(upperGrdB, lowerGrdB))
  // Tiny connecting strips between A and B sets at top and bottom of girdle
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N
    tris.push([upperGrdA[j], upperGrdB[j], lowerGrdA[j]])
    tris.push([upperGrdB[j], lowerGrdB[j], lowerGrdA[j]])
  }

  // ── Pavilion ──────────────────────────────────────────────────────────────
  // Main pavilion: lower girdle → pavilion break ring (halfway, smaller)
  // Lower pavilion: pavilion break → culet point

  const culet = v3(0, yCulet, 0)

  // Pavilion break ring — at midpoint, scaled inward
  const pavBreakA = lowerGrdA.map(v => {
    const t = 0.45  // how far inward at the break
    return v3(v.x * t, yPavBreak, v.z * t)
  })
  const pavBreakB = lowerGrdB.map(v => {
    const t = 0.45
    return v3(v.x * t, yPavBreak, v.z * t)
  })

  // Main pavilion facets (lower girdle A → break A)
  tris.push(...stripTriangles(lowerGrdA, pavBreakA))
  // Interleaved pavilion facets (lower girdle B → break B)
  tris.push(...stripTriangles(lowerGrdB, pavBreakB))

  // Lower pavilion → culet
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N
    tris.push([pavBreakA[i], culet, pavBreakA[j]])
    tris.push([pavBreakB[i], culet, pavBreakB[j]])
    // Small connecting tri between A and B at break
    tris.push([pavBreakA[j], pavBreakB[j], culet])
  }

  return buildGeometry(tris)
}

// ── Princess (step cut) builder ──────────────────────────────────────────────
/**
 * Princess cut: square outline, large table, step-cut crown and pavilion.
 * Rows of rectangular facets on crown and pavilion.
 *
 * Proportions (girdle half-side = 1.0):
 *   tableHalf : half-side of the square table
 *   crownH    : crown height
 *   girdleH   : girdle thickness
 *   pavilionH : pavilion depth
 *   rows      : number of step rows on crown and pavilion
 */
function buildPrincess({
  tableHalf  = 0.75,
  crownH     = 0.09,
  girdleH    = 0.025,
  pavilionH  = 0.50,
  crownRows  = 1,
  pavRows    = 2,
} = {}) {
  const tris = []

  const yTable    =  crownH + girdleH / 2
  const yUpperGrd =  girdleH / 2
  const yLowerGrd = -girdleH / 2
  const yCulet    = -(pavilionH + girdleH / 2)

  // Square corners
  function squareRing(halfSide, y) {
    return [
      v3( halfSide, y,  halfSide),
      v3(-halfSide, y,  halfSide),
      v3(-halfSide, y, -halfSide),
      v3( halfSide, y, -halfSide),
    ]
  }

  // Table face
  const tableRing = squareRing(tableHalf, yTable)
  tris.push(...fanTriangles(tableRing))

  // Crown steps
  const crownSteps = crownRows + 1
  for (let row = 0; row < crownRows; row++) {
    const t0 = row / crownRows
    const t1 = (row + 1) / crownRows
    const r0  = tableHalf + (1.0 - tableHalf) * t0
    const r1  = tableHalf + (1.0 - tableHalf) * t1
    const y0  = yTable   - crownH * t0
    const y1  = yTable   - crownH * t1
    const top = squareRing(r0, y0)
    const bot = squareRing(r1, y1)
    tris.push(...stripTriangles(top, bot))
  }

  // Girdle
  const upperGrd = squareRing(1.0, yUpperGrd)
  const lowerGrd = squareRing(1.0, yLowerGrd)
  // Connect last crown step to upper girdle
  const lastCrown = squareRing(1.0, yTable - crownH)
  tris.push(...stripTriangles(lastCrown, upperGrd))
  tris.push(...stripTriangles(upperGrd, lowerGrd))

  // Pavilion steps → culet point
  const culet = v3(0, yCulet, 0)
  for (let row = 0; row < pavRows; row++) {
    const t0 = row / pavRows
    const t1 = (row + 1) / pavRows
    const r0  = 1.0 - t0 * 0.7
    const r1  = 1.0 - t1 * 0.7
    const y0  = yLowerGrd - pavilionH * t0
    const y1  = yLowerGrd - pavilionH * t1
    const top = squareRing(r0, y0)
    const bot = squareRing(r1, y1)
    tris.push(...stripTriangles(top, bot))
  }
  // Final row → culet
  const lastPav = squareRing(1.0 - 0.7, yLowerGrd - pavilionH * ((pavRows - 1) / pavRows))
  const preCulet = squareRing(0.04, yCulet + 0.01)
  tris.push(...stripTriangles(lastPav, preCulet))
  for (let i = 0; i < 4; i++) {
    tris.push([preCulet[i], culet, preCulet[(i + 1) % 4]])
  }

  return buildGeometry(tris)
}

// ── Shape definitions ────────────────────────────────────────────────────────

function circleOutline()          { return () => ({ rx: 1.0,  rz: 1.0  }) }
function ovalOutline(rx, rz)      { return () => ({ rx,       rz       }) }

// Marquise: sharp navette points at 0° and 180°, widest at 90°/270°
// Uses sin^0.6 taper so tips converge to near-zero without being perfectly zero
// (which would create degenerate triangles at the apex).
function marquiseSilhouette(halfLen, halfWidth) {
  return (a) => {
    const taper = Math.pow(Math.abs(Math.sin(a)), 0.6)
    return { rx: Math.max(halfLen * taper, 0.04), rz: halfWidth }
  }
}

// Pear: sharp point at a=π/2 (+z), fully round at a=-π/2 (-z)
// The upper half tapers to a point; lower half stays elliptical.
function pearSilhouette(halfWidth, halfLength) {
  return (a) => {
    const sinA = Math.sin(a)
    // Only the upper half (sinA > 0) gets the pointed taper
    const taper = sinA > 0 ? Math.pow(1 - sinA, 0.55) : 1.0
    return { rx: Math.max(halfWidth * taper, 0.04), rz: halfLength }
  }
}

// Cushion: square-ish with rounded corners — use ellipse-like outline
function cushionOutline(R) {
  return (a) => {
    // Superellipse exponent ~3 gives rounded-square look
    const p  = 3.0
    const c  = Math.abs(Math.cos(a))
    const s  = Math.abs(Math.sin(a))
    const rr = R / Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p)
    return { rx: rr, rz: rr }
  }
}

// ── Build all stones ─────────────────────────────────────────────────────────

// All heights are in units where girdle radius = 1.0 (diameter = 2.0).
// GIA proportions are expressed as % of diameter, so all height values ≈ 2× the GIA %.
const stones = {
  stone_round: buildBrilliant({
    N:          8,
    outline:    circleOutline(),
    tableR:     0.54,   // 54% of diameter → 54% of radius (table is a ratio, not height)
    crownH:     0.30,   // 15% of diameter × 2 = 0.30
    girdleH:    0.04,   // 2% of diameter × 2 = 0.04
    pavilionH:  0.86,   // 43% of diameter × 2 = 0.86
    midCrownR:  0.78,
  }),

  stone_oval: buildBrilliant({
    N:          8,
    outline:    ovalOutline(1.35, 0.80),  // 1.35:0.80 aspect ratio (length:width)
    tableR:     0.52,
    crownH:     0.28,   // 14% × 2
    girdleH:    0.04,
    pavilionH:  0.84,   // 42% × 2
    midCrownR:  0.76,
  }),

  stone_marquise: buildBrilliant({
    N:          8,
    outline:    marquiseSilhouette(1.9, 1.0),  // 1.9:1 length:width, proper navette proportion
    tableR:     0.46,
    crownH:     0.24,   // 12% × 2
    girdleH:    0.04,
    pavilionH:  0.82,   // 41% × 2
    midCrownR:  0.74,
  }),

  stone_pear: buildBrilliant({
    N:          8,
    outline:    pearSilhouette(1.0, 0.75),  // width:length, pointed at top
    tableR:     0.50,
    crownH:     0.28,   // 14% × 2
    girdleH:    0.04,
    pavilionH:  0.84,   // 42% × 2
    midCrownR:  0.76,
  }),

  stone_cushion: buildBrilliant({
    N:          8,
    outline:    cushionOutline(1.0),
    tableR:     0.60,   // larger table — cushion's signature
    crownH:     0.26,   // 13% × 2
    girdleH:    0.04,
    pavilionH:  0.86,   // 43% × 2
    midCrownR:  0.80,
  }),

  stone_princess: buildPrincess({
    tableHalf:  0.73,   // 73% of girdle half-side
    crownH:     0.16,   // 8% × 2
    girdleH:    0.04,
    pavilionH:  1.04,   // 52% × 2 — princess has deeper pavilion
    crownRows:  1,
    pavRows:    3,      // extra step row for more facet detail
  }),
}

// ── Minimal GLB writer (pure Node.js, no browser APIs needed) ───────────────
//
// GLB binary layout:
//   12-byte header  : magic(4) + version(4) + totalLength(4)
//   JSON chunk      : chunkLen(4) + type 0x4E4F534A(4) + JSON padded to 4-byte align
//   BIN  chunk      : chunkLen(4) + type 0x004E4942(4) + binary padded to 4-byte align

function pad4(n) { return Math.ceil(n / 4) * 4 }

function writeGLB(meshMap, outPath) {
  const binParts   = []   // binary buffer segments
  const accessors  = []
  const bufViews   = []
  const meshDefs   = []
  const nodeDefs   = []
  let   binOffset  = 0

  function pushBufView(data, target) {
    const len = data.byteLength
    binParts.push(Buffer.from(data.buffer, data.byteOffset, len))
    bufViews.push({ buffer: 0, byteOffset: binOffset, byteLength: len, target })
    binOffset += len
  }

  for (const [name, geo] of Object.entries(meshMap)) {
    geo.computeBoundingBox()
    const bb  = geo.boundingBox
    const pos = geo.attributes.position
    const idx = geo.index

    // Position accessor
    const posData = new Float32Array(pos.array)
    pushBufView(posData, 34962 /* ARRAY_BUFFER */)
    const posAccIdx = accessors.length
    accessors.push({
      bufferView:    bufViews.length - 1,
      componentType: 5126,   // FLOAT
      count:         pos.count,
      type:          'VEC3',
      min:           [bb.min.x, bb.min.y, bb.min.z],
      max:           [bb.max.x, bb.max.y, bb.max.z],
    })

    // Index accessor — use Uint32 for safety
    const idxData = new Uint32Array(idx.array)
    pushBufView(idxData, 34963 /* ELEMENT_ARRAY_BUFFER */)
    const idxAccIdx = accessors.length
    accessors.push({
      bufferView:    bufViews.length - 1,
      componentType: 5125,   // UNSIGNED_INT
      count:         idx.count,
      type:          'SCALAR',
    })

    const meshIdx = meshDefs.length
    meshDefs.push({
      name,
      primitives: [{ attributes: { POSITION: posAccIdx }, indices: idxAccIdx, mode: 4 }],
    })
    nodeDefs.push({ name, mesh: meshIdx })

    console.log(`  ✓ ${name} — ${idx.count / 3} triangles, ${pos.count} vertices`)
  }

  // Pad binary buffer to 4-byte alignment
  const rawBinLen = binOffset
  const padBinLen = pad4(rawBinLen)
  const binBuf    = Buffer.concat([...binParts, Buffer.alloc(padBinLen - rawBinLen)])

  // GLTF JSON
  const json = {
    asset:       { version: '2.0', generator: 'generate-stones.js' },
    scene:       0,
    scenes:      [{ nodes: nodeDefs.map((_, i) => i) }],
    nodes:       nodeDefs,
    meshes:      meshDefs,
    accessors,
    bufferViews: bufViews,
    buffers:     [{ byteLength: padBinLen }],
  }
  const jsonStr    = JSON.stringify(json)
  const jsonBytes  = Buffer.from(jsonStr, 'utf8')
  const padJsonLen = pad4(jsonBytes.length)
  const jsonBuf    = Buffer.concat([jsonBytes, Buffer.alloc(padJsonLen - jsonBytes.length, 0x20)])

  // Assemble GLB
  const totalLen = 12 + 8 + padJsonLen + 8 + padBinLen
  const header   = Buffer.alloc(12)
  header.writeUInt32LE(0x46546C67, 0)   // magic 'glTF'
  header.writeUInt32LE(2,          4)   // version
  header.writeUInt32LE(totalLen,   8)

  const jsonChunkHeader = Buffer.alloc(8)
  jsonChunkHeader.writeUInt32LE(padJsonLen,  0)
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4)  // 'JSON'

  const binChunkHeader = Buffer.alloc(8)
  binChunkHeader.writeUInt32LE(padBinLen,   0)
  binChunkHeader.writeUInt32LE(0x004E4942, 4)   // 'BIN\0'

  const glb = Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, binBuf])
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, glb)
  console.log(`\n✅ Written: ${outPath} (${(glb.length / 1024).toFixed(1)} KB)`)
}

// ── Run ──────────────────────────────────────────────────────────────────────
writeGLB(stones, OUT)
