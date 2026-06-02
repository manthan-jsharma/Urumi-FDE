'use client'

import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Hero } from './Hero'
import { HorizontalFeatures } from './HorizontalFeatures'
import { Testimonials } from './Testimonials'
import { FinalCTA } from './FinalCTA'
import { CartDrawer } from '@/components/ui/CartDrawer'
import { RingLoader } from '@/components/ui/RingLoader'

gsap.registerPlugin(ScrollTrigger)

// Must run before any child useEffect creates ScrollTrigger instances.
// React runs useEffects children-first, so putting this inside useEffect is too late.
ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true })

export function LandingPage() {
  const [ringLoaded, setRingLoaded] = useState(false)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    })

    lenis.on('scroll', ScrollTrigger.update)
    const tickerFn = (time: number) => { lenis.raf(time * 1000) }
    gsap.ticker.add(tickerFn)
    gsap.ticker.lagSmoothing(0)

    // Recalculate all pin heights now that Lenis is mounted and layout is final.
    // Child useEffects already created their ScrollTrigger instances — refresh re-measures them.
    ScrollTrigger.refresh()

    return () => {
      gsap.ticker.remove(tickerFn)
      lenis.destroy()
    }
  }, [])

  return (
    <main>
      <RingLoader isLoaded={ringLoaded} />
      <Hero onReady={() => setRingLoaded(true)} />
      <HorizontalFeatures />
      <Testimonials />
      <FinalCTA />
      <CartDrawer />
    </main>
  )
}
