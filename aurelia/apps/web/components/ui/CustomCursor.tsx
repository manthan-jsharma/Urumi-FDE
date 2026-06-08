'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const NO_CURSOR_ROUTES = ['/configure']

export function CustomCursor() {
  const pathname = usePathname()
  const disabled = NO_CURSOR_ROUTES.some(r => pathname.startsWith(r))

  useEffect(() => {
    if (disabled) {
      document.body.classList.remove('custom-cursor')
      return
    }
    document.body.classList.add('custom-cursor')

    const dot = document.createElement('div')
    Object.assign(dot.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: 'var(--gold)',
      pointerEvents: 'none',
      zIndex: '99999',
      willChange: 'transform',
    })

    const ring = document.createElement('div')
    Object.assign(ring.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      border: '1px solid rgba(201, 168, 76, 0.5)',
      pointerEvents: 'none',
      zIndex: '99998',
      willChange: 'transform',
      transition: 'opacity 0.3s ease',
    })

    document.body.appendChild(dot)
    document.body.appendChild(ring)

    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0
    let hovering = false
    let raf: number

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`
      const target = e.target as HTMLElement
      hovering = !!(
        target.closest('a') ||
        target.closest('button') ||
        target.closest('[data-cursor-hover]')
      )
    }

    function animate() {
      ringX += (mouseX - ringX) * 0.12
      ringY += (mouseY - ringY) * 0.12
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%) scale(${hovering ? 2.2 : 1})`
      ring.style.opacity = hovering ? '0.6' : '1'
      raf = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMouseMove)
    raf = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(raf)
      if (dot.parentNode) dot.parentNode.removeChild(dot)
      if (ring.parentNode) ring.parentNode.removeChild(ring)
      document.body.classList.remove('custom-cursor')
    }
  }, [disabled])

  // Nothing in the React tree — all DOM work is imperative
  return null
}
