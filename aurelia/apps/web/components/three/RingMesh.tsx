"use client";

import { useRef, useEffect, useState, useLayoutEffect, useMemo, MutableRefObject } from "react";
import { useGLTF } from "@react-three/drei";
import { useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { METAL_CONFIGS } from "@/lib/materials";

useGLTF.preload("/models/ring-parts.glb");
useGLTF.preload("/models/stones.glb?v=2");
useGLTF.preload("/models/cushion-crown.glb?v=5");
useGLTF.preload("/models/princess-crown.glb?v=1");
useGLTF.preload("/models/round-stone.glb?v=1");
useGLTF.preload("/models/marquise-crown.glb?v=2");
useGLTF.preload("/models/pear-crown.glb?v=1");

// ─────────────────────────────────────────────────────────────────────────────
// Diamond material — flatShading gives each facet its own normal, producing the
// fire-and-brilliance pattern of a real cut stone.
//
// Two shader enhancements injected via onBeforeCompile (r160-compatible):
//
//   1. DISPERSION — samples getIBLVolumeRefraction 3× with wavelength-shifted IOR
//      (ior_red < ior_center < ior_blue, spread = diamond Abbe ≈ 0.044).
//      Recombines .r / .g / .b channels independently → chromatic prismatic fire.
//      Only active under USE_TRANSMISSION (#ifdef guard).
//
//   2. MICRO-DENTS — after normal_fragment_maps, each flat facet gets a unique
//      normal tilt derived from a hash of its face normal direction.
//      With flatShading=true every fragment in a triangle shares the same computed
//      normal, so floor(normal*15) is constant per face → one distinct tilt per
//      facet. No UV coordinates needed.
// ─────────────────────────────────────────────────────────────────────────────

// Inline GLSL — replaces #include <transmission_fragment>
// Single getIBLVolumeRefraction call (was 3 — 3× cheaper).
// Chromatic fire still comes from iridescence:0.85 on the material; no visual
// regression worth the 2/3 saving on transmission buffer texture reads.
const DISPERSION_TRANSMISSION_GLSL = /* glsl */ `
#ifdef USE_TRANSMISSION

  material.transmission = transmission;
  material.transmissionAlpha = 1.0;
  material.thickness = thickness;
  material.attenuationDistance = attenuationDistance;
  material.attenuationColor = attenuationColor;

  #ifdef USE_TRANSMISSIONMAP
    material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
  #endif
  #ifdef USE_THICKNESSMAP
    material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
  #endif

  vec3 _pos = vWorldPosition;
  vec3 _v   = normalize( cameraPosition - _pos );
  vec3 _n   = inverseTransformDirection( normal, viewMatrix );

  vec4 transmitted = getIBLVolumeRefraction(
    _n, _v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
    _pos, modelMatrix, viewMatrix, projectionMatrix, material.ior,
    material.thickness, material.attenuationColor, material.attenuationDistance );

  // ── TIR (Total Internal Reflection) simulation ────────────────────────────
  // Real diamond critical angle ≈ 24°: light hitting a facet from inside at
  // steeper than ~24° from the normal gets totally internally reflected.
  // From outside, this reads as: steep viewing angles → stone goes opaque.
  // We map this onto the exterior view angle via smoothstep:
  //   cosV = 1  (looking straight at a face) → full transmission
  //   cosV < 0.4 (steep / grazing)           → transmission drops to zero
  float _cosV    = max( dot( _n, _v ), 0.0 );
  // Narrow transmission window: only nearly-face-on facets (cosV > 0.78) transmit.
  // Side/grazing facets are fully opaque — hides the prong basket that sits behind
  // the stone in the transmission background capture.
  float _tirFade = smoothstep( 0.68, 0.92, _cosV );   // 0 at grazing, 1 face-on
  float _effTrans = material.transmission * _tirFade;

  material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, _effTrans );
  totalDiffuse = mix( totalDiffuse, transmitted.rgb, _effTrans );

#endif
`;

// ── Analytic-gradient FBM bump dents ─────────────────────────────────────────
//
// Previous approach: central differences → 6 FBM evaluations per layer × 2 layers
// × 4 octaves = 48 noise samples per fragment. Very heavy.
//
// New approach (Inigo Quilez technique): evaluate the gradient analytically inside
// a single FBM call. One evaluation returns both the noise VALUE and its GRADIENT
// vector simultaneously — 8× fewer samples for equal or better quality.
//
// _hsh   — fast integer-hash (no sin, no texture)
// _vng   — value noise with quintic C² smoothstep + analytic gradient (vec4 out)
// _fbmG  — 3-octave FBM accumulating both value and gradient in one pass
//
// Two layers (coarse + fine) still give multi-scale detail but cost only
// 2 × (3 octaves × 8 hash calls) = 48 hash calls vs the old 384. ~8× faster.
const DENTS_PREAMBLE_GLSL = /* glsl */ `
varying vec3  vObjectPos;
uniform vec3  uStretchAxis;
uniform float uStretch;
uniform float uGrid;
uniform float uCoarseFreq;
uniform float uFineFreq;
uniform float uDentStrength;
uniform float uTime;

// Compress the stretch-axis component so FBM features elongate along that axis.
vec3 _warpAniso( vec3 p ) {
  float proj = dot( p, uStretchAxis );
  vec3  perp = p - proj * uStretchAxis;
  return perp + uStretchAxis * ( proj / max( uStretch, 0.001 ) );
}

float _hsh( vec3 p ) {
  p  = fract( p * vec3( 443.897, 441.423, 437.195 ) );
  p += dot( p, p.zxy + 19.19 );
  return fract( ( p.x + p.y ) * p.z );
}

vec4 _vng( vec3 p ) {
  vec3 i  = floor( p );
  vec3 f  = fract( p );
  vec3 u  = f*f*f*( f*( f*6.0 - 15.0 ) + 10.0 );
  vec3 du = f*f*(   f*( f*30.0 - 60.0 ) + 30.0 );

  float va = _hsh(i);
  float vb = _hsh(i+vec3(1,0,0));  float vc = _hsh(i+vec3(0,1,0));
  float vd = _hsh(i+vec3(1,1,0));  float ve = _hsh(i+vec3(0,0,1));
  float vf = _hsh(i+vec3(1,0,1));  float vg = _hsh(i+vec3(0,1,1));
  float vh = _hsh(i+vec3(1,1,1));

  float k0=va, k1=vb-va, k2=vc-va, k3=ve-va;
  float k4=va-vb-vc+vd, k5=va-vc-ve+vg, k6=va-vb-ve+vf;
  float k7=-va+vb+vc-vd+ve-vf-vg+vh;

  return vec4(
    k0 + k1*u.x + k2*u.y + k3*u.z
       + k4*u.x*u.y + k5*u.y*u.z + k6*u.z*u.x + k7*u.x*u.y*u.z,
    du * vec3(
      k1 + k4*u.y + k6*u.z + k7*u.y*u.z,
      k2 + k4*u.x + k5*u.z + k7*u.z*u.x,
      k3 + k5*u.y + k6*u.x + k7*u.x*u.y
    )
  );
}

vec4 _fbmG( vec3 p ) {
  vec4  r = vec4(0.0);
  float a = 0.50;
  float s = 1.00;
  for ( int i = 0; i < 3; i++ ) {
    vec4 n = _vng( p );
    r    += vec4( a * n.x, a * s * n.yzw );
    p    *= 2.02;
    s    *= 2.02;
    a    *= 0.50;
  }
  return r;
}

// 3D Voronoi — XZ-plane neighbor search only (9 iterations instead of 27).
// Each cell still has a fully 3D random site so gradients have Y variation.
// 3× cheaper than full 3D search; visually identical for face-up stone views.
vec4 _voroG( vec3 p ) {
  vec3  ip = floor( p );
  vec3  fp = fract( p );
  float F1 = 8.0;
  vec3  g1 = vec3( 1.0, 0.0, 0.0 );
  for ( int j = -1; j <= 1; j++ )
  for ( int i = -1; i <= 1; i++ ) {
    vec3  n  = vec3( float(i), 0.0, float(j) );
    vec3  rp = vec3(
      _hsh( ip + n ),
      _hsh( ip + n + vec3( 17.0, 31.0,  7.0 ) ),
      _hsh( ip + n + vec3( 53.0, 11.0, 43.0 ) )
    );
    vec3  d   = n + rp - fp;
    float dst = dot( d, d );
    if ( dst < F1 ) { F1 = dst; g1 = d; }
  }
  return vec4( sqrt( F1 ), g1 );
}
`;

const MICRO_DENTS_GLSL = /* glsl */ `
{
  vec3 _wp    = _warpAniso( vObjectPos );
  // Voronoi coarse layer — hard-edged polygonal cells, each a distinct flat facet.
  // Fine + ultra-fine FBM drift over time for sparkle within each cell.
  vec3 _drift = vec3( sin(uTime*0.11), cos(uTime*0.07), sin(uTime*0.13+1.57) ) * 0.07;
  vec3 _voroN = normalize( _voroG( _wp * uCoarseFreq ).yzw );
  vec3 _bumpB = _fbmG( _wp * uFineFreq + _drift            ).yzw;
  vec3 _bumpC = _fbmG( _wp * uFineFreq * 3.5 + _drift*2.2 ).yzw;

  // Princess-cut grid: derivative of cos(x*f)*cos(z*f) — axis-aligned cross-hatch.
  float _gf    = 28.0;
  vec3  _gridB = vec3(
    -sin( vObjectPos.x * _gf ) * cos( vObjectPos.z * _gf ),
     0.0,
    -cos( vObjectPos.x * _gf ) * sin( vObjectPos.z * _gf )
  );

  normal = normalize( normal
    + _voroN               * 0.55 * uDentStrength
    + normalize( _bumpB )  * 0.22 * uDentStrength
    + _bumpC               * 0.12 * uDentStrength
    + normalize( _gridB )  * uGrid );
}
`;

// Per-stone FBM pattern params — uniforms give each shape a distinctive dent
// without extra shader compilations (one cacheKey, different uniform values).
const STONE_PATTERNS: Record<
  string,
  {
    axis: [number, number, number];
    stretch: number;
    grid: number;
    coarseFreq: number;
    fineFreq: number;
    dentStrength: number;
  }
> = {
  round: {
    axis: [1, 0, 0],
    stretch: 1.0,
    grid: 0.0,
    coarseFreq: 8.0,
    fineFreq: 32.0,
    dentStrength: 2.0,
  },
  oval: {
    axis: [1, 0, 0],
    stretch: 2.5,
    grid: 0.0,
    coarseFreq: 7.0,
    fineFreq: 28.0,
    dentStrength: 2.0,
  },
  princess: {
    axis: [1, 0, 0],
    stretch: 1.0,
    grid: 0.28,
    coarseFreq: 10.0,
    fineFreq: 38.0,
    dentStrength: 2.0,
  },
  cushion: {
    axis: [1, 0, 0],
    stretch: 1.0,
    grid: 0.0,
    coarseFreq: 11.0,
    fineFreq: 38.0,
    dentStrength: 2.4,
  },
  marquise: {
    axis: [1, 0, 0],
    stretch: 3.2,
    grid: 0.0,
    coarseFreq: 11.0,
    fineFreq: 38.0,
    dentStrength: 2.4,
  },
  pear: {
    axis: [1, 0, 0],
    stretch: 2.0,
    grid: 0.0,
    coarseFreq: 7.0,
    fineFreq: 28.0,
    dentStrength: 2.0,
  },
};

function makeDiamondMat(
  envIntensity = 5.5,
  transmission = 0,
  stoneKey = "round",
  onShaderReady?: (uniforms: Record<string, { value: any }>) => void
): THREE.MeshPhysicalMaterial {
  const hasTransmission = transmission > 0;
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    transmission: hasTransmission ? transmission : 0,
    thickness: hasTransmission ? 2.8 : 0,
    ior: 2.42,
    attenuationDistance: hasTransmission ? 2.8 : 0,
    attenuationColor: new THREE.Color("#fdfaf5"),
    roughness: 0.0,
    metalness: 0.0,
    envMapIntensity: envIntensity * (hasTransmission ? 1.25 : 1.4),
    transparent: hasTransmission,
    depthWrite: !hasTransmission,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    reflectivity: 1.0,
    specularIntensity: 1.0,
    iridescence: hasTransmission ? 0.75 : 0.65,
    iridescenceIOR: 2.35,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    const pat = STONE_PATTERNS[stoneKey] ?? STONE_PATTERNS.round;
    shader.uniforms.uStretchAxis = {
      value: new THREE.Vector3(pat.axis[0], pat.axis[1], pat.axis[2]),
    };
    shader.uniforms.uStretch = { value: pat.stretch };
    shader.uniforms.uGrid = { value: pat.grid };
    shader.uniforms.uCoarseFreq = { value: pat.coarseFreq };
    shader.uniforms.uFineFreq = { value: pat.fineFreq };
    shader.uniforms.uDentStrength = { value: pat.dentStrength ?? 1.0 };
    shader.uniforms.uTime = { value: 0 };
    onShaderReady?.(shader.uniforms);

    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      `varying vec3 vObjectPos;\nvoid main() {`
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\nvObjectPos = position;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      `${DENTS_PREAMBLE_GLSL}\nvoid main() {`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <transmission_fragment>",
      DISPERSION_TRANSMISSION_GLSL
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>\n${MICRO_DENTS_GLSL}`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <output_fragment>",
      `// Warm fire for depth/grazing facets — face-on facets are pure specular white
vec3 _vd  = normalize( -vViewPosition );
float _fd = pow( 1.0 - max( dot( normal, _vd ), 0.0 ), 2.5 );
outgoingLight += vec3( 1.0, 0.72, 0.30 ) * _fd * 0.35;

// Rainbow dispersion — purely depth-dependent, NO flat additive.
vec3  _rvn  = normalize( _voroG( _warpAniso( vObjectPos ) * uCoarseFreq ).yzw );
float _rhue = atan( _rvn.z, _rvn.x ) * 0.15915 + 0.5;
vec3  _disp = 0.5 + 0.5 * cos( 6.28318 * ( _rhue + vec3( 0.0, 0.333, 0.667 ) ) );
outgoingLight += _disp * _fd * 0.70;

#include <output_fragment>`
    );
  };
  // All diamond materials share one compiled program — stable cache key
  mat.customProgramCacheKey = () => "diamond-v3";

  return mat;
}

const STONE_MESH_NAME: Record<string, string> = {
  round: "stone_round",
  oval: "stone_oval",
  princess: "stone_princess",
  cushion: "stone_cushion",
  marquise: "stone_marquise",
  pear: "stone_pear",
};

// ── Midpoint subdivision ─────────────────────────────────────────────────────
// Splits every triangle into 4 by placing a vertex at each edge midpoint.
// Applied once to procedural stones (~150→600 tris) — more facets, more sparkle.
// Skipped for Tripo GLBs which already carry dense geometry.
function subdivide(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = geo.getIndex();
  if (!idx) return geo;
  const src = geo.getAttribute("position") as THREE.BufferAttribute;

  const newPos: number[] = [];
  const newIdx: number[] = [];
  const edgeMap = new Map<string, number>();

  for (let i = 0; i < src.count; i++)
    newPos.push(src.getX(i), src.getY(i), src.getZ(i));

  function mid(a: number, b: number): number {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const cached = edgeMap.get(key);
    if (cached !== undefined) return cached;
    const id = newPos.length / 3;
    newPos.push(
      (src.getX(a) + src.getX(b)) * 0.5,
      (src.getY(a) + src.getY(b)) * 0.5,
      (src.getZ(a) + src.getZ(b)) * 0.5
    );
    edgeMap.set(key, id);
    return id;
  }

  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i),
      b = idx.getX(i + 1),
      c = idx.getX(i + 2);
    const ab = mid(a, b),
      bc = mid(b, c),
      ca = mid(c, a);
    newIdx.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(newPos, 3));
  out.setIndex(newIdx);
  return out;
}

// Module-level geometry cache — scene traversal is O(n) on every stone change.
// Caching makes repeated lookups O(1) after the first call per shape.
const stoneGeoCache = new Map<string, THREE.BufferGeometry>();

// Cache for already-subdivided procedural geometries — subdivision is CPU-heavy
// (2 passes × Map lookups + array allocation). Without this, every stone switch
// re-runs both passes. With this, each shape pays the cost exactly once.
const subdivGeoCache = new Map<string, THREE.BufferGeometry>();

// Per-sector max-radius girdle detection: finds the true equator of the crown
// (the widest ring) rather than relying on a fixed Y-threshold. Only looks at
// the lower 40% of crown height to avoid confusing table facets for the girdle.
// Returns sectors sorted by angle with actual X/Y/Z positions preserved.
function extractGirdle(
  nPos: Float32Array,
  count: number,
  crownMaxY: number
): Array<{ x: number; y: number; z: number; r: number; a: number }> {
  const midY = crownMaxY * 0.4;
  const N_SECTORS = 64;
  type Best = { x: number; y: number; z: number; r: number; a: number };
  const sectors: (Best | null)[] = new Array(N_SECTORS).fill(null);
  for (let i = 0; i < count; i++) {
    const x = nPos[i * 3],
      y = nPos[i * 3 + 1],
      z = nPos[i * 3 + 2];
    if (y > midY) continue;
    const r = Math.sqrt(x * x + z * z);
    let a = Math.atan2(z, x);
    if (a < 0) a += Math.PI * 2;
    const s = Math.floor((a / (Math.PI * 2)) * N_SECTORS) % N_SECTORS;
    if (!sectors[s] || r > sectors[s]!.r) {
      sectors[s] = { x, y, z, r, a: (s / N_SECTORS) * Math.PI * 2 };
    }
  }
  const result = sectors.filter(Boolean) as Best[];
  result.sort((a, b) => a.a - b.a);
  return result;
}

// Resamples girdle sectors to N evenly-spaced points, interpolating actual
// X/Y/Z so the pavilion top ring exactly matches the crown's widest contour.
function resampleGirdle(
  raw: Array<{ x: number; y: number; z: number; r: number; a: number }>,
  N: number
): THREE.Vector3[] {
  const M = raw.length;
  return Array.from({ length: N }, (_, i) => {
    const tgt = (i / N) * Math.PI * 2;
    if (!M) return new THREE.Vector3(Math.cos(tgt), 0, Math.sin(tgt));
    let lo = 0;
    for (let j = 0; j < M; j++) {
      if (raw[j].a <= tgt) lo = j;
    }
    const hi = (lo + 1) % M;
    const aLo = raw[lo].a,
      aHi = hi === 0 ? raw[0].a + Math.PI * 2 : raw[hi].a;
    const t = aHi > aLo + 1e-6 ? Math.min(1, (tgt - aLo) / (aHi - aLo)) : 0;
    return new THREE.Vector3(
      raw[lo].x + (raw[hi].x - raw[lo].x) * t,
      raw[lo].y + (raw[hi].y - raw[lo].y) * t,
      raw[lo].z + (raw[hi].z - raw[lo].z) * t
    );
  });
}

// ── Round: full Tripo GLB (crown + pavilion already present) ─────────────────
// Normalises to unit XZ radius and re-centres Y so the girdle (widest ring) sits
// at Y=0 — same reference frame as the hybrid stones. No pavilion building needed.
function buildRoundStoneGeo(roundScene: THREE.Group): THREE.BufferGeometry {
  let crownMesh: THREE.Mesh | null = null;
  roundScene.traverse((node) => {
    if (!crownMesh && (node as THREE.Mesh).isMesh)
      crownMesh = node as THREE.Mesh;
  });
  if (!crownMesh) return new THREE.BufferGeometry();

  const srcGeo = (crownMesh as THREE.Mesh).geometry;
  const pos = srcGeo.getAttribute("position") as THREE.BufferAttribute;

  let maxX = -Infinity,
    minX = Infinity,
    maxZ = -Infinity,
    minZ = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
    if (z > maxZ) maxZ = z;
    if (z < minZ) minZ = z;
  }
  const sc = 1.0 / (Math.max(maxX - minX, maxZ - minZ) / 2);

  const nPos = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    nPos[i * 3] = pos.getX(i) * sc;
    nPos[i * 3 + 1] = pos.getY(i) * sc;
    nPos[i * 3 + 2] = pos.getZ(i) * sc;
  }

  // Find the girdle (global max-radius vertex) and shift Y so it sits at Y=0
  let maxR = 0,
    girdleY = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = nPos[i * 3],
      y = nPos[i * 3 + 1],
      z = nPos[i * 3 + 2];
    const r = Math.sqrt(x * x + z * z);
    if (r > maxR) {
      maxR = r;
      girdleY = y;
    }
  }
  for (let i = 0; i < pos.count; i++) nPos[i * 3 + 1] -= girdleY;

  const srcIdx = srcGeo.getIndex()!;
  const nIdx = new Uint32Array(srcIdx.count);
  for (let i = 0; i < srcIdx.count; i++) nIdx[i] = srcIdx.getX(i);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(nPos, 3));
  geo.setIndex(new THREE.BufferAttribute(nIdx, 1));
  return geo;
}

// ── Cushion hybrid: GLB crown (13K tris) + faceted pavilion ─────────────────
// Uses max-radius girdle detection so the pavilion top ring connects exactly at
// the crown's widest point — no gap, no step at the seam.
function buildCushionHybridGeo(
  cushionScene: THREE.Group
): THREE.BufferGeometry {
  let crownMesh: THREE.Mesh | null = null;
  cushionScene.traverse((node) => {
    if (!crownMesh && (node as THREE.Mesh).isMesh)
      crownMesh = node as THREE.Mesh;
  });
  if (!crownMesh) return new THREE.BufferGeometry();

  const srcGeo = (crownMesh as THREE.Mesh).geometry;
  const pos = srcGeo.getAttribute("position") as THREE.BufferAttribute;

  // Normalize: bottom-most vertex → Y=0, max XZ radius → 1.0
  let minY = Infinity,
    maxX = -Infinity,
    minX = Infinity,
    maxZ = -Infinity,
    minZ = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
    if (z > maxZ) maxZ = z;
    if (z < minZ) minZ = z;
  }
  const sc = 1.0 / (Math.max(maxX - minX, maxZ - minZ) / 2);
  const yShift = -minY * sc;

  const nPos = new Float32Array(pos.count * 3);
  let crownMaxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    nPos[i * 3] = pos.getX(i) * sc;
    nPos[i * 3 + 1] = pos.getY(i) * sc + yShift;
    nPos[i * 3 + 2] = pos.getZ(i) * sc;
    if (nPos[i * 3 + 1] > crownMaxY) crownMaxY = nPos[i * 3 + 1];
  }
  const srcIdx = srcGeo.getIndex()!;
  const nIdx = new Uint32Array(srcIdx.count);
  for (let i = 0; i < srcIdx.count; i++) nIdx[i] = srcIdx.getX(i);

  // Find the true girdle (max-radius per sector) and resample to 16 points
  const girdleRaw = extractGirdle(nPos, pos.count, crownMaxY);
  const N = 16;
  const girdle = resampleGirdle(girdleRaw, N);

  // Pavilion drops from actual girdle Y (not forced 0) so it meets the crown flush
  const girdleY = girdle.reduce((s, p) => s + p.y, 0) / N;
  const pavH = 1.2;
  const yBreak = girdleY - pavH * 0.52;
  const yC = girdleY - pavH;
  const breakR = girdle.map(
    (p) => new THREE.Vector3(p.x * 0.42, yBreak, p.z * 0.42)
  );
  const culet = new THREE.Vector3(0, yC, 0);

  type Tri = [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  const T: Tri[] = [];

  // Girdle → break: N quads = 2N kite triangles
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push(
      [girdle[i], breakR[i], breakR[j]],
      [girdle[i], breakR[j], girdle[j]]
    );
  }
  // Break → culet: N triangles
  for (let i = 0; i < N; i++) {
    T.push([breakR[i], culet, breakR[(i + 1) % N]]);
  }

  // Index pavilion triangles
  const pavPos: number[] = [],
    pavIdx: number[] = [];
  const eps = 1e-5;
  const vm = new Map<string, number>();
  function addV(p: THREE.Vector3): number {
    const k = `${Math.round(p.x / eps)},${Math.round(p.y / eps)},${Math.round(
      p.z / eps
    )}`;
    const hit = vm.get(k);
    if (hit !== undefined) return hit;
    const id = pavPos.length / 3;
    pavPos.push(p.x, p.y, p.z);
    vm.set(k, id);
    return id;
  }
  for (const [a, b, c] of T) pavIdx.push(addV(a), addV(b), addV(c));

  // Merge crown + pavilion
  const combPos = new Float32Array(nPos.length + pavPos.length);
  combPos.set(nPos);
  combPos.set(pavPos, nPos.length);
  const combIdx = new Uint32Array(nIdx.length + pavIdx.length);
  combIdx.set(nIdx);
  for (let i = 0; i < pavIdx.length; i++)
    combIdx[nIdx.length + i] = pavIdx[i] + pos.count;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(combPos, 3));
  geo.setIndex(new THREE.BufferAttribute(combIdx, 1));
  return geo;
}

// ── Princess hybrid: GLB crown (tail-clipped, ~12K tris) + square pavilion ──
// Same max-radius girdle detection as cushion. Square girdle naturally produces
// a pavilion whose 16 kite facets follow the square outline of the princess cut.
function buildPrincessHybridGeo(
  princessScene: THREE.Group
): THREE.BufferGeometry {
  let crownMesh: THREE.Mesh | null = null;
  princessScene.traverse((node) => {
    if (!crownMesh && (node as THREE.Mesh).isMesh)
      crownMesh = node as THREE.Mesh;
  });
  if (!crownMesh) return new THREE.BufferGeometry();

  const srcGeo = (crownMesh as THREE.Mesh).geometry;
  const pos = srcGeo.getAttribute("position") as THREE.BufferAttribute;

  // Normalize: bottom-most vertex → Y=0, max XZ radius → 1.0
  let minY = Infinity,
    maxX = -Infinity,
    minX = Infinity,
    maxZ = -Infinity,
    minZ = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
    if (z > maxZ) maxZ = z;
    if (z < minZ) minZ = z;
  }
  const sc = 1.0 / (Math.max(maxX - minX, maxZ - minZ) / 2);
  const yShift = -minY * sc;

  const nPos = new Float32Array(pos.count * 3);
  let crownMaxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    nPos[i * 3] = pos.getX(i) * sc;
    nPos[i * 3 + 1] = pos.getY(i) * sc + yShift;
    nPos[i * 3 + 2] = pos.getZ(i) * sc;
    if (nPos[i * 3 + 1] > crownMaxY) crownMaxY = nPos[i * 3 + 1];
  }
  const srcIdx = srcGeo.getIndex()!;
  const nIdx = new Uint32Array(srcIdx.count);
  for (let i = 0; i < srcIdx.count; i++) nIdx[i] = srcIdx.getX(i);

  // Find true girdle ring and resample to 16 points
  const girdleRaw = extractGirdle(nPos, pos.count, crownMaxY);
  const N = 16;
  const girdle = resampleGirdle(girdleRaw, N);

  // Princess pavilion: shallower depth, tighter break ring for square silhouette
  const girdleY = girdle.reduce((s, p) => s + p.y, 0) / N;
  const pavH = 1.05;
  const yBreak = girdleY - pavH * 0.5;
  const yC = girdleY - pavH;
  const breakR = girdle.map(
    (p) => new THREE.Vector3(p.x * 0.38, yBreak, p.z * 0.38)
  );
  const culet = new THREE.Vector3(0, yC, 0);

  type Tri = [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  const T: Tri[] = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push(
      [girdle[i], breakR[i], breakR[j]],
      [girdle[i], breakR[j], girdle[j]]
    );
  }
  for (let i = 0; i < N; i++) {
    T.push([breakR[i], culet, breakR[(i + 1) % N]]);
  }

  const pavPos: number[] = [],
    pavIdx: number[] = [];
  const eps = 1e-5;
  const vm = new Map<string, number>();
  function addV(p: THREE.Vector3): number {
    const k = `${Math.round(p.x / eps)},${Math.round(p.y / eps)},${Math.round(
      p.z / eps
    )}`;
    const hit = vm.get(k);
    if (hit !== undefined) return hit;
    const id = pavPos.length / 3;
    pavPos.push(p.x, p.y, p.z);
    vm.set(k, id);
    return id;
  }
  for (const [a, b, c] of T) pavIdx.push(addV(a), addV(b), addV(c));

  const combPos = new Float32Array(nPos.length + pavPos.length);
  combPos.set(nPos);
  combPos.set(pavPos, nPos.length);
  const combIdx = new Uint32Array(nIdx.length + pavIdx.length);
  combIdx.set(nIdx);
  for (let i = 0; i < pavIdx.length; i++)
    combIdx[nIdx.length + i] = pavIdx[i] + pos.count;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(combPos, 3));
  geo.setIndex(new THREE.BufferAttribute(combIdx, 1));
  return geo;
}

// ── Marquise hybrid: GLB crown (X-axis-oriented) + proportionate pavilion ──
// Remap X→Y so Y-up normalisation works, then add a shallow pavilion whose
// break ring and depth are tuned to match the marquise's elongated outline.
function buildMarquiseHybridGeo(
  marquiseScene: THREE.Group
): THREE.BufferGeometry {
  let crownMesh: THREE.Mesh | null = null;
  marquiseScene.traverse((node) => {
    if (!crownMesh && (node as THREE.Mesh).isMesh)
      crownMesh = node as THREE.Mesh;
  });
  if (!crownMesh) return new THREE.BufferGeometry();

  const srcGeo = (crownMesh as THREE.Mesh).geometry;
  const pos = srcGeo.getAttribute("position") as THREE.BufferAttribute;

  // Remap: old X (height) → new Y; old Y (long axis) → new X; old Z unchanged.
  let minY = Infinity,
    maxX = -Infinity,
    minX = Infinity,
    maxZ = -Infinity,
    minZ = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getY(i),
      y = pos.getX(i),
      z = pos.getZ(i);
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
    if (z > maxZ) maxZ = z;
    if (z < minZ) minZ = z;
  }
  const sc = 1.0 / (Math.max(maxX - minX, maxZ - minZ) / 2);
  const yShift = -minY * sc;

  const nPos = new Float32Array(pos.count * 3);
  let crownMaxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    nPos[i * 3] = pos.getY(i) * sc;
    nPos[i * 3 + 1] = pos.getX(i) * sc + yShift;
    nPos[i * 3 + 2] = pos.getZ(i) * sc;
    if (nPos[i * 3 + 1] > crownMaxY) crownMaxY = nPos[i * 3 + 1];
  }
  const srcIdx = srcGeo.getIndex()!;
  const nIdx = new Uint32Array(srcIdx.count);
  for (let i = 0; i < srcIdx.count; i++) nIdx[i] = srcIdx.getX(i);

  // 24 sectors to faithfully trace the pointed marquise tips around the girdle
  const girdleRaw = extractGirdle(nPos, pos.count, crownMaxY);
  const N = 24;
  const girdle = resampleGirdle(girdleRaw, N);

  const girdleY = girdle.reduce((s, p) => s + p.y, 0) / N;
  const pavH = 0.92;
  const yBreak = girdleY - pavH * 0.5;
  const yC = girdleY - pavH;
  const breakR = girdle.map(
    (p) => new THREE.Vector3(p.x * 0.42, yBreak, p.z * 0.42)
  );
  const culet = new THREE.Vector3(0, yC, 0);

  type Tri = [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  const T: Tri[] = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push(
      [girdle[i], breakR[i], breakR[j]],
      [girdle[i], breakR[j], girdle[j]]
    );
  }
  for (let i = 0; i < N; i++) {
    T.push([breakR[i], culet, breakR[(i + 1) % N]]);
  }

  const pavPos: number[] = [],
    pavIdx: number[] = [];
  const eps = 1e-5;
  const vm = new Map<string, number>();
  function addV(p: THREE.Vector3): number {
    const k = `${Math.round(p.x / eps)},${Math.round(p.y / eps)},${Math.round(
      p.z / eps
    )}`;
    const hit = vm.get(k);
    if (hit !== undefined) return hit;
    const id = pavPos.length / 3;
    pavPos.push(p.x, p.y, p.z);
    vm.set(k, id);
    return id;
  }
  for (const [a, b, c] of T) pavIdx.push(addV(a), addV(b), addV(c));

  const combPos = new Float32Array(nPos.length + pavPos.length);
  combPos.set(nPos);
  combPos.set(pavPos, nPos.length);
  const combIdx = new Uint32Array(nIdx.length + pavIdx.length);
  combIdx.set(nIdx);
  for (let i = 0; i < pavIdx.length; i++)
    combIdx[nIdx.length + i] = pavIdx[i] + pos.count;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(combPos, 3));
  geo.setIndex(new THREE.BufferAttribute(combIdx, 1));
  return geo;
}

// ── Pear hybrid: GLB crown (X-axis height, Y-axis long) + teardrop pavilion ──
// Same X→Y axis remap as marquise. 28 sectors faithfully trace the rounded tip
// and the pointed culet end of the pear outline.
function buildPearHybridGeo(pearScene: THREE.Group): THREE.BufferGeometry {
  let crownMesh: THREE.Mesh | null = null;
  pearScene.traverse((node) => {
    if (!crownMesh && (node as THREE.Mesh).isMesh)
      crownMesh = node as THREE.Mesh;
  });
  if (!crownMesh) return new THREE.BufferGeometry();

  const srcGeo = (crownMesh as THREE.Mesh).geometry;
  const pos = srcGeo.getAttribute("position") as THREE.BufferAttribute;

  // Same remap as marquise: old X (height) → new Y; old Y (long) → new X
  let minY = Infinity,
    maxX = -Infinity,
    minX = Infinity,
    maxZ = -Infinity,
    minZ = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getY(i),
      y = pos.getX(i),
      z = pos.getZ(i);
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
    if (z > maxZ) maxZ = z;
    if (z < minZ) minZ = z;
  }
  const sc = 1.0 / (Math.max(maxX - minX, maxZ - minZ) / 2);
  const yShift = -minY * sc;

  const nPos = new Float32Array(pos.count * 3);
  let crownMaxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    nPos[i * 3] = pos.getY(i) * sc;
    nPos[i * 3 + 1] = pos.getX(i) * sc + yShift;
    nPos[i * 3 + 2] = pos.getZ(i) * sc;
    if (nPos[i * 3 + 1] > crownMaxY) crownMaxY = nPos[i * 3 + 1];
  }
  const srcIdx = srcGeo.getIndex()!;
  const nIdx = new Uint32Array(srcIdx.count);
  for (let i = 0; i < srcIdx.count; i++) nIdx[i] = srcIdx.getX(i);

  // 28 sectors to faithfully trace both the round tip and pointed end
  const girdleRaw = extractGirdle(nPos, pos.count, crownMaxY);
  const N = 28;
  const girdle = resampleGirdle(girdleRaw, N);

  const girdleY = girdle.reduce((s, p) => s + p.y, 0) / N;
  const pavH = 0.9;
  const yBreak = girdleY - pavH * 0.5;
  const yC = girdleY - pavH;
  const breakR = girdle.map(
    (p) => new THREE.Vector3(p.x * 0.45, yBreak, p.z * 0.45)
  );
  const culet = new THREE.Vector3(0, yC, 0);

  type Tri = [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  const T: Tri[] = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    T.push(
      [girdle[i], breakR[i], breakR[j]],
      [girdle[i], breakR[j], girdle[j]]
    );
  }
  for (let i = 0; i < N; i++) {
    T.push([breakR[i], culet, breakR[(i + 1) % N]]);
  }

  const pavPos: number[] = [],
    pavIdx: number[] = [];
  const eps = 1e-5;
  const vm = new Map<string, number>();
  function addV(p: THREE.Vector3): number {
    const k = `${Math.round(p.x / eps)},${Math.round(p.y / eps)},${Math.round(
      p.z / eps
    )}`;
    const hit = vm.get(k);
    if (hit !== undefined) return hit;
    const id = pavPos.length / 3;
    pavPos.push(p.x, p.y, p.z);
    vm.set(k, id);
    return id;
  }
  for (const [a, b, c] of T) pavIdx.push(addV(a), addV(b), addV(c));

  const combPos = new Float32Array(nPos.length + pavPos.length);
  combPos.set(nPos);
  combPos.set(pavPos, nPos.length);
  const combIdx = new Uint32Array(nIdx.length + pavIdx.length);
  combIdx.set(nIdx);
  for (let i = 0; i < pavIdx.length; i++)
    combIdx[nIdx.length + i] = pavIdx[i] + pos.count;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(combPos, 3));
  geo.setIndex(new THREE.BufferAttribute(combIdx, 1));
  return geo;
}

function getStoneGeo(
  stonesScene: THREE.Group,
  meshName: string
): THREE.BufferGeometry | null {
  const cached = stoneGeoCache.get(meshName);
  if (cached) return cached;
  let geo: THREE.BufferGeometry | null = null;
  stonesScene.traverse((node) => {
    if (geo) return;
    const m = node as THREE.Mesh;
    if (m.isMesh && m.name === meshName) geo = m.geometry;
  });
  if (geo) stoneGeoCache.set(meshName, geo);
  return geo;
}

// Returns the average of a geometry's X and Z extents — the "face-up diameter"
// seen from above in the ring, used to normalise all stone sizes to pear.
function faceUpSize(geo: THREE.BufferGeometry): number {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  return (bb.max.x - bb.min.x + (bb.max.z - bb.min.z)) / 2;
}

interface StoneData {
  geo: THREE.BufferGeometry;
  groupScale: THREE.Vector3;
  meshY: number;
}

function extractStoneData(
  stonesScene: THREE.Group,
  stoneKey: string,
  radius: number,
  cushionScene?: THREE.Group,
  princessScene?: THREE.Group,
  roundScene?: THREE.Group,
  marquiseScene?: THREE.Group,
  useTripoStones = false,
  pearScene?: THREE.Group,
): StoneData {
  const isCushion = useTripoStones && stoneKey === "cushion";
  const isPrincess = useTripoStones && stoneKey === "princess";
  const isRound = useTripoStones && stoneKey === "round";
  const isMarquise = useTripoStones && stoneKey === "marquise";
  const isPear = false; // uses stones.glb like oval
  const isTripo = isCushion || isPrincess || isRound || isMarquise || isPear;

  const cacheKey = isTripo ? stoneKey + ":t" : stoneKey;
  const cached = subdivGeoCache.get(cacheKey);
  let meshGeo: THREE.BufferGeometry;

  if (cached) {
    meshGeo = cached.clone();
  } else if (isCushion && cushionScene) {
    const g = buildCushionHybridGeo(cushionScene);
    subdivGeoCache.set(cacheKey, g);
    meshGeo = g.clone();
  } else if (isPrincess && princessScene) {
    const g = buildPrincessHybridGeo(princessScene);
    subdivGeoCache.set(cacheKey, g);
    meshGeo = g.clone();
  } else if (isRound && roundScene) {
    const g = buildRoundStoneGeo(roundScene);
    subdivGeoCache.set(cacheKey, g);
    meshGeo = g.clone();
  } else if (isMarquise && marquiseScene) {
    const g = buildMarquiseHybridGeo(marquiseScene);
    subdivGeoCache.set(cacheKey, g);
    meshGeo = g.clone();
  } else if (isPear && pearScene) {
    const g = buildPearHybridGeo(pearScene);
    subdivGeoCache.set(cacheKey, g);
    meshGeo = g.clone();
  } else {
    const meshName = STONE_MESH_NAME[stoneKey] ?? "stone_round";
    let geo = getStoneGeo(stonesScene, meshName);
    if (!geo)
      stonesScene.traverse((node) => {
        if (geo) return;
        const m = node as THREE.Mesh;
        if (m.isMesh) geo = m.geometry;
      });
    let sg = (geo as THREE.BufferGeometry).clone();
    sg = subdivide(sg);
    sg = subdivide(sg);
    subdivGeoCache.set(cacheKey, sg);
    meshGeo = sg.clone();
  }


  const pearGeo = getStoneGeo(stonesScene, "stone_pear");
  const pearSize = pearGeo ? faceUpSize(pearGeo) : 1;
  const stoneSize = faceUpSize(meshGeo);
  const sizeMatch = stoneSize > 0 ? pearSize / stoneSize : 1;

  const meshY = isMarquise ? -0.08 : 0.14;
  const stoneScaleOverride = isPrincess ? 0.82 : 1.0;
  const baseScale = radius * 1.22 * sizeMatch * stoneScaleOverride;

  const groupScale = new THREE.Vector3();
  if (isMarquise) {
    groupScale.set(baseScale * 0.92, baseScale * 0.78, baseScale * 0.92);
  } else if (isCushion) {
    groupScale.set(baseScale, baseScale * 0.82, baseScale);
  } else if (isPrincess) {
    groupScale.set(baseScale, baseScale * 0.82, baseScale);
  } else {
    groupScale.setScalar(baseScale);
  }

  return { geo: meshGeo, groupScale, meshY };
}

// ─────────────────────────────────────────────────────────────────────────────

interface RingMeshProps {
  metalKey?: string;
  stoneKey?: string;
  autoRotate?: boolean;
  rotateSpeed?: number;
  stoneEnvIntensity?: number;
  stoneTransmission?: number;
  mouseRef?: MutableRefObject<{ x: number; y: number }>;
  onReady?: () => void;
  showLights?: boolean;
  useTripoStones?: boolean;
}

export function RingMesh({
  metalKey = "14k-yellow",
  stoneKey = "round",
  autoRotate = false,
  rotateSpeed = 0.35,
  stoneEnvIntensity = 5.5,
  stoneTransmission = 0,
  mouseRef,
  onReady,
  showLights = true,
  useTripoStones = false,
}: RingMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bandMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const diamondInstalledRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const { scene } = useGLTF("/models/ring-parts.glb");
  const { scene: stonesScene } = useGLTF("/models/stones.glb?v=2");
  const { scene: cushionCrownScene } = useGLTF(
    "/models/cushion-crown.glb?v=5"
  ) as { scene: THREE.Group };
  const { scene: princessCrownScene } = useGLTF(
    "/models/princess-crown.glb?v=1"
  ) as { scene: THREE.Group };
  const { scene: roundStoneScene } = useGLTF("/models/round-stone.glb?v=1") as {
    scene: THREE.Group;
  };
  const { scene: marquiseCrownScene } = useGLTF(
    "/models/marquise-crown.glb?v=2"
  ) as { scene: THREE.Group };
  const { scene: pearCrownScene } = useGLTF("/models/pear-crown.glb?v=1") as {
    scene: THREE.Group;
  };
  const clonedScene = useRef<THREE.Group>(null!);
  if (!clonedScene.current)
    clonedScene.current = scene.clone(true) as THREE.Group;

  const girdlePosRef = useRef<THREE.Vector3 | null>(null);
  const stoneRadiusRef = useRef<number>(0.183);
  const stoneShaderUniforms = useRef<Record<string, { value: any }> | null>(null);

  // Re-use the existing diamond shader (FBM micro-dents + dispersion) but with
  // alpha transparency instead of physical transmission — facets stay visible
  // from all angles while the body reads as thick crystal rather than chalk.
  // Created once — never recreated on stone switch.
  // Pattern uniforms (coarseFreq, stretch, etc.) are updated via effect below.
  const centerStoneMat = useMemo(() => {
    const m = makeDiamondMat(7.0, 0, stoneKey, (u) => {
      stoneShaderUniforms.current = u;
    });
    // Icy grey base — diamond-appropriate diffuse, contrast comes from specular.
    m.color.set("#c8d4e2");
    m.iridescence = 1.0;
    m.iridescenceIOR = 2.42;
    m.iridescenceThicknessRange = [80, 500];
    m.transparent = false;
    m.opacity = 1.0;
    m.depthWrite = true;
    m.needsUpdate = true;
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [stoneData, setStoneData] = useState<StoneData | null>(null);
  const [seatPos, setSeatPos] = useState<THREE.Vector3 | null>(null);
  const stoneJSXGroupRef = useRef<THREE.Group>(null);
  const stoneAnimTargetRef = useRef<THREE.Vector3 | null>(null);
  const isFirstStoneRef = useRef(true);
  const prevStoneGeoRef = useRef<THREE.BufferGeometry | null>(null);

  const config = METAL_CONFIGS[metalKey] ?? METAL_CONFIGS["14k-yellow"];

  const spring = useSpring({
    color: config.color,
    metalness: config.metalness,
    roughness: config.roughness,
    envMapIntensity: config.envMapIntensity,
    clearcoat: config.clearcoat,
    config: { mass: 1, tension: 160, friction: 40 },
  });

  // ── Initial setup ────────────────────────────────────────────────
  useEffect(() => {
    if (diamondInstalledRef.current) return;
    diamondInstalledRef.current = true;

    clonedScene.current.updateMatrixWorld(true);

    const bandMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(config.color),
      metalness: config.metalness,
      roughness: config.roughness,
      envMapIntensity: config.envMapIntensity,
      clearcoat: config.clearcoat,
      clearcoatRoughness: config.clearcoatRoughness,
      anisotropy: 0.8,
      anisotropyRotation: Math.PI / 2,
      reflectivity: 1.0,
    });
    bandMaterialRef.current = bandMat;

    // Accent stones (side band diamonds) use a plain MeshPhysicalMaterial —
    // no Voronoi/FBM shader. At their small scale the detail is invisible,
    // and running the heavy custom shader on 20-30 meshes every frame tanks perf.
    const accentMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#c8d4e2"),
      roughness: 0.0,
      metalness: 0.0,
      envMapIntensity: stoneEnvIntensity * 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      reflectivity: 1.0,
      specularIntensity: 1.0,
      iridescence: 0.9,
      iridescenceIOR: 2.5,
      iridescenceThicknessRange: [80, 400],
      flatShading: true,
      side: THREE.DoubleSide,
    });

    // ── Pass 1: Find the prong basket + collect all mesh data ────────
    // The prong basket is the largest-tri mesh at positive Y near the ring axis.
    // We also collect every mesh's bbox here so Pass 2 can use them.
    type MeshInfo = {
      m: THREE.Mesh;
      bbox: THREE.Box3;
      cx: number;
      cy: number;
      cz: number;
      triCount: number;
    };
    const allMeshInfo: MeshInfo[] = [];

    let basketBBox: THREE.Box3 | null = null;
    let basketMesh: THREE.Mesh | null = null;
    let basketMaxTris = 0;

    clonedScene.current.traverse((node) => {
      const m = node as THREE.Mesh;
      if (!m.isMesh) return;

      m.geometry.computeBoundingBox();
      const bbox = m.geometry.boundingBox!;
      const cx = (bbox.min.x + bbox.max.x) / 2;
      const cy = (bbox.min.y + bbox.max.y) / 2;
      const cz = (bbox.min.z + bbox.max.z) / 2;
      const distXZ = Math.sqrt(cx * cx + cz * cz);
      const triCount =
        (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3;

      allMeshInfo.push({ m, bbox: bbox.clone(), cx, cy, cz, triCount });

      if (
        triCount > 10000 &&
        cy > 0.1 &&
        distXZ < 0.25 &&
        triCount > basketMaxTris
      ) {
        basketMaxTris = triCount;
        basketBBox = bbox.clone();
        basketMesh = m;
      }
    });

    // Derive stone seat from basket bbox
    let seatCenter: THREE.Vector3;
    let seatRadius: number;

    if (basketBBox) {
      const bb = basketBBox as THREE.Box3;
      const size = new THREE.Vector3();
      bb.getSize(size);
      seatCenter = new THREE.Vector3(0, bb.min.y + size.y * 0.9, 0);
      seatRadius = (Math.max(size.x, size.z) / 2) * 1.3;
    } else {
      seatCenter = new THREE.Vector3(0, 0.28, 0);
      seatRadius = 0.183;
    }

    stoneRadiusRef.current = seatRadius;
    girdlePosRef.current = seatCenter.clone();

    // ── Pass 2: Classify + apply materials ────────────────────────
    // Stone seat zone: everything whose CENTER falls inside the basket's
    // XZ footprint (with a small margin) AND above the band equator.
    // These are center-stone facets + any inner prong detail inside the basket.
    // We remove them all — the diamond we place fills that space.
    //
    // Containment is reliable regardless of tri count or distXZ quirks from
    // Draco decode, because it's purely geometric: "is this mesh inside the
    // prong basket's ground plan?"

    const stoneToRemove: THREE.Mesh[] = [];

    for (const { m, bbox, cx, cy, cz, triCount } of allMeshInfo) {
      m.castShadow = true;
      m.receiveShadow = true;

      if (basketBBox && m !== basketMesh) {
        const bb = basketBBox as THREE.Box3;
        const EXPAND = 0.06;
        const inBasketXZ =
          cx >= bb.min.x - EXPAND &&
          cx <= bb.max.x + EXPAND &&
          cz >= bb.min.z - EXPAND &&
          cz <= bb.max.z + EXPAND;

        if (inBasketXZ && cy > 0.01) {
          const bboxSizeX = bbox.max.x - bbox.min.x;
          const bboxSizeY = bbox.max.y - bbox.min.y;
          const bboxSizeZ = bbox.max.z - bbox.min.z;
          const bboxMaxXZ = Math.max(bboxSizeX, bboxSizeZ);
          // Gallery strip detection covers two types:
          // 1) Paper-thin in Y (left-right connectors, sY≈0.002)
          // 2) Narrow elongated in one horizontal direction (front-back connectors,
          //    e.g. sX=0.04 sZ=0.18 — narrow width but long depth)
          const isGalleryStrip =
            (bboxSizeY < 0.01 && bboxMaxXZ > 0.05) ||
            (bboxSizeY < 0.09 &&
              ((bboxSizeX < 0.05 &&
                bboxSizeZ / Math.max(bboxSizeX, 0.001) > 3.0) ||
                (bboxSizeZ < 0.05 &&
                  bboxSizeX / Math.max(bboxSizeZ, 0.001) > 3.0)));
          if (isGalleryStrip) {
            m.material = bandMat;
            continue;
          }
          // Only remove the top 20% of the basket (the stone table + upper crown facets).
          // Keeping the lower 80% preserves gallery strips and their adjacent geometry.
          const seatFloor = bb.min.y + (bb.max.y - bb.min.y) * 0.8;
          if (cy >= seatFloor && triCount < 12000) {
            stoneToRemove.push(m);
            continue;
          }
          // Below seatFloor or large structural piece → always gold, never accent
          m.material = bandMat;
          continue;
        }
      }

      // Same strip check globally for connectors outside the basket XZ zone.
      {
        const gX = bbox.max.x - bbox.min.x;
        const gY = bbox.max.y - bbox.min.y;
        const gZ = bbox.max.z - bbox.min.z;
        const isGlobalStrip =
          (gY < 0.01 && Math.max(gX, gZ) > 0.05) ||
          (gY < 0.09 &&
            ((gX < 0.05 && gZ / Math.max(gX, 0.001) > 3.0) ||
              (gZ < 0.05 && gX / Math.max(gZ, 0.001) > 3.0)));
        if (isGlobalStrip) {
          m.material = bandMat;
          continue;
        }
      }

      // Meshes at basket height but outside basket XZ zone are prong/setting details — gold.
      // Band accent stones are distributed around the shank at low/negative cy.
      if (triCount < 900 && cy < 0.3) {
        m.material = accentMat;
        m.castShadow = false;
        m.receiveShadow = false;
      } else {
        m.material = bandMat;
      }
    }

    // Remove stone meshes from scene graph after traversal (safe to mutate now)
    stoneToRemove.forEach((m) => {
      m.geometry.dispose();
      if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
      else (m.material as THREE.Material)?.dispose();
      m.parent?.remove(m);
    });

    // ── Extract center stone data for JSX rendering ───────────────
    const data = extractStoneData(
      stonesScene, stoneKey, seatRadius,
      cushionCrownScene, princessCrownScene, roundStoneScene,
      marquiseCrownScene, useTripoStones, pearCrownScene,
    );
    prevStoneGeoRef.current = data.geo;
    setStoneData(data);
    setSeatPos(seatCenter.clone());
  }, []);

  // ── Signal ready ─────────────────────────────────────────────────
  useEffect(() => {
    onReady?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update stone shader pattern on switch (no recompile) ─────────
  useEffect(() => {
    const u = stoneShaderUniforms.current;
    if (!u) return;
    const pat = STONE_PATTERNS[stoneKey] ?? STONE_PATTERNS.round;
    u.uStretchAxis.value.set(pat.axis[0], pat.axis[1], pat.axis[2]);
    u.uStretch.value = pat.stretch;
    u.uGrid.value = pat.grid;
    u.uCoarseFreq.value = pat.coarseFreq;
    u.uFineFreq.value = pat.fineFreq;
    u.uDentStrength.value = pat.dentStrength ?? 1.0;
  }, [stoneKey]);

  // ── Stone switching ───────────────────────────────────────────────
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const r = stoneRadiusRef.current;
    prevStoneGeoRef.current?.dispose();

    const data = extractStoneData(
      stonesScene, stoneKey, r,
      cushionCrownScene, princessCrownScene, roundStoneScene,
      marquiseCrownScene, useTripoStones, pearCrownScene,
    );
    prevStoneGeoRef.current = data.geo;
    setStoneData(data);
  }, [stoneKey]);

  // ── Reset stone scale for switch animation ────────────────────────
  useLayoutEffect(() => {
    if (!stoneJSXGroupRef.current || !stoneData) return;
    if (isFirstStoneRef.current) {
      isFirstStoneRef.current = false;
      stoneJSXGroupRef.current.scale.copy(stoneData.groupScale);
      return;
    }
    stoneJSXGroupRef.current.scale.setScalar(0.001);
    stoneAnimTargetRef.current = stoneData.groupScale.clone();
  }, [stoneData]);

  // ── Rotation + mouse ──────────────────────────────────────────────
  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const d = Math.min(delta, 0.04);

    if (stoneShaderUniforms.current)
      stoneShaderUniforms.current.uTime.value = clock.getElapsedTime();

    if (stoneJSXGroupRef.current && stoneAnimTargetRef.current) {
      stoneJSXGroupRef.current.scale.lerp(stoneAnimTargetRef.current, 0.1);
      if (stoneJSXGroupRef.current.scale.distanceTo(stoneAnimTargetRef.current) < 0.002) {
        stoneJSXGroupRef.current.scale.copy(stoneAnimTargetRef.current);
        stoneAnimTargetRef.current = null;
      }
    }

    if (autoRotate) {
      const t = clock.getElapsedTime();
      group.rotation.y += d * rotateSpeed;
      group.rotation.x = Math.sin(t * 0.4) * 0.04;
    }

    if (!autoRotate && mouseRef) {
      group.rotation.x += (mouseRef.current.y * 0.02 - group.rotation.x) * 0.05;
      group.rotation.y += (mouseRef.current.x * 0.02 - group.rotation.y) * 0.05;
    }

    const mat = bandMaterialRef.current;
    if (mat) {
      mat.color.set(spring.color.get());
      mat.metalness = spring.metalness.get();
      mat.roughness = spring.roughness.get();
      mat.envMapIntensity = spring.envMapIntensity.get();
      mat.clearcoat = spring.clearcoat.get();
      mat.needsUpdate = false;
    }
  });

  return (
    <>
      {showLights && (
        <>
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
          <spotLight
            position={[0, 6, 1]}
            intensity={22}
            angle={0.18}
            penumbra={0.3}
            color="#ffffff"
            castShadow={false}
          />
          <pointLight position={[0, -2, 2]} intensity={10} color="#ffffff" />
          <pointLight position={[0, -1, -4]} intensity={8} color="#ffffff" />
          <pointLight position={[0, 0.06, 0]} intensity={22} color="#fff8f0" distance={1.2} />
        </>
      )}

      <group ref={groupRef}>
        <primitive object={clonedScene.current} scale={1.8} />
        {stoneData && seatPos && (
          <group scale={1.8}>
            <group ref={stoneJSXGroupRef} position={seatPos}>
              <mesh geometry={stoneData.geo} position-y={stoneData.meshY} material={centerStoneMat} />
            </group>
          </group>
        )}
      </group>
    </>
  );
}
