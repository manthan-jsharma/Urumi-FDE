'use client'

import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { motion, AnimatePresence } from 'framer-motion'
import { STONE_CONFIGS } from '@/lib/materials'
import { useConfigStore } from '@/lib/store'
import { StoneThumb, StoneGeometry, DarkBackground } from '@/components/three/StoneThumb'
import { LightTentEnvironment } from '@/components/three/LightTentEnvironment'

const SHAPES_3D   = ['round', 'oval', 'princess', 'cushion', 'marquise', 'pear'] as const
const SHAPES_FLAT = ['emerald', 'radiant', 'asscher', 'heart'] as const

// ── Floating 3D preview frame ─────────────────────────────────────────────────
// Appears to the right of the picker on hover, shows a large spinning stone.
function StonePreview({ shape, y }: { shape: string; y: number }) {
  const label = STONE_CONFIGS[shape]?.label ?? shape

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: 292,
        top: y,
        transform: 'translateY(-50%)',
        width: 210,
        background: '#0a0a0a',
        border: '1px solid rgba(201, 168, 76, 0.22)',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      {/* Gold corner accents */}
      {[
        { top: 0, left: 0, borderTop: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)' },
        { top: 0, right: 0, borderTop: '1px solid var(--gold)', borderRight: '1px solid var(--gold)' },
        { bottom: 0, left: 0, borderBottom: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)' },
        { bottom: 0, right: 0, borderBottom: '1px solid var(--gold)', borderRight: '1px solid var(--gold)' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 10, height: 10, ...s }} />
      ))}

      {/* 3D canvas */}
      <div style={{ width: '100%', height: 180, background: 'transparent' }}>
        <Canvas
          camera={{ position: [0, 0.3, 2.4], fov: 40 }}
          gl={{ antialias: true, alpha: true, toneMapping: 4 }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <LightTentEnvironment transparent={false} />
            <DarkBackground color="#050e08" />
            <spotLight position={[2, 5, 2.5]} intensity={14} angle={0.13} penumbra={0.04} color="#ffffff" />
            <spotLight position={[-2.5, 3.5, 1.5]} intensity={10} angle={0.16} penumbra={0.06} color="#ffffff" />
            <spotLight position={[0.3, 7, 0.5]} intensity={12} angle={0.11} penumbra={0.03} color="#ffffff" />
            <spotLight position={[0, 1, 4]} intensity={8} angle={0.18} penumbra={0.06} color="#ffffff" />
            <ambientLight intensity={0.03} />
            <StoneGeometry shape={shape as any} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={6}
            />
            <EffectComposer>
              <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.05} intensity={0.6} mipmapBlur />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Label */}
      <div style={{
        borderTop: '1px solid #181818',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--gold)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-body)',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 9,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-body)',
        }}>
          Preview
        </span>
      </div>
    </motion.div>
  )
}

// ── Flat SVG stone outlines ───────────────────────────────────────────────────
function StoneSVG({ shape }: { shape: string }) {
  const paths: Record<string, React.ReactNode> = {
    emerald: (
      <svg width="36" height="44" viewBox="0 0 36 44">
        <polygon points="4,10 32,10 36,18 36,26 32,34 4,34 0,26 0,18" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.7" />
        <line x1="4" y1="10" x2="0" y2="18" stroke="#c9a84c" strokeWidth="0.5" opacity="0.4" />
        <line x1="32" y1="10" x2="36" y2="18" stroke="#c9a84c" strokeWidth="0.5" opacity="0.4" />
      </svg>
    ),
    radiant: (
      <svg width="38" height="40" viewBox="0 0 38 40">
        <polygon points="6,4 32,4 38,14 38,26 32,36 6,36 0,26 0,14" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.7" />
        <line x1="10" y1="4" x2="10" y2="36" stroke="#c9a84c" strokeWidth="0.4" opacity="0.3" />
        <line x1="28" y1="4" x2="28" y2="36" stroke="#c9a84c" strokeWidth="0.4" opacity="0.3" />
      </svg>
    ),
    asscher: (
      <svg width="40" height="40" viewBox="0 0 40 40">
        <rect x="6" y="6" width="28" height="28" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.7" />
        <rect x="10" y="10" width="20" height="20" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.35" />
        <line x1="6" y1="6" x2="10" y2="10" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
        <line x1="34" y1="6" x2="30" y2="10" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
        <line x1="6" y1="34" x2="10" y2="30" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
        <line x1="34" y1="34" x2="30" y2="30" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
      </svg>
    ),
    heart: (
      <svg width="40" height="38" viewBox="0 0 40 38">
        <path d="M20,36 C20,36 2,24 2,12 C2,6 7,2 13,2 C16,2 19,4 20,6 C21,4 24,2 27,2 C33,2 38,6 38,12 C38,24 20,36 20,36 Z" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.7" />
      </svg>
    ),
  }
  return paths[shape] ?? null
}

function FlatStoneThumb({
  shape, selected, label, onClick, onMouseEnter, onMouseLeave,
}: {
  shape: string; selected: boolean; label: string
  onClick: () => void; onMouseEnter: (y: number) => void; onMouseLeave: () => void
}) {
  return (
    <button
      onClick={onClick}
      data-cursor-hover
      onMouseEnter={e => onMouseEnter(e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)}
      onMouseLeave={onMouseLeave}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0 }}
    >
      <div style={{
        width: 72, height: 72,
        border: selected ? '1.5px solid var(--gold)' : '1px solid #2a2a2a',
        borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0d0d0d',
        transition: 'border-color 0.3s ease',
        boxShadow: selected ? '0 0 12px rgba(201, 168, 76, 0.15)' : 'none',
      }}>
        <StoneSVG shape={shape} />
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

export function StonePicker() {
  const currentStone = useConfigStore((s) => s.stone)
  const setStone     = useConfigStore((s) => s.setStone)

  const [hoveredStone, setHoveredStone] = useState<string | null>(null)
  const [hoverY,       setHoverY]       = useState(0)

  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderRight: '1px solid #181818',
      padding: '32px 24px',
      overflowY: 'auto',
      height: '100%',
      position: 'relative',
    }}>

      <div style={{
        fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-secondary)',
        textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: 24,
        borderLeft: '2px solid rgba(201,168,76,0.45)', paddingLeft: 8,
      }}>
        Shape
      </div>

      {/* 3D stone thumbnails */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12, marginBottom: 16 }}>
        {SHAPES_3D.map((shape) => (
          <div
            key={shape}
            onMouseEnter={e => {
              setHoveredStone(shape)
              setHoverY(e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)
            }}
            onMouseLeave={() => setHoveredStone(null)}
          >
            <StoneThumb
              shape={shape}
              selected={currentStone === shape}
              label={STONE_CONFIGS[shape].label}
              onClick={() => setStone(shape)}
            />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#181818', margin: '16px 0' }} />

      {/* Flat stone thumbnails */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12 }}>
        {SHAPES_FLAT.map((shape) => (
          <FlatStoneThumb
            key={shape}
            shape={shape}
            selected={currentStone === shape}
            label={STONE_CONFIGS[shape].label}
            onClick={() => setStone(shape)}
            onMouseEnter={(y) => { setHoveredStone(shape); setHoverY(y) }}
            onMouseLeave={() => setHoveredStone(null)}
          />
        ))}
      </div>

      {/* Floating 3D preview — portal-like, fixed to viewport */}
      <AnimatePresence>
        {hoveredStone && <StonePreview shape={hoveredStone} y={hoverY} />}
      </AnimatePresence>

    </div>
  )
}
