'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import Link from 'next/link'
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

function RingScene() {
  const metal = useConfigStore((s) => s.metal)
  const stone = useConfigStore((s) => s.stone)
  const showCallout = useConfigStore((s) => s.showCallout)
  const userInteracting = useConfigStore((s) => s.userInteracting)
  const setUserInteracting = useConfigStore((s) => s.setUserInteracting)
  const setShowCallout = useConfigStore((s) => s.setShowCallout)

  return (
    <Canvas
      camera={{ position: [0, 0.5, 3.5], fov: 40 }}
      gl={{ antialias: true, alpha: false, toneMapping: 4 }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#0d0d0d']} />
      <Suspense fallback={null}>
        <LightTentEnvironment />
        <spotLight position={[5, 8, 3]} intensity={2.5} angle={0.35} penumbra={0.8} castShadow shadow-mapSize={[1024, 1024]} />
        <ambientLight intensity={0.12} />
        <RingMesh metalKey={metal} stoneKey={stone} autoRotate={!userInteracting} />
        <Pedestal />
        <ContactShadows position={[0, -0.92, 0]} opacity={0.5} scale={2.8} blur={2} far={1.0} />
        <FloatingCallout metal={metal} stone={stone} visible={showCallout} />
        <PostFX vignette={0.5} bloom dofFocusDistance={3.5} dofFocusRange={1.2} dofBokeh={0.5} dof />
      </Suspense>
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
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
  const metal = useConfigStore((s) => s.metal)
  const stone = useConfigStore((s) => s.stone)
  const cartCount = useConfigStore((s) => s.cartCount)
  const setCartOpen = useConfigStore((s) => s.setCartOpen)

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
            fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-muted)',
            textTransform: 'uppercase', fontFamily: 'var(--font-body)', textDecoration: 'none', transition: 'color 0.3s ease',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ← Back
          </Link>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
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
          <RingScene />
          <MetalPicker />
        </div>
        <div style={{
          width: 300, flexShrink: 0, borderLeft: '1px solid #181818',
          padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32, overflowY: 'auto',
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: 8 }}>
              Your Configuration
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 300, color: 'var(--text-primary)', marginBottom: 4 }}>
              {METAL_CONFIGS[metal]?.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              {STONE_CONFIGS[stone]?.label} Diamond
            </div>
          </div>
          <div className="rule-gold" />
          <PriceDisplay />
          <div className="rule-gold" />
          <AddToCart />
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            {['30-day returns', 'Lifetime resizing', 'Certificate of authenticity', 'Free insured shipping'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gold)', opacity: 0.6, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CartDrawer />
    </div>
  )
}
