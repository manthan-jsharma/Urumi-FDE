'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import { RingMesh } from '@/components/three/RingMesh'
import { PostFX } from '@/components/three/PostFX'
import { LightTentEnvironment } from '@/components/three/LightTentEnvironment'

function CameraIntro() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 3, 12)
    gsap.to(camera.position, {
      x: 0, y: 0.5, z: 3.8,
      duration: 2.8,
      ease: 'power3.out',
      onUpdate: () => camera.lookAt(0, 0, 0),
    })
  }, [camera])
  return null
}

function Particles() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    duration: Math.random() * 6 + 4,
    delay: Math.random() * 4,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%',
          background: 'rgba(201, 168, 76, 0.35)',
          animation: `particleFloat ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`@keyframes particleFloat { from { transform: translateY(0px); opacity: 0.2; } to { transform: translateY(-18px); opacity: 0.7; } }`}</style>
    </div>
  )
}

export function Ring3DView() {
  const router = useRouter()
  const [metal, setMetal] = useState('14k-yellow')
  const uiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ui = uiRef.current
    if (!ui) return
    gsap.fromTo(ui, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 2, ease: 'power3.out' })
  }, [])

  const metals = ['14k-yellow', '14k-white', '18k-rose', 'platinum']
  const metalLabels: Record<string, string> = {
    '14k-yellow': '14K Yellow', '14k-white': '14K White',
    '18k-rose': '18K Rose', platinum: 'Platinum',
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#080808', overflow: 'hidden' }}>
      <Particles />

      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas camera={{ position: [0, 3, 12], fov: 40 }} gl={{ antialias: true, alpha: false, toneMapping: 4 }} dpr={[1, 2]} shadows>
          <color attach="background" args={['#080808']} />
          <Suspense fallback={null}>
            <LightTentEnvironment />
            <CameraIntro />
            <RingMesh metalKey={metal} autoRotate />
            <spotLight position={[4, 7, 3]} intensity={2} angle={0.4} penumbra={0.9} castShadow />
            <ambientLight intensity={0.1} />
            <ContactShadows position={[0, -1.0, 0]} opacity={0.5} blur={3} scale={4} />
            <PostFX vignette={0.6} bloom dofFocusDistance={3.8} dofFocusRange={1.4} dofBokeh={0.5} dof />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={2} maxDistance={8} dampingFactor={0.04} autoRotate autoRotateSpeed={0.3} />
        </Canvas>
      </div>

      <div ref={uiRef} style={{ position: 'relative', zIndex: 10, opacity: 0 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 48px' }}>
          <Link href="/" data-cursor-hover style={{
            fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-muted)',
            textTransform: 'uppercase', fontFamily: 'var(--font-body)', textDecoration: 'none', transition: 'color 0.3s ease',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ← Aurelia
          </Link>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
            Twist Ring · 3D Preview
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 60, left: 64, right: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: 12 }}>
              Metal
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {metals.map((m) => (
                <button key={m} data-cursor-hover onClick={() => setMetal(m)} style={{
                  padding: '6px 14px',
                  border: metal === m ? '1px solid var(--gold-border)' : '1px solid #222',
                  background: '#111', color: metal === m ? 'var(--gold)' : '#555',
                  fontSize: 10, letterSpacing: '0.1em', fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase', transition: 'all 0.3s ease',
                }}>
                  {metalLabels[m]}
                </button>
              ))}
            </div>
          </div>

          <button data-cursor-hover onClick={() => router.push('/configure')} style={{
            padding: '13px 40px',
            border: '1px solid rgba(201, 168, 76, 0.4)',
            background: 'transparent', color: 'var(--text-primary)',
            fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            fontFamily: 'var(--font-body)', transition: 'background 0.35s ease, color 0.35s ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#0a0a0a' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)' }}
          >
            Configure this ring →
          </button>
        </div>
      </div>
    </div>
  )
}
