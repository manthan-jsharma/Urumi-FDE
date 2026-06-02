'use client'

// Design: Dark Luxury
// Premium differentiator: Ring canvas stays sticky center while panel text scrolls
//   over it. Metal transitions via useSpring — smooth lerp, not a snap.
// Banned: CSS background-color transitions, static metal swatches

import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RingMesh } from '@/components/three/RingMesh'
import { PostFX } from '@/components/three/PostFX'

gsap.registerPlugin(ScrollTrigger)

const PANELS = [
  {
    metal: '14k-white',
    name: '14K White Gold',
    tagline: 'Cool. Understated. Eternal.',
    from: 'From $980',
  },
  {
    metal: '14k-yellow',
    name: '14K Yellow Gold',
    tagline: 'Warm. Classic. Unmistakable.',
    from: 'From $980',
  },
  {
    metal: '18k-rose',
    name: '18K Rose Gold',
    tagline: 'Romantic. Rich. Rare.',
    from: 'From $1,180',
  },
]

export function MetalsTeaser() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [currentMetal, setCurrentMetal] = useState('14k-white')
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    panelRefs.current.forEach((panel, i) => {
      if (!panel) return
      ScrollTrigger.create({
        trigger: panel,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => setCurrentMetal(PANELS[i].metal),
        onEnterBack: () => setCurrentMetal(PANELS[i].metal),
      })
    })

    return () => ScrollTrigger.getAll().forEach((t) => t.kill())
  }, [])

  return (
    <section ref={sectionRef} style={{ position: 'relative', background: 'var(--dark)' }}>
      {/* Top rule */}
      <div className="rule-gold" />

      <div style={{ position: 'relative' }}>
        {/* Sticky ring canvas */}
        <div style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          <Canvas
            camera={{ position: [0, 0.3, 3.5], fov: 38 }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#0a0a0a']} />
            <Suspense fallback={null}>
              <Environment preset="studio" />
              <RingMesh autoRotate metalKey={currentMetal} />
              <ContactShadows position={[0, -1.1, 0]} opacity={0.45} blur={2} scale={3} />
              <PostFX vignette={0.5} />
            </Suspense>
          </Canvas>
        </div>

        {/* Scrolling panels */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: '-100vh' }}>
          {PANELS.map((panel, i) => (
            <div
              key={panel.metal}
              ref={(el) => { panelRefs.current[i] = el }}
              style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '0 64px 80px',
                pointerEvents: 'none',
              }}
            >
              <div style={{
                maxWidth: 400,
                opacity: currentMetal === panel.metal ? 1 : 0,
                transform: currentMetal === panel.metal ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
              }}>
                <div style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-body)',
                  marginBottom: 12,
                }}>
                  {String(i + 1).padStart(2, '0')} / {String(PANELS.length).padStart(2, '0')}
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(48px, 6vw, 80px)',
                  fontWeight: 300,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                  marginBottom: 16,
                  letterSpacing: '0.02em',
                }}>
                  {panel.name}
                </h2>
                <p style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}>
                  {panel.tagline}
                </p>
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.08em',
                }}>
                  {panel.from}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom rule */}
      <div className="rule-gold" />
    </section>
  )
}
