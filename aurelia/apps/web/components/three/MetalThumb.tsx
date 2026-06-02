'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Suspense } from 'react'
import { MetalConfig } from '@/lib/materials'
import { LightTentEnvironment } from '@/components/three/LightTentEnvironment'

interface MetalThumbProps {
  metalKey: string
  config: MetalConfig
  selected: boolean
  onClick: () => void
  showLabel?: boolean
  active?: boolean  // true only for center slot (abs === 0)
}

function Exposure() {
  const { gl } = useThree()
  useEffect(() => { gl.toneMappingExposure = 2.2 }, [gl])
  return null
}

function MetalRingScene({ config }: { config: MetalConfig }) {
  return (
    <>
      <Exposure />
      <LightTentEnvironment transparent={true} />
      <spotLight position={[1, 3, 2]} intensity={5} angle={0.5} penumbra={0.6} castShadow={false} />
      <spotLight position={[-2, 2, -1]} intensity={3} angle={0.6} penumbra={0.8} castShadow={false} />
      <ambientLight intensity={0.12} />
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.5, 0.15, 16, 64]} />
        <meshPhysicalMaterial
          color={config.color}
          metalness={config.metalness}
          roughness={config.roughness}
          envMapIntensity={config.envMapIntensity}
          clearcoat={config.clearcoat}
          clearcoatRoughness={config.clearcoatRoughness}
        />
      </mesh>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={4}
      />
    </>
  )
}

export function MetalThumb({ metalKey: _metalKey, config, selected, onClick, showLabel = true, active = false }: MetalThumbProps) {
  const isFirstRender = useRef(true)
  // On initial render, if already active (page load center slot), mount immediately.
  // On subsequent active=true transitions (navigation), delay until after framer-motion
  // scale animation (0.52s) so R3F reads correct canvas dimensions.
  const [showCanvas, setShowCanvas] = useState(active)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (active) {
      const t = setTimeout(() => setShowCanvas(true), 100)
      return () => { clearTimeout(t); setShowCanvas(false) }
    } else {
      setShowCanvas(false)
    }
  }, [active])

  return (
    <button
      onClick={onClick}
      data-cursor-hover
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <div style={{ width: 88, height: 72, display: 'block' }}>
        {showCanvas ? (
          <Canvas
            camera={{ position: [0, 0, 1.95], fov: 42 }}
            gl={{ antialias: true, alpha: true, toneMapping: 4 }}
            frameloop="always"
            dpr={[1, 1.5]}
            style={{ display: 'block' }}
          >
            <Suspense fallback={null}>
              <MetalRingScene config={config} />
            </Suspense>
          </Canvas>
        ) : null}
      </div>

      {/* Selected indicator — thin glowing gold line */}
      <div style={{
        width: 22,
        height: 1.5,
        borderRadius: 2,
        background: selected
          ? 'linear-gradient(90deg, transparent, rgba(201,168,76,0.9) 40%, rgba(201,168,76,0.9) 60%, transparent)'
          : 'transparent',
        boxShadow: selected
          ? '0 0 6px rgba(201,168,76,0.8), 0 0 16px rgba(201,168,76,0.35)'
          : 'none',
        transition: 'background 0.35s ease, box-shadow 0.35s ease',
      }} />

      {showLabel && (
        <span style={{
          fontSize: 9,
          letterSpacing: '0.06em',
          color: selected ? 'var(--gold)' : '#555',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-body)',
          transition: 'color 0.3s ease',
          maxWidth: 64,
          textAlign: 'center',
          lineHeight: 1.3,
        }}>
          {config.shortLabel}
        </span>
      )}
    </button>
  )
}
