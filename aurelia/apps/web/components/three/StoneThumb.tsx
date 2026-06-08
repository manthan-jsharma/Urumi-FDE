'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { LightTentEnvironment } from '@/components/three/LightTentEnvironment'

useGLTF.preload('/models/stones.glb')

export function DarkBackground({ color = '#0a0a0a' }: { color?: string }) {
  const { scene } = useThree()
  useEffect(() => { scene.background = new THREE.Color(color) }, [scene, color])
  return null
}

type StoneShape = 'round' | 'oval' | 'princess' | 'cushion' | 'marquise' | 'pear'

const STONE_MESH_NAME: Record<string, string> = {
  round: 'stone_round', oval: 'stone_oval', princess: 'stone_princess',
  cushion: 'stone_cushion', marquise: 'stone_marquise', pear: 'stone_pear',
}

export function StoneGeometry({ shape }: { shape: StoneShape }) {
  const { scene } = useGLTF('/models/stones.glb')

  const geo = useMemo(() => {
    const name = STONE_MESH_NAME[shape] ?? 'stone_round'
    let found: THREE.BufferGeometry | null = null
    scene.traverse((node) => {
      if (found) return
      const m = node as THREE.Mesh
      if (m.isMesh && m.name === name) found = m.geometry
    })
    return found
  }, [scene, shape])

  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color:           new THREE.Color('#ffffff'),
    roughness:       0.0,
    metalness:       0.0,
    envMapIntensity: 8,
    clearcoat:       0.35,
    clearcoatRoughness: 0.0,
    iridescence:     0.45,
    iridescenceIOR:  2.2,
    reflectivity:    1.0,
    flatShading:     true,
    side:            THREE.DoubleSide,
  }), [])

  if (!geo) return null

  return (
    <mesh geometry={geo} material={mat} scale={0.48} />
  )
}

interface StoneThumbProps {
  shape: StoneShape
  selected: boolean
  label: string
  onClick: () => void
}

export function StoneThumb({ shape, selected, label, onClick }: StoneThumbProps) {
  return (
    <button
      onClick={onClick}
      data-cursor-hover
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, background: 'none', border: 'none', padding: 0,
      }}
    >
      <div style={{
        width: 72, height: 72,
        border: selected ? '1.5px solid var(--gold)' : '1px solid #2a2a2a',
        borderRadius: 4, overflow: 'hidden', background: '#080808',
        transition: 'border-color 0.3s ease',
        boxShadow: selected ? '0 0 12px rgba(201, 168, 76, 0.15)' : 'none',
      }}>
        <Canvas
          camera={{ position: [0, 0.3, 2.4], fov: 40 }}
          gl={{ antialias: true, alpha: true, toneMapping: 4 }}
          frameloop="demand"
          dpr={[1, 1.5]}
        >
          <Suspense fallback={null}>
            <LightTentEnvironment transparent={false} />
            <DarkBackground />
            <spotLight position={[2, 5, 2.5]}    intensity={14} angle={0.13} penumbra={0.04} color="#ffffff" />
            <spotLight position={[-2.5, 3.5, 1.5]} intensity={10} angle={0.16} penumbra={0.06} color="#ffffff" />
            <spotLight position={[0.3, 7, 0.5]}  intensity={12} angle={0.11} penumbra={0.03} color="#ffffff" />
            <spotLight position={[0, 1, 4]}       intensity={8}  angle={0.18} penumbra={0.06} color="#ffffff" />
            <ambientLight intensity={0.03} />
            <StoneGeometry shape={shape} />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={5} />
          </Suspense>
        </Canvas>
      </div>
      <span style={{
        fontSize: 10, letterSpacing: '0.08em',
        color: selected ? 'var(--gold)' : 'var(--text-secondary)',
        textTransform: 'uppercase', fontFamily: 'var(--font-body)',
        transition: 'color 0.3s ease',
      }}>
        {label}
      </span>
    </button>
  )
}
