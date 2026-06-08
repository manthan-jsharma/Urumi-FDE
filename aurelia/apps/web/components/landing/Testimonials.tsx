'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const LEFT_QUOTES = [
  {
    text: 'In love with both my fiancé and this ring. The yellow gold twist band is everything we imagined.',
    author: 'Sarah M.',
    location: 'New York',
  },
  {
    text: 'The platinum band with oval stone is breathtaking. Worth every penny and then some.',
    author: 'Priya K.',
    location: 'San Francisco',
  },
]

const RIGHT_QUOTES = [
  {
    text: "Configured it in fifteen minutes. It arrived three weeks later. I've never seen her cry like that.",
    author: 'James T.',
    location: 'London',
  },
  {
    text: "She wore it to brunch the next day and hasn't taken it off since. Worth every single penny.",
    author: 'Marcus L.',
    location: 'Sydney',
  },
]

function Quote({ text, author, location }: { text: string; author: string; location: string }) {
  return (
    <div style={{ paddingBottom: 64 }}>
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'clamp(20px, 2.2vw, 30px)',
        fontWeight: 300,
        fontStyle: 'italic',
        lineHeight: 1.6,
        color: 'var(--text-primary)',
        marginBottom: 24,
        letterSpacing: '0.01em',
      }}>
        "{text}"
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 20, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
        <span style={{
          fontSize: 11, letterSpacing: '0.12em', color: 'var(--gold)',
          textTransform: 'uppercase', fontFamily: 'var(--font-body)',
        }}>
          {author}, {location}
        </span>
      </div>
    </div>
  )
}

export function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const leftRef    = useRef<HTMLDivElement>(null)
  const rightRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const left    = leftRef.current
    const right   = rightRef.current
    if (!section || !left || !right) return

    // Left column drifts UP as the section scrolls through viewport
    const twLeft = gsap.fromTo(left,
      { y: 60 },
      {
        y: -60,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    )

    // Right column drifts DOWN
    const twRight = gsap.fromTo(right,
      { y: -60 },
      {
        y: 60,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    )

    return () => {
      twLeft.kill()
      twRight.kill()
    }
  }, [])

  return (
    <section ref={sectionRef} style={{
      background: 'var(--dark)',
      padding: '130px 0',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 64px' }}>

        {/* Section label */}
        <div style={{
          fontSize: 10, letterSpacing: '0.22em', color: 'var(--text-muted)',
          textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: 80,
        }}>
          They said
        </div>

        {/* Split columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 96px', alignItems: 'start' }}>
          {/* Left — scrolls UP */}
          <div ref={leftRef}>
            {LEFT_QUOTES.map((q, i) => (
              <Quote key={i} {...q} />
            ))}
          </div>

          {/* Right — scrolls DOWN — offset down so columns feel staggered */}
          <div ref={rightRef} style={{ paddingTop: 96 }}>
            {RIGHT_QUOTES.map((q, i) => (
              <Quote key={i} {...q} />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
