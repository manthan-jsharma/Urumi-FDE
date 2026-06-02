'use client'

import { Html } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { METAL_CONFIGS, STONE_CONFIGS } from '@/lib/materials'

interface FloatingCalloutProps {
  metal: string
  stone: string
  visible: boolean
}

export function FloatingCallout({ metal, stone, visible }: FloatingCalloutProps) {
  return (
    <Html position={[1.1, 0.6, 0]} distanceFactor={3.5} style={{ pointerEvents: 'none' }}>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'rgba(8, 8, 8, 0.92)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(201, 168, 76, 0.28)',
              padding: '10px 16px',
              whiteSpace: 'nowrap',
              minWidth: 140,
            }}
          >
            {/* Connector line */}
            <div style={{
              position: 'absolute',
              left: -28,
              top: '50%',
              width: 24,
              height: 1,
              background: 'rgba(201, 168, 76, 0.3)',
            }} />
            <div style={{
              position: 'absolute',
              left: -32,
              top: '50%',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--gold)',
              transform: 'translateY(-50%)',
              opacity: 0.7,
            }} />

            <div style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
              marginBottom: 4,
              fontFamily: 'var(--font-body)',
            }}>
              {METAL_CONFIGS[metal]?.label ?? metal}
            </div>
            <div style={{
              fontSize: 12,
              color: '#e0ddd8',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.04em',
            }}>
              {STONE_CONFIGS[stone]?.label ?? stone} Diamond
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Html>
  )
}
