'use client'

import { useSpring, animated } from '@react-spring/web'
import { useConfigStore } from '@/lib/store'
import { usePrice } from '@/hooks/usePrice'

export function PriceDisplay() {
  usePrice()

  const price = useConfigStore((s) => s.price)
  const loading = useConfigStore((s) => s.priceLoading)
  const metal = useConfigStore((s) => s.metal)
  const stone = useConfigStore((s) => s.stone)

  const spring = useSpring({
    val: price ?? 0,
    config: { mass: 1, tension: 180, friction: 30 },
  })

  return (
    <div>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'rgba(201,168,76,0.7)',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-body)',
        marginBottom: 8,
      }}>
        {loading ? 'Updating…' : 'Starting from'}
      </div>

      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 48,
        fontWeight: 300,
        color: 'var(--text-primary)',
        lineHeight: 1,
        marginBottom: 4,
        opacity: loading ? 0.5 : 1,
        transition: 'opacity 0.3s ease',
      }}>
        {price === null ? (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ) : (
          <animated.span>
            {spring.val.to((v) => `$${Math.round(v).toLocaleString()}`)}
          </animated.span>
        )}
      </div>

      <div style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.04em',
      }}>
        Setting only — Stone not included
      </div>
    </div>
  )
}
