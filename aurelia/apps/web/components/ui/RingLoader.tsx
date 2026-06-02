'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'

const CIRCUMFERENCE = 2 * Math.PI * 28   // r=28

export function RingLoader({ isLoaded }: { isLoaded: boolean }) {
  const overlayRef  = useRef<HTMLDivElement>(null)
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const lineRef     = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLDivElement>(null)
  const hasExited   = useRef(false)

  // Entry — staggered reveal
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.05 })

    tl.fromTo(wordmarkRef.current,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 0)

    tl.fromTo(lineRef.current,
      { scaleX: 0, opacity: 0 },
      { scaleX: 1, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.35)

    tl.fromTo(subtitleRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.85)
  }, [])

  // Exit — fires once after model loaded + minimum 1.4s display
  useEffect(() => {
    if (!isLoaded || hasExited.current) return
    hasExited.current = true

    const minDelay = setTimeout(() => {
      const o = overlayRef.current
      if (!o) return
      gsap.timeline()
        .to([subtitleRef.current, lineRef.current], {
          opacity: 0, y: -8,
          duration: 0.35, ease: 'power2.in', stagger: 0.05,
        })
        .to(wordmarkRef.current, {
          opacity: 0, y: -14,
          duration: 0.4, ease: 'power2.in',
        }, '-=0.15')
        .to(o, {
          opacity: 0, duration: 0.55, ease: 'power2.inOut',
          onComplete: () => { o.style.display = 'none' },
        }, '-=0.15')
    }, 1400)

    return () => clearTimeout(minDelay)
  }, [isLoaded])

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0,
        background: '#0a0a0a',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Animated SVG ring */}
      <svg
        width="76" height="76"
        viewBox="0 0 76 76"
        style={{ marginBottom: 36 }}
      >
        <defs>
          <filter id="loader-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Faint track */}
        <circle
          cx="38" cy="38" r="28"
          fill="none"
          stroke="rgba(201,168,76,0.07)"
          strokeWidth="1"
        />

        {/* Drawing arc */}
        <circle
          cx="38" cy="38" r="28"
          fill="none"
          stroke="rgba(201,168,76,0.72)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          filter="url(#loader-glow)"
          style={{
            transformOrigin: '38px 38px',
            transform: 'rotate(-90deg)',
            animation: 'loaderDraw 2s cubic-bezier(0.4,0,0.2,1) infinite',
          }}
        />

        {/* Center pulse dot */}
        <circle cx="38" cy="38" r="1.8" fill="rgba(201,168,76,0.45)">
          <animate
            attributeName="opacity"
            values="0.25;0.85;0.25"
            dur="2.2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="1.2;2.2;1.2"
            dur="2.2s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* Wordmark */}
      <div ref={wordmarkRef} style={{ opacity: 0, textAlign: 'center', marginBottom: 18 }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(20px, 2.8vw, 30px)',
          fontWeight: 300,
          letterSpacing: '0.40em',
          color: 'rgba(255,255,255,0.90)',
          textTransform: 'uppercase',
        }}>
          Aurelia
        </div>
      </div>

      {/* Gold separator */}
      <div
        ref={lineRef}
        style={{
          opacity: 0,
          transformOrigin: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{
          width: 56,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)',
        }} />
      </div>

      {/* Micro tagline */}
      <div ref={subtitleRef} style={{ opacity: 0 }}>
        <div style={{
          fontSize: 9,
          letterSpacing: '0.30em',
          color: 'rgba(255,255,255,0.22)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-body)',
        }}>
          Crafting your experience
        </div>
      </div>

      {/* Keyframe for the drawing arc — injected once */}
      <style>{`
        @keyframes loaderDraw {
          0%   { stroke-dashoffset: ${CIRCUMFERENCE}; }
          60%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -${CIRCUMFERENCE}; }
        }
      `}</style>
    </div>
  )
}
