'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useConfigStore } from '@/lib/store'

export function CartDrawer() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const cartOpen = useConfigStore((s) => s.cartOpen)
  const cartItems = useConfigStore((s) => s.cartItems)
  const setCartOpen = useConfigStore((s) => s.setCartOpen)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCartOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCartOpen])

  if (!mounted) return null

  const portalRoot = document.getElementById('portal-root')
  if (!portalRoot) return null

  return createPortal(
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setCartOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 900,
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(420px, 90vw)',
              background: '#0e0e0e',
              borderLeft: '1px solid #1a1a1a',
              zIndex: 901,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '32px 32px 24px',
              borderBottom: '1px solid #1a1a1a',
            }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 22,
                fontWeight: 300,
                letterSpacing: '0.06em',
                color: 'var(--text-primary)',
              }}>
                Your Ring
              </span>
              <button
                onClick={() => setCartOpen(false)}
                data-cursor-hover
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              {cartItems.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>
                  Your cart is empty.
                </p>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '20px 0',
                      borderBottom: '1px solid #1a1a1a',
                    }}
                  >
                    <div style={{
                      fontSize: 11,
                      letterSpacing: '0.15em',
                      color: 'var(--gold)',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}>
                      Aurelia Twist Ring
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 18,
                      fontWeight: 300,
                      color: 'var(--text-primary)',
                      marginBottom: 4,
                    }}>
                      {item.metalLabel}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      marginBottom: 12,
                    }}>
                      {item.stoneLabel} Diamond
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 22,
                      fontWeight: 400,
                      color: 'var(--text-primary)',
                    }}>
                      ${item.price.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div style={{ padding: '24px 32px', borderTop: '1px solid #1a1a1a' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 24,
                }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Total
                  </span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 300 }}>
                    ${cartItems.reduce((s, i) => s + i.price, 0).toLocaleString()}
                  </span>
                </div>
                <a
                  href={`${process.env.NEXT_PUBLIC_WC_URL || 'http://localhost:8181'}/checkout`}
                  data-cursor-hover
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px 24px',
                    background: 'none',
                    border: '1px solid var(--gold-border)',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    fontSize: 11,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    transition: 'background 0.3s ease, color 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--gold)'
                    ;(e.currentTarget as HTMLAnchorElement).style.color = '#0a0a0a'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLAnchorElement).style.background = 'none'
                    ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'
                  }}
                >
                  Proceed to Checkout
                </a>
                <p style={{
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 12,
                  letterSpacing: '0.05em',
                }}>
                  Free shipping · Resize for life
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    portalRoot
  )
}
