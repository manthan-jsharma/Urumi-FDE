'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'
import { STONE_CONFIGS } from '@/lib/materials'
import { useConfigStore } from '@/lib/store'
import { StoneThumb, StoneGeometry, Crystal } from '@/components/three/StoneThumb'
import { LightTentEnvironment } from '@/components/three/LightTentEnvironment'

const NOISE_URL = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='grain'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23grain)'/></svg>")`

// 7 crystals sized for the 210×180 preview popup canvas
const CRYSTAL_CONFIG = [
  { x: -1.4, y:  0.6, z: -1.8, s: 0.055, rs: 0.55, fp: 0.00 },
  { x:  1.5, y:  0.3, z: -2.0, s: 0.040, rs: 0.80, fp: 1.10 },
  { x: -0.8, y: -0.8, z: -2.2, s: 0.070, rs: 0.45, fp: 2.20 },
  { x:  0.9, y:  0.9, z: -2.5, s: 0.035, rs: 1.00, fp: 0.80 },
  { x:  1.8, y: -0.5, z: -1.6, s: 0.050, rs: 0.65, fp: 1.70 },
  { x: -1.7, y: -0.3, z: -2.3, s: 0.045, rs: 0.90, fp: 3.00 },
  { x:  0.3, y:  1.1, z: -2.8, s: 0.030, rs: 0.70, fp: 0.50 },
]

const SHAPES_3D   = ['round', 'princess', 'cushion', 'marquise', 'oval', 'pear'] as const
const SHAPES_FLAT = ['emerald', 'radiant', 'asscher', 'heart'] as const

function ThrottledPreviewLoop() {
  const { invalidate } = useThree()
  useEffect(() => {
    const id = setInterval(invalidate, 50)
    return () => clearInterval(id)
  }, [invalidate])
  return null
}

function RotatingPreviewStone({ shape }: { shape: string }) {
  const ref = useRef<any>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.5
  })
  return <group ref={ref}><StoneGeometry shape={shape as any} /></group>
}

// ── Floating 3D preview frame ─────────────────────────────────────────────────
function StonePreview({ shape, y, visible }: { shape: string; y: number; visible: boolean }) {
  const label = STONE_CONFIGS[shape]?.label ?? shape

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: 292,
        top: y,
        transform: 'translateY(-50%)',
        width: 210,
        background: 'rgba(4, 14, 8, 0.90)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(60, 140, 85, 0.22)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(100,200,130,0.06)',
        zIndex: 200,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Gold corner accents */}
      {[
        { top: 0, left: 0, borderTop: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)' },
        { top: 0, right: 0, borderTop: '1px solid var(--gold)', borderRight: '1px solid var(--gold)' },
        { bottom: 0, left: 0, borderBottom: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)' },
        { bottom: 0, right: 0, borderBottom: '1px solid var(--gold)', borderRight: '1px solid var(--gold)' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 10, height: 10, ...s, zIndex: 2 }} />
      ))}

      {/* 3D canvas */}
      <div style={{
        width: '100%', height: 180, position: 'relative',
        background: 'linear-gradient(145deg, rgba(22,72,40,0.52) 0%, rgba(6,28,14,0.72) 100%)',
      }}>
        {/* Inner glass highlight — top-left shimmer */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: 'radial-gradient(ellipse at 25% 15%, rgba(140,230,170,0.10) 0%, transparent 55%)',
        }} />
        <Canvas
          camera={{ position: [0, 0.3, 2.4], fov: 40 }}
          gl={{ antialias: true, alpha: true, toneMapping: 4, toneMappingExposure: 1.0 }}
          style={{ background: 'transparent' }}
          frameloop="demand"
          dpr={1}
        >
          <Suspense fallback={null}>
            <ThrottledPreviewLoop />
            <LightTentEnvironment transparent={true} />
            <spotLight position={[2, 5, 2.5]}     intensity={14} angle={0.13} penumbra={0.04} color="#ffffff" />
            <spotLight position={[-2.5, 3.5, 1.5]} intensity={10} angle={0.16} penumbra={0.06} color="#ffffff" />
            <spotLight position={[0.3, 7, 0.5]}   intensity={12} angle={0.11} penumbra={0.03} color="#ffffff" />
            <spotLight position={[0, 1, 4]}         intensity={8}  angle={0.18} penumbra={0.06} color="#ffffff" />
            <ambientLight intensity={0.06} />
            {CRYSTAL_CONFIG.map((c, i) => <Crystal key={i} {...c} />)}
            <RotatingPreviewStone shape={shape} />
          </Suspense>
        </Canvas>
      </div>

      {/* Label */}
      <div style={{
        borderTop: '1px solid rgba(80,180,110,0.12)',
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

  const [hoveredStone,  setHoveredStone]  = useState<string | null>(null)
  const [hoverY,        setHoverY]        = useState(0)
  const [moreOpen,      setMoreOpen]      = useState(false)

  // Persistent preview state — canvas stays mounted after first hover so the
  // GL context (and cached PMREMGenerator result) survives between hover events.
  const [previewMounted, setPreviewMounted] = useState(false)
  const [previewShape,   setPreviewShape]   = useState<string>('round')
  const [previewY,       setPreviewY]       = useState(0)

  function onEnter(shape: string, y: number) {
    setPreviewShape(shape)
    setPreviewY(y)
    setHoveredStone(shape)
    setHoverY(y)
    if (!previewMounted) setPreviewMounted(true)
  }

  function onLeave() { setHoveredStone(null) }

  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderRight: '1px solid #181818',
      padding: '32px 24px',
      overflowY: 'auto',
      height: '100%',
      position: 'relative',
    }}>
      {/* Grain texture overlay */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        backgroundImage: NOISE_URL, backgroundRepeat: 'repeat', backgroundSize: '180px 180px',
        opacity: 0.04,
      }} />

      <div style={{
        fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-secondary)',
        textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: 24,
        borderLeft: '2px solid rgba(201,168,76,0.45)', paddingLeft: 8,
      }}>
        Shape
      </div>

      {/* 3D stone thumbnails — staggered delay staggers PMREM generation across 6 GL contexts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12, marginBottom: 16 }}>
        {SHAPES_3D.map((shape, i) => (
          <div
            key={shape}
            onMouseEnter={e => onEnter(shape, e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)}
            onMouseLeave={onLeave}
          >
            <StoneThumb
              shape={shape}
              selected={currentStone === shape}
              label={STONE_CONFIGS[shape].label}
              onClick={() => setStone(shape)}
              delay={i * 80}
            />
          </div>
        ))}
      </div>

      {/* More Stones toggle */}
      <button
        data-cursor-hover
        onClick={() => setMoreOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: '1px solid #222',
          padding: '7px 12px', width: '100%',
          color: moreOpen ? 'var(--gold)' : 'var(--text-secondary)',
          fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
          fontFamily: 'var(--font-body)', transition: 'color 0.2s, border-color 0.2s',
          marginTop: 4,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'var(--gold)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.color = moreOpen ? 'var(--gold)' : 'var(--text-secondary)' }}
      >
        <motion.span
          animate={{ rotate: moreOpen ? 45 : 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'block', fontSize: 14, lineHeight: 1, color: 'rgba(201,168,76,0.6)' }}
        >
          +
        </motion.span>
        {moreOpen ? 'Less Stones' : 'More Stones'}
      </button>

      {/* Flat stone thumbnails — revealed on toggle */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12, paddingTop: 14 }}>
              {SHAPES_FLAT.map((shape) => (
                <FlatStoneThumb
                  key={shape}
                  shape={shape}
                  selected={currentStone === shape}
                  label={STONE_CONFIGS[shape].label}
                  onClick={() => setStone(shape)}
                  onMouseEnter={(y) => onEnter(shape, y)}
                  onMouseLeave={onLeave}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating 3D preview — canvas stays mounted after first hover to preserve the
          GL context and reuse the cached PMREMGenerator result on every subsequent hover */}
      {previewMounted && (
        <StonePreview shape={previewShape} y={previewY} visible={!!hoveredStone} />
      )}

    </div>
  )
}
