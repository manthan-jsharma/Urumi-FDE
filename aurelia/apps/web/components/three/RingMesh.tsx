"use client";

import { useRef, useEffect, MutableRefObject } from "react";
import { useGLTF } from "@react-three/drei";
import { useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { METAL_CONFIGS } from "@/lib/materials";

useGLTF.preload("/models/ring-parts.glb");
useGLTF.preload("/models/stones.glb");

// ─────────────────────────────────────────────────────────────────────────────
// Diamond material — flatShading gives each facet its own normal, producing the
// fire-and-brilliance pattern of a real cut stone.
// ─────────────────────────────────────────────────────────────────────────────
function makeDiamondMat(
  envIntensity = 5.5,
  transmission = 0.88
): THREE.MeshPhysicalMaterial {
  const hasTransmission = transmission > 0;
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    transmission: hasTransmission ? transmission : 0,
    thickness: hasTransmission ? 2.4 : 0,
    ior: 2.42,
    attenuationDistance: hasTransmission ? 3.5 : 0,
    attenuationColor: new THREE.Color("#fdfaf5"),
    roughness: 0.0,
    metalness: 0.0,
    envMapIntensity: envIntensity,
    transparent: hasTransmission,
    depthWrite: !hasTransmission,
    clearcoat: hasTransmission ? 1.0 : 0.35,
    clearcoatRoughness: 0.0,
    reflectivity: 1.0,
    iridescence: hasTransmission ? 0.6 : 0.45,
    iridescenceIOR: 2.2,
    flatShading: true,
    side: THREE.DoubleSide,
  });
}


const STONE_MESH_NAME: Record<string, string> = {
  round: "stone_round",
  oval: "stone_oval",
  princess: "stone_princess",
  cushion: "stone_cushion",
  marquise: "stone_marquise",
  pear: "stone_pear",
};

function buildStoneGroup(
  stonesScene: THREE.Group,
  stoneKey: string,
  radius: number,
  envIntensity: number,
  transmission: number
): THREE.Group {
  const meshName = STONE_MESH_NAME[stoneKey] ?? "stone_round";
  let geo: THREE.BufferGeometry | null = null;
  stonesScene.traverse((node) => {
    if (geo) return;
    const m = node as THREE.Mesh;
    if (m.isMesh && m.name === meshName) geo = m.geometry;
  });
  if (!geo)
    stonesScene.traverse((node) => {
      if (geo) return;
      const m = node as THREE.Mesh;
      if (m.isMesh) geo = m.geometry;
    });

  const STONE_SCALE_CORRECTION: Record<string, number> = {
    princess: 0.85,
  };

  const mat = makeDiamondMat(envIntensity, transmission);
  const mesh = new THREE.Mesh(
    (geo as unknown as THREE.BufferGeometry).clone(),
    mat
  );
  const g = new THREE.Group();
  g.add(mesh);
  g.scale.setScalar(radius * (STONE_SCALE_CORRECTION[stoneKey] ?? 1.0));
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
  stoneTransmission = 0.88,
  mouseRef,
  onReady,
  showLights = true,
}: RingMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bandMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const diamondInstalledRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const { scene } = useGLTF("/models/ring-parts.glb");
  const { scene: stonesScene } = useGLTF("/models/stones.glb");
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

    const accentMat = makeDiamondMat(stoneEnvIntensity * 1.5, stoneTransmission);
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
