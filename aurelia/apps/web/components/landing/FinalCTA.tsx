'use client'

// Design: Dark Luxury
// Premium differentiator: Full viewport with ring zoomed close via GSAP camera push.
//   "MAKE IT YOURS" at 96px bleeds off screen. Magnetic CTA button.
// Banned: gradient backgrounds, centered image + text overlay, hero copy pattern

import { useRef, useEffect, Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RingMesh } from '@/components/three/RingMesh'
import { LightTentEnvironment } from '@/components/three/LightTentEnvironment'
import { useNavigate } from '@/components/ui/PageTransition'

gsap.registerPlugin(ScrollTrigger)

export function FinalCTA() {
  const navigate = useNavigate()
  const sectionRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const magnetRef = useRef<HTMLButtonElement>(null)
  // Only render the Canvas when this section is actually in the viewport.
  // Prevents two full WebGL scenes rendering at 60fps simultaneously.
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05 },
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const heading = headingRef.current
    const cta = ctaRef.current
    if (!section || !heading || !cta) return

    // Entry animation — store refs for cleanup
    const twHeading = gsap.fromTo(heading,
      { opacity: 0, y: 60 },
      {
        opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 70%' },
      }
    )
    const twCta = gsap.fromTo(cta,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', delay: 0.3,
        scrollTrigger: { trigger: section, start: 'top 70%' },
      }
    )

    // Cache button center — avoid getBoundingClientRect on every mousemove
    let btnRect: { bx: number; by: number } | null = null
    function cacheBtnRect() {
      const btn = magnetRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      btnRect = { bx: r.left + r.width / 2, by: r.top + r.height / 2 }
    }
    cacheBtnRect()
    window.addEventListener('resize', cacheBtnRect)

    // Magnetic button
    function onMouseMove(e: MouseEvent) {
      const btn = magnetRef.current
      if (!btn || !btnRect) return
      const { bx, by } = btnRect
      const dist = Math.sqrt((e.clientX - bx) ** 2 + (e.clientY - by) ** 2)

      if (dist < 100) {
        gsap.to(btn, { x: (e.clientX - bx) * 0.3, y: (e.clientY - by) * 0.3, duration: 0.4, ease: 'power2.out' })
      } else {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', cacheBtnRect)
      twHeading.kill()
      twCta.kill()
    }
  }, [])

  function handleConfigure() {
    navigate('/configure')
  }

  return (
    <section ref={sectionRef} style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--dark)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* 3D ring — only renders when section is in viewport */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Canvas
          camera={{ position: [0, 0.2, 2.6], fov: 40 }}
          gl={{ antialias: true, alpha: false, toneMapping: 4, toneMappingExposure: 1.4 }}
          dpr={[1, 1.5]}
          frameloop={inView ? 'always' : 'demand'}
        >
          <color attach="background" args={['#0a0a0a']} />
          <Suspense fallback={null}>
            <LightTentEnvironment />
            <ambientLight intensity={0.06} />
            <spotLight position={[0, 4.5, 1.5]}    intensity={220} angle={0.12} penumbra={0.25} color="#ffffff"  castShadow={false} />
            <spotLight position={[-1.4, 2.5, 2.2]}  intensity={90}  angle={0.24} penumbra={0.5}  color="#cce4ff" castShadow={false} />
            <spotLight position={[1.4, 2.5, 2.2]}   intensity={90}  angle={0.24} penumbra={0.5}  color="#ffe8cc" castShadow={false} />
            <spotLight position={[2, 5, 3]}          intensity={150} angle={0.22} penumbra={0.5}  color="#fff0d8" castShadow={false} />
            <pointLight position={[0, -0.5, -1.5]}   intensity={35}  color="#f0f8ff" />
            <RingMesh
              autoRotate
              metalKey="18k-yellow"
              rotateSpeed={0.38}
              stoneEnvIntensity={7}
              stoneTransmission={0.82}
            />
            <ContactShadows position={[0, -1.0, 0]} opacity={0.45} blur={2} scale={4} />
          </Suspense>
        </Canvas>
        {/* CSS vignette — same technique as Hero, zero GPU overhead vs PostFX EffectComposer */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(10,10,10,0.65) 100%)',
        }} />
      </div>

      {/* Text */}
      <h2
        ref={headingRef}
        style={{
          position: 'relative',
          zIndex: 5,
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(72px, 10vw, 130px)',
          fontWeight: 300,
          letterSpacing: '0.04em',
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1,
          opacity: 0,
          userSelect: 'none',
        }}
      >
        MAKE IT YOURS
      </h2>

      <div ref={ctaRef} style={{
        position: 'relative',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        marginTop: 40,
        opacity: 0,
      }}>
        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-body)',
          textAlign: 'center',
        }}>
          Handcrafted in America. Every ring made to order.
        </p>
        <button
          ref={magnetRef}
          data-cursor-hover
          onClick={handleConfigure}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--gold)'
            e.currentTarget.style.color = '#0a0a0a'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          style={{
            padding: '16px 56px',
            border: '1px solid rgba(201, 168, 76, 0.4)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-body)',
            transition: 'background 0.35s ease, color 0.35s ease',
            marginTop: 8,
            willChange: 'transform',
          }}
        >
          Configure Yours →
        </button>
      </div>
    </section>
  )
}
