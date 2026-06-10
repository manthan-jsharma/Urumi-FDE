"use client";

import { useRef, useEffect, MutableRefObject } from "react";
import { useGLTF } from "@react-three/drei";
import { useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { METAL_CONFIGS } from "@/lib/materials";

useGLTF.preload("/models/ring-parts.glb");
useGLTF.preload("/models/stones.glb?v=2");

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
  float _tirFade = smoothstep( 0.48, 0.82, _cosV );   // 0 at grazing, 1 face-on
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
varying vec3 vObjectPos;

float _hsh( vec3 p ) {
  p  = fract( p * vec3( 443.897, 441.423, 437.195 ) );
  p += dot( p, p.zxy + 19.19 );
  return fract( ( p.x + p.y ) * p.z );
}

// Returns vec4( noise_value, gradient.xyz ) — one call does the work of 7.
vec4 _vng( vec3 p ) {
  vec3 i  = floor( p );
  vec3 f  = fract( p );
  // Quintic smoothstep (C2): smoother than cubic, required for correct analytic grad
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

// 3-octave analytic-gradient FBM — returns vec4(value, gradient.xyz)
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
`;

// Dent block — two analytic FBM calls replace the old 12 central-difference calls
const MICRO_DENTS_GLSL = /* glsl */ `
{
  // Coarse layer: large bowl-shaped dents between facet groups
  vec3 _bumpA = _fbmG( vObjectPos *  8.0 ).yzw;
  // Fine layer:  micro-scratches / polishing marks within each facet
  vec3 _bumpB = _fbmG( vObjectPos * 32.0 ).yzw;

  normal = normalize( normal
    + normalize( _bumpA ) * 0.32
    + normalize( _bumpB ) * 0.16 );
}
`;

function makeDiamondMat(
  envIntensity = 5.5,
  transmission = 0          // default 0 — background canvases stay fast/opaque.
                             // Pass 0.72 only for the main configurator canvas.
): THREE.MeshPhysicalMaterial {
  const hasTransmission = transmission > 0;
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    transmission: hasTransmission ? transmission : 0,
    thickness:    hasTransmission ? 2.8 : 0,
    ior:          2.42,
    attenuationDistance: hasTransmission ? 2.8 : 0,
    attenuationColor:    new THREE.Color("#fdfaf5"),
    roughness: 0.0,
    metalness: 0.0,
    envMapIntensity: envIntensity * (hasTransmission ? 1.25 : 1.4),
    transparent:  hasTransmission,
    depthWrite:  !hasTransmission,
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
    // ── Vertex shader: export object-space position as varying ────────────
    // Must go at global scope (before void main) so the declaration is valid.
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `varying vec3 vObjectPos;\nvoid main() {`
    );
    // Set it right after Three.js sets `transformed = position` in begin_vertex.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nvObjectPos = position;`
    );

    // ── Fragment shader ───────────────────────────────────────────────────
    // 1. Inject noise functions + varying declaration at global scope
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `${DENTS_PREAMBLE_GLSL}\nvoid main() {`
    );
    // 2. Dispersion: replace the transmission include with the 3-channel IOR version
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <transmission_fragment>',
      DISPERSION_TRANSMISSION_GLSL
    );
    // 3. FBM bump dents: gradient-based normal perturbation after normal map stage
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>\n${MICRO_DENTS_GLSL}`
    );
  };
  // All diamond materials share one compiled program — stable cache key
  mat.customProgramCacheKey = () => 'diamond-v3';

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
  const src = geo.getAttribute('position') as THREE.BufferAttribute;

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
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    newIdx.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
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
  return ((bb.max.x - bb.min.x) + (bb.max.z - bb.min.z)) / 2;
}

function buildStoneGroup(
  stonesScene: THREE.Group,
  stoneKey: string,
  radius: number,
  envIntensity: number,
  transmission: number
): THREE.Group {
  const meshName = STONE_MESH_NAME[stoneKey] ?? "stone_round";
  let geo = getStoneGeo(stonesScene, meshName);
  if (!geo)
    stonesScene.traverse((node) => {
      if (geo) return;
      const m = node as THREE.Mesh;
      if (m.isMesh) geo = m.geometry;
    });

  // Match every stone's face-up diameter to pear's so they all look the same size.
  const pearGeo = getStoneGeo(stonesScene, "stone_pear");
  const pearSize  = pearGeo ? faceUpSize(pearGeo) : 1;
  const stoneSize = faceUpSize(geo as THREE.BufferGeometry);
  const sizeMatch = stoneSize > 0 ? pearSize / stoneSize : 1;

  const mat = makeDiamondMat(envIntensity, transmission);

  // 2-pass subdivision cached per shape key — runs once per shape ever.
  const cached = subdivGeoCache.get(stoneKey);
  let meshGeo: THREE.BufferGeometry;
  if (cached) {
    meshGeo = cached.clone();
  } else {
    let sg = (geo as unknown as THREE.BufferGeometry).clone();
    sg = subdivide(sg); sg = subdivide(sg);
    subdivGeoCache.set(stoneKey, sg);
    meshGeo = sg.clone();
  }

  const mesh = new THREE.Mesh(meshGeo, mat);
  mesh.position.y = 0.14;
  const g = new THREE.Group();
  g.add(mesh);
  g.scale.setScalar(radius * 1.22 * sizeMatch);
  return g;
}

function disposeDiamond(group: THREE.Group) {
  group.traverse((node) => {
    const m = node as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
      else (m.material as THREE.Material).dispose();
    }
  });
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
}: RingMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bandMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const diamondInstalledRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const { scene } = useGLTF("/models/ring-parts.glb");
  const { scene: stonesScene } = useGLTF("/models/stones.glb?v=2");
  const clonedScene = useRef<THREE.Group>(null!);
  if (!clonedScene.current)
    clonedScene.current = scene.clone(true) as THREE.Group;

  const diamondGroupRef = useRef<THREE.Group | null>(null);
  const diamondParentRef = useRef<THREE.Object3D | null>(null);
  const girdlePosRef = useRef<THREE.Vector3 | null>(null);
  const stoneRadiusRef = useRef<number>(0.183);

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

    const accentMat = makeDiamondMat(
      stoneEnvIntensity * 1.5,
      stoneTransmission
    );
    accentMat.iridescence = 0.9;
    accentMat.iridescenceIOR = 2.5;
    accentMat.needsUpdate = true;

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

    // ── Place center diamond ──────────────────────────────────────
    const diamond = buildStoneGroup(
      stonesScene,
      stoneKey,
      seatRadius,
      stoneEnvIntensity,
      stoneTransmission
    );
    diamond.position.copy(seatCenter);
    const parent = clonedScene.current;
    parent.add(diamond);
    diamondGroupRef.current = diamond;
    diamondParentRef.current = parent;
  }, []);

  // ── Signal ready ─────────────────────────────────────────────────
  useEffect(() => {
    onReady?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stone switching ───────────────────────────────────────────────
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const parent = diamondParentRef.current;
    const pos = girdlePosRef.current;
    if (!parent || !pos) return;

    if (diamondGroupRef.current) {
      parent.remove(diamondGroupRef.current);
      disposeDiamond(diamondGroupRef.current);
      diamondGroupRef.current = null;
    }

    const r = stoneRadiusRef.current;
    const diamond = buildStoneGroup(
      stonesScene,
      stoneKey,
      r,
      stoneEnvIntensity,
      stoneTransmission
    );
    diamond.position.copy(pos);
    parent.add(diamond);
    diamondGroupRef.current = diamond;
  }, [stoneKey]);

  // ── Rotation + mouse ──────────────────────────────────────────────
  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const d = Math.min(delta, 0.04);

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
        </>
      )}

      <group ref={groupRef}>
        <primitive object={clonedScene.current} scale={1.8} />
      </group>
    </>
  );
}
