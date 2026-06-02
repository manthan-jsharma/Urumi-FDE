'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useCart } from '@/hooks/useCart'

export function AddToCart() {
  const { handleAddToCart, adding, added } = useCart()
  const btnRef = useRef<HTMLButtonElement>(null)

  async function onClick() {
    // Celebration ring rotation is driven via store in the 3D scene
    await handleAddToCart()
  }

  const label = added ? 'Added ✓' : adding ? '' : 'Add to Cart'

  return (
    <div>
      <button
        ref={btnRef}
        data-cursor-hover
        onClick={onClick}
        disabled={adding}
        style={{
          width: '100%',
          padding: '15px 24px',
          border: '1px solid rgba(201, 168, 76, 0.4)',
          background: added ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
          color: added ? 'var(--gold)' : 'var(--text-primary)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-body)',
          transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
          borderColor: added ? 'var(--gold-border)' : 'rgba(201, 168, 76, 0.4)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!added && !adding) {
            e.currentTarget.style.background = 'var(--gold)'
            e.currentTarget.style.color = '#0a0a0a'
          }
        }}
        onMouseLeave={(e) => {
          if (!added && !adding) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-primary)'
          }
        }}
      >
        {adding ? (
          <span style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            border: '1px solid rgba(201, 168, 76, 0.5)',
            borderTopColor: 'var(--gold)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        ) : label}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        marginTop: 14,
      }}>
        {['Free shipping', 'Resize for life', 'Made to order'].map((item) => (
          <span key={item} style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-body)',
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
