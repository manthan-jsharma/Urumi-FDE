/**
 * generate-stones.js  (v3 — crown-heavy, top-view detail)
 *
 * Strategy: pack most triangles into the crown (table + star + kite + upper girdle)
 * so the top-down view shows a rich facet pattern. Pavilion stays simpler.
 *
 * NON-INDEXED geometry: each triangle gets unique vertices so flatShading gives
 * every face its own normal. buildGeometry still deduplicates for GLB size, but
 * we call toNonIndexed()-style construction by making each logical facet use
 * its own v3() instances that won't numerically collide with neighbours.
 *
 * Crown breakdown per brilliant (N=8, 8-fold symmetry):
 *   - Table: 1 large octagon → 6 tris
 *   - 8 bezel/kite facets (table→girdle): each split into 3 tris = 24 tris
 *   - 8 star facets: 1 tri each = 8 tris
 *   - 16 upper-girdle half-facets (thin): 1 tri each = 16 tris
 *   - 8 secondary star splits (extra crown detail): 2 tris each = 16 tris
 *   Crown total: ~70 tris
 *
 * Pavilion (simpler):
 *   - Girdle band: 16 quads = 32 tris
 *   - 8 pavilion mains: 2 tris each = 16 tris
 *   - 16 lower girdle half-facets: 1 tri each = 16 tris
 *   - Culet fan: 16 tris
 *   Pavilion total: ~80 tris
 *
 * Total per brilliant: ~150 tris (clean, no wasted geometry)
 * Princess: similar crown-heavy approach with octagonal crown rings
 */

"use strict";

const THREE = require("three");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "../public/models/stones.glb");

// ── Core helpers ──────────────────────────────────────────────────────────────

function v(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

// Build indexed BufferGeometry from triangle list
function buildGeometry(triangles) {
  const eps = 1e-5;
  const pos = [];
  const idx = [];
  const map = new Map();

  function addV(pt) {
    const k = `${Math.round(pt.x / eps)},${Math.round(pt.y / eps)},${Math.round(
      pt.z / eps
    )}`;
    if (map.has(k)) return map.get(k);
    const i = pos.length / 3;
    pos.push(pt.x, pt.y, pt.z);
    map.set(k, i);
    return i;
  }

  for (const [a, b, c] of triangles) {
    idx.push(addV(a), addV(b), addV(c));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

function fan(pts) {
  const t = [];
  for (let i = 1; i < pts.length - 1; i++) t.push([pts[0], pts[i], pts[i + 1]]);
  return t;
}

function strip(a, b) {
  const t = [],
    N = a.length;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    t.push([a[i], b[i], b[j]], [a[i], b[j], a[j]]);
  }
  return t;
}

// ── Outline functions ─────────────────────────────────────────────────────────

const circle = () => (_a) => ({ rx: 1, rz: 1 });
const oval = (rx, rz) => (_a) => ({ rx, rz });
const cushion = (R) => (a) => {
  const p = 4,
    c = Math.abs(Math.cos(a)),
    s = Math.abs(Math.sin(a));
  const r = R / Math.pow(c ** p + s ** p, 1 / p);
  return { rx: r, rz: r };
};
const marquise = (L, W) => (a) => ({
  rx: Math.max(L * Math.pow(Math.abs(Math.sin(a)), 0.42), 0.05),
  rz: W,
});
const pear = (W, L) => (a) => {
  const s = Math.sin(a);
  return { rx: Math.max(W * (s > 0 ? Math.pow(1 - s, 0.42) : 1), 0.05), rz: L };
};

// ── Brilliant builder ─────────────────────────────────────────────────────────
/**
 * Crown-heavy brilliant. Each crown zone uses multiple triangles per facet
 * to create the characteristic flash pattern visible from above.
 *
 * Crown zones (top view):
 *   [table octagon] → [8 kite facets radiating out] → [8 star tips between kites]
 *   → [16 thin upper-girdle half-facets at the perimeter]
 *   Each kite is further subdivided with a midpoint for more facet angles.
 */
function buildBrilliant({
  N = 8,
  shape = circle(),
  tableR = 0.53,
  crownH = 0.288,
  girdleH = 0.034,
  pavilionH = 0.862,
} = {}) {
  const T = [];

  const yTbl = crownH + girdleH / 2;
  const yUG = girdleH / 2;
  const yLG = -girdleH / 2;
  const yC = -(pavilionH + girdleH / 2);
  const yPB = yLG - pavilionH * 0.55; // pavilion break

  const hs = Math.PI / N; // half-segment angle

  // angle arrays
  const angA = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2 + hs); // bezel/table
  const angB = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2); // star tips

  // point on outline at angle a, radius scale r, height y
  function op(a, r, y) {
    const { rx, rz } = shape(a);
    return v(r * rx * Math.cos(a), y, r * rz * Math.sin(a));
  }

  // ── TABLE ─────────────────────────────────────────────────────────────────
  // Octagonal table — flat face, 6 triangles
  const tblRing = angA.map((a) =>
    v(tableR * Math.cos(a), yTbl, tableR * Math.sin(a))
  );
  T.push(...fan(tblRing));

  // ── CROWN (top-view heavy) ────────────────────────────────────────────────
  // For each of N sectors, build detailed crown facets:
  //
  //   Table edge (tblRing[i]→tblRing[j])
  //      ↓ star facet (triangle pointing down toward girdle midpoint)
  //   Star tip (ST[i]) at radius 0.62 at angle angB[i]
  //      ↓ two half-kite wings (left: angA[i] side, right: angA[j] side)
  //   Upper girdle points at UGA[i], UGA[j] (angA) and UGB[i] (angB)
  //
  // Additionally, split each half-kite into TWO triangles using a mid-point
  // for extra facet angles in the crown.

  // Star tip ring — at a crown height between table and girdle
  const yStarH = yUG + (yTbl - yUG) * 0.38;
  const ST = angB.map((a) => op(a, 0.63, yStarH));

  // Upper girdle at A and B angles
  const UGA = angA.map((a) => op(a, 1.0, yUG));
  const UGB = angB.map((a) => op(a, 1.0, yUG));

  // "kite midpoints" — halfway between star tip and girdle, for kite subdivision
  const KMA = angA.map((a, i) => {
    // midpoint between adjacent ST and UGA — gives an extra ridge on each kite
    const st = ST[i === 0 ? N - 1 : i - 1];
    const ug = UGA[i];
    return v((st.x + ug.x) / 2, (st.y + ug.y) / 2 + 0.008, (st.z + ug.z) / 2);
  });

  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const tI = tblRing[i],
      tJ = tblRing[j];
    const stI = ST[i];
    const ugAi = UGA[i],
      ugAj = UGA[j];
    const ugBi = UGB[i],
      ugBj = UGB[j];
    const kmI = KMA[i],
      kmJ = KMA[j];

    // 1. Star facet: table edge → star tip (visible "bow-tie" from top)
    T.push([tI, tJ, stI]);

    // 2. Left half-kite: tI → stI → ugAi, further split with kmI
    T.push([tI, stI, kmI]); // upper-left micro-facet
    T.push([tI, kmI, ugAi]); // lower-left micro-facet

    // 3. Right half-kite: tJ → ugAj → stI, split with kmJ
    T.push([tJ, kmJ, stI]); // upper-right micro-facet
    T.push([tJ, ugAj, kmJ]); // lower-right micro-facet

    // 4. Upper-girdle half-facets (thin triangles at perimeter, steep angle)
    //    Left:  stI → ugAi → ugBi
    //    Right: stI → ugBj → ugAj
    T.push([stI, ugAi, ugBi]);
    T.push([stI, ugBj, ugAj]);

    // 5. Extra crown split: subdivide the ugBi-to-ugAi zone with a near-girdle point
    //    This adds the "upper girdle flash" facets visible from top
    const midGrd = v((ugAi.x + ugBi.x) / 2, yUG + 0.006, (ugAi.z + ugBi.z) / 2);
    T.push([stI, ugBi, midGrd]);
    T.push([stI, midGrd, ugAi]);

    // Same on the other side
    const midGrd2 = v(
      (ugAj.x + ugBj.x) / 2,
      yUG + 0.006,
      (ugAj.z + ugBj.z) / 2
    );
    T.push([stI, ugAj, midGrd2]);
    T.push([stI, midGrd2, ugBj]);
  }

  // ── GIRDLE BAND ───────────────────────────────────────────────────────────
  const LGA = angA.map((a) => op(a, 1.0, yLG));
  const LGB = angB.map((a) => op(a, 1.0, yLG));

  T.push(...strip(UGA, LGA));
  T.push(...strip(UGB, LGB));
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push([UGB[i], UGA[j], UGB[j]], [UGB[i], UGA[i], UGA[j]]);
    T.push([LGB[i], LGB[j], LGA[j]], [LGB[i], LGA[j], LGA[i]]);
  }

  // ── PAVILION (simpler — less visible from top) ────────────────────────────
  const CU = v(0, yC, 0);
  const PBA = LGA.map((p) => v(p.x * 0.5, yPB, p.z * 0.5));
  const PBB = LGB.map((p) => v(p.x * 0.5, yPB, p.z * 0.5));

  T.push(...strip(LGA, PBA));
  T.push(...strip(LGB, PBB));

  // Lower girdle half-facets
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push([LGA[j], PBA[j], PBB[j]], [LGA[j], PBB[i], PBA[i]]);
    T.push([PBA[i], PBB[i], PBA[j]], [PBB[i], PBB[j], PBA[j]]);
  }

  // Lower pavilion → culet
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push([PBA[i], CU, PBA[j]]);
    T.push([PBB[i], PBB[j], CU]);
    T.push([PBA[j], PBB[j], CU]);
  }

  return buildGeometry(T);
}

// ── Cushion: same crown logic, extra split pavilion ───────────────────────────
function buildCushion() {
  const N = 8,
    sh = cushion(1.0);
  const T = [];

  const tableR = 0.61,
    crownH = 0.26,
    girdleH = 0.04,
    pavilionH = 0.87;
  const yTbl = crownH + girdleH / 2;
  const yUG = girdleH / 2;
  const yLG = -girdleH / 2;
  const yC = -(pavilionH + girdleH / 2);

  const hs = Math.PI / N;
  const angA = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2 + hs);
  const angB = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2);
  function op(a, r, y) {
    const { rx, rz } = sh(a);
    return v(r * rx * Math.cos(a), y, r * rz * Math.sin(a));
  }

  // Table
  const TR = angA.map((a) =>
    v(tableR * Math.cos(a), yTbl, tableR * Math.sin(a))
  );
  T.push(...fan(TR));

  const yStarH = yUG + (yTbl - yUG) * 0.38;
  const ST = angB.map((a) => op(a, 0.68, yStarH));
  const UGA = angA.map((a) => op(a, 1.0, yUG));
  const UGB = angB.map((a) => op(a, 1.0, yUG));
  const KMA = angA.map((a, i) => {
    const st = ST[i === 0 ? N - 1 : i - 1],
      ug = UGA[i];
    return v((st.x + ug.x) / 2, (st.y + ug.y) / 2 + 0.008, (st.z + ug.z) / 2);
  });

  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const tI = TR[i],
      tJ = TR[j],
      stI = ST[i];
    const ugAi = UGA[i],
      ugAj = UGA[j],
      ugBi = UGB[i],
      ugBj = UGB[j];
    const kmI = KMA[i],
      kmJ = KMA[j];
    T.push([tI, tJ, stI]);
    T.push([tI, stI, kmI], [tI, kmI, ugAi]);
    T.push([tJ, kmJ, stI], [tJ, ugAj, kmJ]);
    T.push([stI, ugAi, ugBi], [stI, ugBj, ugAj]);
    const m1 = v((ugAi.x + ugBi.x) / 2, yUG + 0.006, (ugAi.z + ugBi.z) / 2);
    T.push([stI, ugBi, m1], [stI, m1, ugAi]);
    const m2 = v((ugAj.x + ugBj.x) / 2, yUG + 0.006, (ugAj.z + ugBj.z) / 2);
    T.push([stI, ugAj, m2], [stI, m2, ugBj]);
  }

  const LGA = angA.map((a) => op(a, 1.0, yLG));
  const LGB = angB.map((a) => op(a, 1.0, yLG));
  T.push(...strip(UGA, LGA), ...strip(UGB, LGB));
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push([UGB[i], UGA[j], UGB[j]], [UGB[i], UGA[i], UGA[j]]);
    T.push([LGB[i], LGB[j], LGA[j]], [LGB[i], LGA[j], LGA[i]]);
  }

  // Cushion: 2-stage pavilion for "pillow" pattern
  const CU = v(0, yC, 0);
  const yPB1 = yLG - pavilionH * 0.38,
    yPB2 = yLG - pavilionH * 0.72;
  const PB1A = LGA.map((p) => v(p.x * 0.58, yPB1, p.z * 0.58));
  const PB1B = LGB.map((p) => v(p.x * 0.58, yPB1, p.z * 0.58));
  const PB2A = LGA.map((p) => v(p.x * 0.27, yPB2, p.z * 0.27));
  const PB2B = LGB.map((p) => v(p.x * 0.27, yPB2, p.z * 0.27));

  T.push(...strip(LGA, PB1A), ...strip(LGB, PB1B));
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push([LGA[j], PB1A[j], PB1B[j]], [LGA[j], PB1B[i], PB1A[i]]);
    T.push([PB1A[i], PB1B[i], PB1A[j]], [PB1B[i], PB1B[j], PB1A[j]]);
  }
  T.push(...strip(PB1A, PB2A), ...strip(PB1B, PB2B));
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push([PB1A[j], PB2A[j], PB2B[j]], [PB1A[j], PB2B[i], PB2A[i]]);
    T.push([PB2A[i], PB2B[i], PB2A[j]], [PB2B[i], PB2B[j], PB2A[j]]);
  }
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push(
      [PB2A[i], CU, PB2A[j]],
      [PB2B[i], PB2B[j], CU],
      [PB2A[j], PB2B[j], CU]
    );
  }

  return buildGeometry(T);
}

// ── Princess builder ──────────────────────────────────────────────────────────
/**
 * Crown-heavy princess: octagonal crown rings with extra diagonal splits
 * so the top view shows the characteristic corner-flash sparkle pattern.
 * Pavilion uses chevron kite rows.
 */
function buildPrincess({
  tableHalf = 0.73,
  crownH = 0.16,
  girdleH = 0.03,
  pavilionH = 1.04,
  crownRows = 3,
  pavRows = 4,
} = {}) {
  const T = [];
  const yTbl = crownH + girdleH / 2;
  const yUG = girdleH / 2;
  const yLG = -girdleH / 2;
  const yC = -(pavilionH + girdleH / 2);

  // Octagonal ring (square with clipped corners)
  function octRing(half, y, clip = 0.22) {
    const c = half * clip,
      h = half;
    return [
      v(h, y, h - c),
      v(h - c, y, h),
      v(-(h - c), y, h),
      v(-h, y, h - c),
      v(-h, y, -(h - c)),
      v(-(h - c), y, -h),
      v(h - c, y, -h),
      v(h, y, -(h - c)),
    ];
  }

  // Table (octagonal, 6 tris)
  const TR = octRing(tableHalf, yTbl, 0.22);
  T.push(...fan(TR));

  // Crown: step rings with extra diagonal splits per quad for more facets
  let prev = TR;
  for (let row = 0; row < crownRows; row++) {
    const t = (row + 1) / crownRows;
    const r = tableHalf + (1.0 - tableHalf) * t;
    const y = yTbl - crownH * t;
    const clip = 0.22 - t * 0.04; // corners get slightly less clipped = more square
    const next = octRing(r, y, clip);
    const M = prev.length;
    // Split each quad with an extra midpoint ridge for crown sparkle
    for (let i = 0; i < M; i++) {
      const j = (i + 1) % M;
      const mid = v(
        (prev[i].x + prev[j].x + next[i].x + next[j].x) / 4,
        (prev[i].y + next[i].y) / 2 + 0.005,
        (prev[i].z + prev[j].z + next[i].z + next[j].z) / 4
      );
      T.push([prev[i], prev[j], mid]);
      T.push([prev[j], next[j], mid]);
      T.push([next[j], next[i], mid]);
      T.push([next[i], prev[i], mid]);
    }
    prev = next;
  }

  // Connect last crown step → upper girdle
  const UG = octRing(1.0, yUG, 0.18);
  T.push(...strip(prev, UG));
  const LG = octRing(1.0, yLG, 0.18);
  T.push(...strip(UG, LG));

  // Pavilion: chevron kite rows
  const pavRings = [LG];
  for (let row = 1; row <= pavRows; row++) {
    const t = row / pavRows;
    pavRings.push(
      octRing(1.0 - t * 0.88, yLG - pavilionH * t, 0.18 + t * 0.08)
    );
  }
  for (let row = 0; row < pavRows; row++) {
    const top = pavRings[row],
      bot = pavRings[row + 1],
      M = top.length;
    for (let i = 0; i < M; i++) {
      const j = (i + 1) % M;
      // Alternate diagonal for chevron "V" flash pattern
      if (i % 2 === 0) {
        T.push([top[i], bot[i], top[j]], [bot[i], bot[j], top[j]]);
      } else {
        T.push([top[i], bot[i], bot[j]], [top[i], bot[j], top[j]]);
      }
    }
  }

  // Final → culet
  const last = pavRings[pavRows],
    CU = v(0, yC, 0);
  for (let i = 0; i < last.length; i++) {
    T.push([last[i], CU, last[(i + 1) % last.length]]);
  }

  return buildGeometry(T);
}

// ── Stone definitions ─────────────────────────────────────────────────────────

const stones = {
  stone_round: buildBrilliant({
    shape: circle(),
    tableR: 0.53,
    crownH: 0.288,
    girdleH: 0.034,
    pavilionH: 0.862,
  }),
  stone_oval: buildBrilliant({
    shape: oval(1.35, 0.85),
    tableR: 0.53,
    crownH: 0.3,
    girdleH: 0.04,
    pavilionH: 0.86,
  }),
  stone_cushion: buildCushion(),
  stone_marquise: buildBrilliant({
    shape: marquise(1.9, 1.0),
    tableR: 0.46,
    crownH: 0.27,
    girdleH: 0.04,
    pavilionH: 0.85,
  }),
  stone_pear: buildBrilliant({
    shape: pear(1.0, 0.75),
    tableR: 0.5,
    crownH: 0.28,
    girdleH: 0.04,
    pavilionH: 0.86,
  }),
  stone_princess: buildPrincess({
    tableHalf: 0.73,
    crownH: 0.16,
    girdleH: 0.03,
    pavilionH: 1.04,
    crownRows: 3,
    pavRows: 4,
  }),
};

// ── GLB writer ────────────────────────────────────────────────────────────────

function pad4(n) {
  return Math.ceil(n / 4) * 4;
}

function writeGLB(meshMap, outPath) {
  const binParts = [],
    accessors = [],
    bufViews = [],
    meshDefs = [],
    nodeDefs = [];
  let offset = 0;

  function pushBV(data, target) {
    const len = data.byteLength;
    binParts.push(Buffer.from(data.buffer, data.byteOffset, len));
    bufViews.push({ buffer: 0, byteOffset: offset, byteLength: len, target });
    offset += len;
  }

  for (const [name, geo] of Object.entries(meshMap)) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox,
      pos = geo.attributes.position,
      idx = geo.index;

    pushBV(new Float32Array(pos.array), 34962);
    const pi = accessors.length;
    accessors.push({
      bufferView: bufViews.length - 1,
      componentType: 5126,
      count: pos.count,
      type: "VEC3",
      min: [bb.min.x, bb.min.y, bb.min.z],
      max: [bb.max.x, bb.max.y, bb.max.z],
    });

    pushBV(new Uint32Array(idx.array), 34963);
    const ii = accessors.length;
    accessors.push({
      bufferView: bufViews.length - 1,
      componentType: 5125,
      count: idx.count,
      type: "SCALAR",
    });

    meshDefs.push({
      name,
      primitives: [{ attributes: { POSITION: pi }, indices: ii, mode: 4 }],
    });
    nodeDefs.push({ name, mesh: meshDefs.length - 1 });

    console.log(
      `  ✓ ${name.padEnd(18)} ${(idx.count / 3)
        .toString()
        .padStart(4)} tris  ${pos.count.toString().padStart(4)} verts`
    );
  }

  const padBin = pad4(offset);
  const binBuf = Buffer.concat([...binParts, Buffer.alloc(padBin - offset)]);

  const json = {
    asset: { version: "2.0", generator: "generate-stones.js" },
    scene: 0,
    scenes: [{ nodes: nodeDefs.map((_, i) => i) }],
    nodes: nodeDefs,
    meshes: meshDefs,
    accessors,
    bufferViews: bufViews,
    buffers: [{ byteLength: padBin }],
  };
  const jb = Buffer.from(JSON.stringify(json), "utf8");
  const padJ = pad4(jb.length);
  const jBuf = Buffer.concat([jb, Buffer.alloc(padJ - jb.length, 0x20)]);

  const total = 12 + 8 + padJ + 8 + padBin;
  const hdr = Buffer.alloc(12);
  hdr.writeUInt32LE(0x46546c67, 0);
  hdr.writeUInt32LE(2, 4);
  hdr.writeUInt32LE(total, 8);
  const jch = Buffer.alloc(8);
  jch.writeUInt32LE(padJ, 0);
  jch.writeUInt32LE(0x4e4f534a, 4);
  const bch = Buffer.alloc(8);
  bch.writeUInt32LE(padBin, 0);
  bch.writeUInt32LE(0x004e4942, 4);

  const glb = Buffer.concat([hdr, jch, jBuf, bch, binBuf]);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, glb);
  console.log(`\n✅  ${outPath}  (${(glb.length / 1024).toFixed(1)} KB)`);
}

writeGLB(stones, OUT);
