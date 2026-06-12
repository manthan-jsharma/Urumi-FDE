'use client'

import { Suspense, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useConfigStore } from '@/lib/store'
import { METAL_CONFIGS, STONE_CONFIGS } from '@/lib/materials'
import { RingMesh } from '@/components/three/RingMesh'
import { PostFX } from '@/components/three/PostFX'
import { LightTentEnvironment } from '@/components/three/LightTentEnvironment'
import { FloatingCallout } from '@/components/configurator/FloatingCallout'
import { StonePicker } from '@/components/configurator/StonePicker'
import { MetalPicker } from '@/components/configurator/MetalPicker'
import { PriceDisplay } from '@/components/configurator/PriceDisplay'
import { AddToCart } from '@/components/configurator/AddToCart'
import { CartDrawer } from '@/components/ui/CartDrawer'
import { RingLoader } from '@/components/ui/RingLoader'

const NOISE_URL = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='grain'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23grain)'/></svg>")`

const panelItem = (delay: number, loaded: boolean) => ({
  initial: { opacity: 0, y: 12 },
  animate: loaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const, delay },
})

// ── Pedestal ───────────────────────────────────────────────────────────────
// Thin glass disc the ring floats above — clear acrylic display-stand look.
// High transmission + near-zero roughness = optically clear glass.
// Slight blue-white tint (#e8eeff) reads as clean glass on a dark background.
// depthWrite: false avoids clipping the contact shadow underneath.
function Pedestal() {
  return (
    <mesh position={[0, -0.905, 0]} receiveShadow>
      <cylinderGeometry args={[1.05, 1.05, 0.016, 96, 1]} />
      <meshPhysicalMaterial
        color="#e8eeff"
        roughness={0.02}
        metalness={0}
        transmission={0.88}
        thickness={0.4}
        ior={1.52}
        reflectivity={0.95}
        clearcoat={1.0}
        clearcoatRoughness={0.02}
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </mesh>
  )
}

function RingScene({ onReady }: { onReady: () => void }) {
  const metal = useConfigStore((s) => s.metal)
  const stone = useConfigStore((s) => s.stone)
  const showCallout = useConfigStore((s) => s.showCallout)
  const userInteracting = useConfigStore((s) => s.userInteracting)
  const setUserInteracting = useConfigStore((s) => s.setUserInteracting)
  const setShowCallout = useConfigStore((s) => s.setShowCallout)

  return (
    <Canvas
      camera={{ position: [0, 6.5, 0.3], fov: 48 }}
      gl={{ antialias: false, alpha: false, toneMapping: 4, toneMappingExposure: 0.72 }}
      dpr={[1, 1.5]}
      shadows
    >
      <color attach="background" args={['#0d0d0d']} />
      <Suspense fallback={null}>
        <LightTentEnvironment delay={600} />
        <spotLight position={[5, 8, 3]} intensity={2.5} angle={0.35} penumbra={0.8} castShadow shadow-mapSize={[256, 256]} />
        <ambientLight intensity={0.12} />
        <RingMesh metalKey={metal} stoneKey={stone} autoRotate={!userInteracting} onReady={onReady} stoneTransmission={0.72} useTripoStones culetLight />
        <Pedestal />
        <ContactShadows position={[0, -0.92, 0]} opacity={0.5} scale={2.8} blur={2} far={1.0} frames={1} />
        <FloatingCallout metal={metal} stone={stone} visible={showCallout} />
        <PostFX vignette={0.5} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minDistance={2}
        maxDistance={6}
        dampingFactor={0.05}
        autoRotate={!userInteracting}
        autoRotateSpeed={0.4}
        onStart={() => { setUserInteracting(true); setShowCallout(false) }}
        onEnd={() => { setUserInteracting(false); setTimeout(() => setShowCallout(true), 1200) }}
      />
    </Canvas>
  )
}

export function ConfiguratorLayout() {
  const [isLoaded, setIsLoaded] = useState(false)
  const metal = useConfigStore((s) => s.metal)
  const stone = useConfigStore((s) => s.stone)
  const setMetal = useConfigStore((s) => s.setMetal)
  const setStone = useConfigStore((s) => s.setStone)
  const cartCount = useConfigStore((s) => s.cartCount)
  const setCartOpen = useConfigStore((s) => s.setCartOpen)

  const searchParams = useSearchParams()
  useEffect(() => {
    const m = searchParams.get('metal')
    const s = searchParams.get('stone')
    if (m && METAL_CONFIGS[m]) setMetal(m)
    if (s && STONE_CONFIGS[s]) setStone(s)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--dark)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '18px 32px',
        borderBottom: '1px solid #161616',
        flexShrink: 0,
        background: '#0a0a0a',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/select" data-cursor-hover style={{
            fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)',
            textTransform: 'uppercase', fontFamily: 'var(--font-body)', textDecoration: 'none', transition: 'color 0.3s ease',
            display: 'flex', alignItems: 'center', gap: 7,
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <span style={{ color: 'var(--gold)', opacity: 0.7, fontSize: 13 }}>←</span> Back
          </Link>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            Aurelia — Twist Ring
          </div>
        </div>
        <button data-cursor-hover onClick={() => setCartOpen(true)} style={{
          background: 'none', border: '1px solid #1e1e1e', color: 'var(--text-secondary)',
          fontSize: 11, letterSpacing: '0.12em', fontFamily: 'var(--font-body)',
          padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8,
          transition: 'border-color 0.3s ease, color 0.3s ease',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.color = 'var(--gold)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          Cart
          {cartCount > 0 && (
            <span style={{
              background: 'var(--gold)', color: '#0a0a0a', borderRadius: '50%',
              width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500,
            }}>
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <StonePicker />
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <RingScene onReady={() => setIsLoaded(true)} />
          <MetalPicker />
        </div>
        <div style={{
          width: 300, flexShrink: 0, borderLeft: '1px solid #181818',
          padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32,
          overflowY: 'auto', position: 'relative',
        }}>
          {/* Grain texture overlay */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
            backgroundImage: NOISE_URL, backgroundRepeat: 'repeat', backgroundSize: '180px 180px',
            opacity: 0.04,
          }} />

          <motion.div {...panelItem(0, isLoaded)}>
            <div style={{
              fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-secondary)',
              textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: 8,
              borderLeft: '2px solid rgba(201,168,76,0.45)', paddingLeft: 8,
            }}>
              Your Configuration
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 300, color: 'var(--text-primary)', marginBottom: 4 }}>
              {METAL_CONFIGS[metal]?.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              {STONE_CONFIGS[stone]?.label} Diamond
            </div>
          </motion.div>

          <motion.div {...panelItem(0.08, isLoaded)}><div className="rule-gold" /></motion.div>

          <motion.div {...panelItem(0.16, isLoaded)}><PriceDisplay /></motion.div>

          <motion.div {...panelItem(0.24, isLoaded)}><div className="rule-gold" /></motion.div>

          <motion.div {...panelItem(0.32, isLoaded)}><AddToCart /></motion.div>

          <motion.div {...panelItem(0.40, isLoaded)} style={{ marginTop: 'auto', paddingTop: 16 }}>
            {['30-day returns', 'Lifetime resizing', 'Certificate of authenticity', 'Free insured shipping'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: 'rgba(201,168,76,0.6)', fontSize: 10, flexShrink: 0, lineHeight: 1 }}>—</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <CartDrawer />
      <RingLoader isLoaded={isLoaded} />
    </div>
  )
}
