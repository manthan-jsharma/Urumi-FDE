'use client'

import { createContext, useContext, useRef, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import gsap from 'gsap'

interface TransitionCtx {
  navigate: (href: string) => void
}

const Ctx = createContext<TransitionCtx>({ navigate: () => {} })

export function useNavigate() {
  return useContext(Ctx).navigate
}

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const overlayRef  = useRef<HTMLDivElement>(null)
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const lineRef     = useRef<HTMLDivElement>(null)
  const router      = useRouter()
  const pathname    = usePathname()
  const firstMount  = useRef(true)

  // When pathname changes — new page has mounted — fade overlay out
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false
      return
    }
    const o = overlayRef.current
    const w = wordmarkRef.current
    const l = lineRef.current
    if (!o) return

    gsap.timeline()
      .to([w, l], { opacity: 0, y: -10, duration: 0.28, ease: 'power2.in', stagger: 0.05 })
      .to(o, {
        opacity: 0, duration: 0.5, ease: 'power2.out',
        onComplete: () => { o.style.pointerEvents = 'none' },
      }, '-=0.08')
  }, [pathname])

  const navigate = useCallback((href: string) => {
    const o = overlayRef.current
    const w = wordmarkRef.current
    const l = lineRef.current
    if (!o) { router.push(href); return }

    o.style.pointerEvents = 'all'
    gsap.timeline()
      .set([w, l], { opacity: 0, y: 14 })
      .to(o, { opacity: 1, duration: 0.38, ease: 'power2.in' })
      .to([w, l], {
        opacity: 1, y: 0,
        duration: 0.45, ease: 'power3.out', stagger: 0.06,
      }, '-=0.12')
      .add(() => router.push(href), '+=0.18')
  }, [router])

  return (
    <Ctx.Provider value={{ navigate }}>
      {children}

      {/* Page transition overlay */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed', inset: 0,
          background: '#0a0a0a',
          zIndex: 9998,
          opacity: 0,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div ref={wordmarkRef} style={{ opacity: 0 }}>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 26,
            fontWeight: 300,
            letterSpacing: '0.36em',
            color: 'rgba(201, 168, 76, 0.88)',
            textTransform: 'uppercase',
          }}>
            Aurelia
          </span>
        </div>
        <div ref={lineRef} style={{ opacity: 0 }}>
          <div style={{
            width: 72,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.55), transparent)',
          }} />
        </div>
      </div>
    </Ctx.Provider>
  )
}
