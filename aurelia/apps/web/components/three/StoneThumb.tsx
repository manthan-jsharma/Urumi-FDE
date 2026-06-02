'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { makeDiamond } from '@/components/three/RingMesh'
import { LightTentEnvironment } from '@/components/three/LightTentEnvironment'

export function DarkBackground({ color = '#0a0a0a' }: { color?: string }) {
  const { scene } = useThree()
  useEffect(() => {
    scene.background = new THREE.Color(color)
  }, [scene, color])
  return null
}

type StoneShape = 'round' | 'oval' | 'princess' | 'cushion' | 'marquise' | 'pear'

// ── Renders the exact same faceted diamond geometry used on the ring ──────────
export function StoneGeometry({ shape }: { shape: StoneShape }) {
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!groupRef.current) return
    while (groupRef.current.children.length) {
      groupRef.current.remove(groupRef.current.children[0])
    }
    const diamond = makeDiamond(0.48, 0.48 * 1.55, shape, 8, 0)
    groupRef.current.add(diamond)

    return () => {
      diamond.traverse((node) => {
        const m = node as THREE.Mesh
        if (m.isMesh) {
          m.geometry.dispose()
          if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose())
          else (m.material as THREE.Material).dispose()
        }
      })
    }
  }, [shape])

  return <group ref={groupRef} />
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        padding: 0,
      }}
    >
      <div style={{
        width: 72,
        height: 72,
        border: selected ? '1.5px solid var(--gold)' : '1px solid #2a2a2a',
        borderRadius: 4,
        overflow: 'hidden',
        background: '#080808',
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
            {/* Hard key — tight cone, max contrast between adjacent facets */}
            <spotLight position={[2, 5, 2.5]} intensity={14} angle={0.13} penumbra={0.04} color="#ffffff" />
            {/* Counter — upper left, lights facets the key misses */}
            <spotLight position={[-2.5, 3.5, 1.5]} intensity={10} angle={0.16} penumbra={0.06} color="#ffffff" />
            {/* Top beam — hits table + star zone directly */}
            <spotLight position={[0.3, 7, 0.5]} intensity={12} angle={0.11} penumbra={0.03} color="#ffffff" />
            {/* Cross fill — front low, lights pavilion facets */}
            <spotLight position={[0, 1, 4]} intensity={8} angle={0.18} penumbra={0.06} color="#ffffff" />
            <ambientLight intensity={0.03} />
            <StoneGeometry shape={shape} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={5}
            />
          </Suspense>
        </Canvas>
      </div>
      <span style={{
        fontSize: 10,
        letterSpacing: '0.08em',
        color: selected ? 'var(--gold)' : 'var(--text-secondary)',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-body)',
        transition: 'color 0.3s ease',
      }}>
        {label}
      </span>
    </button>
  )
}
