'use client'

import { useState, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { RingMesh } from '@/components/three/RingMesh'
import { useNavigate as usePageNavigate } from '@/components/ui/PageTransition'
import Link from 'next/link'

const RING_STYLES = [
  {
    id: 'twist',
    name: 'Twist Ring',
    ghost: 'TWIST RING',
    variants: ['Pavé Band', 'Plain Band'],
    stones:   ['round', 'oval'],        // stone shape per variant
    metal: '14k-yellow',
  },
  {
    id: 'solitaire',
    name: 'Classic Solitaire',
    ghost: 'SOLITAIRE',
    variants: ['Thin Band', 'Cathedral Band'],
    stones:   ['round', 'princess'],
    metal: '14k-white',
  },
  {
    id: 'halo',
    name: 'Hidden Halo',
    ghost: 'HIDDEN HALO',
    variants: ['Round Halo', 'Cushion Halo'],
    stones:   ['cushion', 'oval'],
    metal: '18k-rose',
  },
]

export function RingSelector() {
  const goToPage  = usePageNavigate()
  const [index,   setIndex]   = useState(0)
  const [variant, setVariant] = useState(0)
  const [visible, setVisible] = useState(true)
  const ringWrapRef           = useRef<HTMLDivElement>(null)

  const current = RING_STYLES[index]

  function navigate(dir: 1 | -1) {
    setVisible(false)
    setTimeout(() => {
      setIndex(i => (i + dir + RING_STYLES.length) % RING_STYLES.length)
      setVariant(0)
      setVisible(true)
    }, 300)
  }

  function handleConfigure() {
    const stone = current.stones[variant]
    const metal = current.metal
    gsap.to(ringWrapRef.current, {
      scale: 1.04,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => goToPage(`/configure?metal=${metal}&stone=${stone}`),
    })
  }

  const particles = Array.from({ length: 160 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.3,
    duration: Math.random() * 8 + 4,
    delay: Math.random() * 6,
    opacity: Math.random() * 0.5 + 0.15,
  }))

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>

      {/* Particles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: `rgba(201, 168, 76, ${p.opacity})`,
            animation: `particleFloat ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
          }} />
        ))}
        <style>{`@keyframes particleFloat { from { transform: translateY(0px); opacity: 0.2; } to { transform: translateY(-18px); opacity: 0.8; } }`}</style>
      </div>

      {/* ── Floating back + counter ─────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 48px', zIndex: 30,
        pointerEvents: 'none',
      }}>
        <Link href="/" data-cursor-hover style={{
          fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-muted)',
          textTransform: 'uppercase', fontFamily: 'var(--font-body)',
          textDecoration: 'none', transition: 'color 0.3s ease',
          pointerEvents: 'all',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Back
        </Link>
        <div style={{
          fontSize: 11, letterSpacing: '0.22em', color: '#333',
          fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums',
        }}>
          {String(index + 1).padStart(2, '0')} / {String(RING_STYLES.length).padStart(2, '0')}
        </div>
      </div>

      {/* ── Heading — top-left, in flow ─────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        paddingTop: 88,
        paddingLeft: 48,
        paddingBottom: 0,
        zIndex: 10,
      }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(20px, 2vw, 30px)',
          fontWeight: 700,
          color: 'rgba(201, 168, 76, 0.55)',
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
        }}>
          Choose it.<br />
          Personalise it.<br />
          Own it.
        </div>
      </div>

      {/* ── Ghost label — sits high in the ring zone, ring overlaps from below.
           top:32vh from viewport top → stone of ring sits just above text,
           ring body/band overlaps through the letters. RE "BULLET 650" pattern. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.ghost}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            top: '20vh',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-body)',
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#888888',
            opacity: 0.1,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {current.ghost}
        </motion.div>
      </AnimatePresence>

      {/* ── Middle — ring centered, z:5 overlaps ghost text above ───── */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>

        {/* Ring canvas */}
        <motion.div
          ref={ringWrapRef}
          key={current.id}
          animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.97 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            /* Square canvas — ring visually occupies ~65% of each side.
               Width in vh keeps it proportional regardless of viewport. */
            width: '56vh',
            height: '60vh',
            flexShrink: 0,
            zIndex: 5,
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 46%, transparent 36%, rgba(10,10,10,0.55) 100%)',
          }} />
          <Canvas
            camera={{ position: [0, 0.2, 3.8], fov: 38 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <Environment preset="studio" />
              <RingMesh autoRotate metalKey={current.metal} stoneKey={current.stones[variant]} />
              <ContactShadows position={[0, -1.2, 0]} opacity={0.3} blur={2.5} scale={4} />
            </Suspense>
          </Canvas>
        </motion.div>

      </div>

      {/* ── Controls — in flow directly below ring ───────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + '-controls'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            paddingTop: 2,
            paddingBottom: 40,
            zIndex: 20,
          }}
        >

          {/* Row 1: › › | Name ∨ | ‹ ‹ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <button
              data-cursor-hover
              onClick={() => navigate(-1)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(201,168,76,0.38)',
                fontSize: 13, letterSpacing: '0.15em',
                padding: '8px 14px', lineHeight: 1,
                fontFamily: 'var(--font-body)',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.38)')}
            >
              › ›
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}>
              {current.name}
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.38, flexShrink: 0 }}>
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <button
              data-cursor-hover
              onClick={() => navigate(1)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(201,168,76,0.38)',
                fontSize: 13, letterSpacing: '0.15em',
                padding: '8px 14px', lineHeight: 1,
                fontFamily: 'var(--font-body)',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.38)')}
            >
              ‹ ‹
            </button>
          </div>

          {/* Row 2: Variant chips — rectangular, RE-style */}
          <div style={{ display: 'flex', gap: 8 }}>
            {current.variants.map((v, i) => (
              <button
                key={v}
                data-cursor-hover
                onClick={() => setVariant(i)}
                style={{
                  minWidth: 160,
                  padding: '11px 24px',
                  border: variant === i
                    ? '1px solid rgba(201,168,76,0.5)'
                    : '1px solid #282828',
                  background: variant === i ? '#1c1914' : '#111111',
                  color: variant === i ? 'var(--gold)' : '#888',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-body)',
                  fontWeight: variant === i ? 500 : 400,
                  transition: 'all 0.22s ease',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
                onMouseEnter={e => {
                  if (variant !== i) {
                    e.currentTarget.style.borderColor = '#383838'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.background = '#161616'
                  }
                }}
                onMouseLeave={e => {
                  if (variant !== i) {
                    e.currentTarget.style.borderColor = '#282828'
                    e.currentTarget.style.color = '#888'
                    e.currentTarget.style.background = '#111111'
                  }
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Row 3: Wide CTA */}
          <button
            data-cursor-hover
            onClick={handleConfigure}
            style={{
              width: 360,
              padding: '14px 0',
              border: '1px solid #252014',
              background: '#0f0d08',
              color: 'var(--gold)',
              fontSize: 11,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              transition: 'background 0.28s ease, color 0.28s ease, border-color 0.28s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--gold)'
              e.currentTarget.style.color = '#0a0a0a'
              e.currentTarget.style.borderColor = 'var(--gold)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#0f0d08'
              e.currentTarget.style.color = 'var(--gold)'
              e.currentTarget.style.borderColor = '#252014'
            }}
          >
            Configure Now →
          </button>

        </motion.div>
      </AnimatePresence>

    </div>
  )
}
