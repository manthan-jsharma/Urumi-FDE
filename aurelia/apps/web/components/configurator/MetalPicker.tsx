'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { METAL_CONFIGS } from '@/lib/materials'
import { useConfigStore } from '@/lib/store'
import { MetalThumb } from '@/components/three/MetalThumb'

// ── Arc carousel ──────────────────────────────────────────────────────────────
// 3 rings float freely along an invisible arc. No clip shapes. A soft golden
// haze follows the curve to suggest depth. Center ring is prominent, flanking
// rings fade and shrink. Arrows cycle through all metals.

const RADIUS     = 155
const STEP_ANGLE = 54     // wide lateral spread
const ITEM_SIZE  = 88     // canvas size used for arc centering maths
const HALF       = ITEM_SIZE / 2
const MAX_SLOT   = 1      // center ± 1  →  3 visible at once

const metals = Object.entries(METAL_CONFIGS)
const N      = metals.length

const CONTAINER_W = 460
const CONTAINER_H = RADIUS + ITEM_SIZE + 60
const CX          = CONTAINER_W / 2
const CY          = CONTAINER_H   // arc centre at container bottom

// ── Arc path for the golden haze ─────────────────────────────────────────────
// Drawn between slot -1 and slot +1 positions, slightly extended.
const hazeAngle = (STEP_ANGLE + 10) * Math.PI / 180
const hLX = CX - Math.sin(hazeAngle) * RADIUS
const hLY = CY - Math.cos(hazeAngle) * RADIUS
const hRX = CX + Math.sin(hazeAngle) * RADIUS
const hRY = hLY
const HAZE_PATH = `M ${hLX.toFixed(1)},${hLY.toFixed(1)} A ${RADIUS},${RADIUS} 0 0 1 ${hRX.toFixed(1)},${hRY.toFixed(1)}`

function slotXY(slot: number) {
  const rad = slot * STEP_ANGLE * Math.PI / 180
  return {
    x:  Math.sin(rad) * RADIUS,
    y: -Math.cos(rad) * RADIUS,
  }
}

const OPA   = [1,    0.30]
const SCALE = [1.14, 0.68]

export function MetalPicker() {
  const setMetal = useConfigStore((s) => s.setMetal)

  const [centerIdx, setCenterIdx] = useState(
    () => Math.max(0, metals.findIndex(([k]) => k === useConfigStore.getState().metal))
  )
  const [hidden, setHidden] = useState(false)

  function navigate(dir: 1 | -1) {
    const next = (centerIdx + dir + N) % N
    setCenterIdx(next)
    setMetal(metals[next][0])
  }

  function pick(i: number) {
    setCenterIdx(i)
    setMetal(metals[i][0])
  }

  const selectedLabel = METAL_CONFIGS[metals[centerIdx]?.[0]]?.label ?? ''

  // Shared button JSX — extracted so toggle can live outside the arc container
  const toggleBtn = (
    <button
      data-cursor-hover
      onClick={() => setHidden(h => !h)}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'
        e.currentTarget.style.background  = 'rgba(20,16,10,0.95)'
        ;(e.currentTarget.querySelector('.toggle-label')   as HTMLElement).style.color = 'rgba(201,168,76,1.0)'
        ;(e.currentTarget.querySelector('.toggle-chevron') as HTMLElement).style.color = 'rgba(201,168,76,1.0)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.22)'
        e.currentTarget.style.background  = 'rgba(12,10,8,0.88)'
        ;(e.currentTarget.querySelector('.toggle-label')   as HTMLElement).style.color = 'rgba(201,168,76,0.80)'
        ;(e.currentTarget.querySelector('.toggle-chevron') as HTMLElement).style.color = 'rgba(201,168,76,0.80)'
      }}
      style={{
        position: 'absolute',
        bottom: 32,
        left: 20,
        zIndex: 20,
        background: 'rgba(12,10,8,0.88)',
        border: '1px solid rgba(201,168,76,0.22)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        padding: '7px 18px',
        transition: 'border-color 0.2s, background 0.2s',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: 0.5, flexShrink: 0 }}>
        <div style={{ width: 12, height: 1, background: 'var(--gold)' }} />
        <div style={{ width: 12, height: 1, background: 'var(--gold)' }} />
      </div>
      <span
        className="toggle-label"
        style={{
          fontSize: 9, letterSpacing: '0.22em', color: 'rgba(201,168,76,0.80)',
          textTransform: 'uppercase', fontFamily: 'var(--font-body)',
          transition: 'color 0.2s', whiteSpace: 'nowrap',
        }}
      >
        {hidden ? 'Show metals' : 'Hide metals'}
      </span>
      <motion.span
        className="toggle-chevron"
        animate={{ rotate: hidden ? 180 : 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'block', fontSize: 10,
          color: 'rgba(201,168,76,0.80)',
          lineHeight: 1, flexShrink: 0,
          transition: 'color 0.2s',
        }}
      >
        ∧
      </motion.span>
    </button>
  )

  return (
    <>
      {/* Toggle sits relative to the ring canvas (position:relative parent),
          completely outside the narrow arc container — truly left-of-screen */}
      {toggleBtn}

      {/* Arc container — centred at canvas bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: CONTAINER_W,
        height: CONTAINER_H,
        pointerEvents: 'none',
        zIndex: 10,
      }}>

      {/* Collapsible arc content — slides down into the bottom on hide */}
      <motion.div
        animate={{ opacity: hidden ? 0 : 1, y: hidden ? 64 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.6, 1] }}
        style={{ pointerEvents: hidden ? 'none' : 'inherit' }}
      >

        {/* Golden haze along the arc — blurred thick stroke */}
        <svg
          width={CONTAINER_W}
          height={CONTAINER_H}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          <defs>
            <filter id="arc-haze" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" />
            </filter>
          </defs>
          <path
            d={HAZE_PATH}
            fill="none"
            stroke="rgba(201,168,76,0.13)"
            strokeWidth="72"
            filter="url(#arc-haze)"
          />
          <path
            d={HAZE_PATH}
            fill="none"
            stroke="rgba(201,168,76,0.06)"
            strokeWidth="1"
            strokeDasharray="3 9"
          />
        </svg>

        {/* Floating ring items */}
        {metals.map(([key, config], i) => {
          let slot = i - centerIdx
          if (slot >  N / 2) slot -= N
          if (slot < -N / 2) slot += N

          const abs       = Math.abs(slot)
          const visible   = abs <= MAX_SLOT
          const { x, y }  = slotXY(slot)

          return (
            <motion.div
              key={key}
              animate={{
                x,
                y,
                opacity: visible ? OPA[abs]   ?? 0 : 0,
                scale:   visible ? SCALE[abs] ?? 0.4 : 0.4,
              }}
              transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                left: CX - HALF,
                top:  CY - HALF,
                pointerEvents: abs <= MAX_SLOT ? 'all' : 'none',
              }}
            >
              <MetalThumb
                metalKey={key}
                config={config}
                selected={i === centerIdx}
                onClick={() => pick(i)}
                showLabel={false}
                active={abs === 0}
              />
            </motion.div>
          )
        })}

        {/* ‹  Name  › */}
        <div style={{
          position: 'absolute',
          bottom: 14,
          left: 0, right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          pointerEvents: 'all',
        }}>
          <button
            data-cursor-hover
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(201,168,76,0.35)', fontSize: 20, lineHeight: 1,
              padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.35)')}
          >
            ‹
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{
              fontSize: 11, letterSpacing: '0.12em', color: 'var(--gold)',
              textTransform: 'uppercase', fontFamily: 'var(--font-body)',
              fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              {selectedLabel}
            </div>
          </div>

          <button
            data-cursor-hover
            onClick={() => navigate(1)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(201,168,76,0.35)', fontSize: 20, lineHeight: 1,
              padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.35)')}
          >
            ›
          </button>
        </div>

      </motion.div>

      </div>
    </>
  )
}
