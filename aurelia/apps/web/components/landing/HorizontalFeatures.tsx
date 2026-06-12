'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ── Shared SVG glow filter ─────────────────────────────────────────────────
function GoldGlowDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={id} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
        <feColorMatrix in="blur" type="matrix"
          values="1.3 0 0 0 0.79  0 1.0 0 0 0.66  0 0 0.4 0 0.29  0 0 0 1.4 0"
          result="gold" />
        <feMerge>
          <feMergeNode in="gold" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

// ── 01 / The Stone — Diamond facet diagram ─────────────────────────────────
// Draw-in on load → rotating arc shimmer → pulsing sparkle vertices
function DiamondFacetSVG() {
  const PI = Math.PI
  const cx = 100, cy = 100, R = 82, r = 36

  const T  = Array.from({ length: 8 }, (_, k) => {
    const a = (k * 45 + 22.5) * PI / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number]
  })
  const G  = Array.from({ length: 8 }, (_, k) => {
    const a = k * 45 * PI / 180
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as [number, number]
  })
  const GI = Array.from({ length: 8 }, (_, k) => {
    const a = (k * 45 + 22.5) * PI / 180
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as [number, number]
  })

  const tablePoints  = T.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const girdleCirc   = +(2 * PI * R).toFixed(1)          // ~515
  const outerCirc    = +(2 * PI * (R + 14)).toFixed(1)    // rotating ring

  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <GoldGlowDefs id="dg" />
      <defs>
        <radialGradient id="centreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(201,168,76,0.12)" />
          <stop offset="100%" stopColor="rgba(201,168,76,0)" />
        </radialGradient>
      </defs>

      {/* Ambient radial glow at centre */}
      <circle cx={cx} cy={cy} r="60" fill="url(#centreGlow)">
        <animate attributeName="r" values="50;70;50" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite" />
      </circle>

      {/* Outermost ghost ring */}
      <circle cx={cx} cy={cy} r={R + 14} fill="none"
        stroke="rgba(201,168,76,0.1)" strokeWidth="0.5" strokeDasharray="4 7" />

      {/* Rotating arc-of-light sweep (thin bright arc orbits continuously) */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
          dur="9s" repeatCount="indefinite" />
        <circle cx={cx} cy={cy} r={R + 14} fill="none"
          stroke="rgba(201,168,76,0.55)" strokeWidth="1.5"
          strokeDasharray={`${(outerCirc * 0.1).toFixed(1)} ${(outerCirc * 0.9).toFixed(1)}`} />
      </g>

      {/* Second, slower counter-rotating arc */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${cx} ${cy}`} to={`-360 ${cx} ${cy}`}
          dur="22s" repeatCount="indefinite" />
        <circle cx={cx} cy={cy} r={R + 14} fill="none"
          stroke="rgba(201,168,76,0.22)" strokeWidth="1"
          strokeDasharray={`${(outerCirc * 0.06).toFixed(1)} ${(outerCirc * 0.94).toFixed(1)}`} />
      </g>

      {/* Girdle — draws in */}
      <circle cx={cx} cy={cy} r={R} fill="none"
        stroke="rgba(201,168,76,0.6)" strokeWidth="0.9"
        strokeDasharray={girdleCirc} strokeDashoffset={girdleCirc}>
        <animate attributeName="stroke-dashoffset"
          from={girdleCirc} to="0" dur="1.8s" fill="freeze"
          calcMode="spline" keySplines="0.16 1 0.3 1" keyTimes="0;1" />
      </circle>

      {/* Table octagon — draws in with delay */}
      <polygon points={tablePoints}
        fill="none" stroke="rgba(201,168,76,0.65)" strokeWidth="0.8"
        strokeDasharray="260" strokeDashoffset="260">
        <animate attributeName="stroke-dashoffset"
          from="260" to="0" dur="1.2s" begin="0.5s" fill="freeze"
          calcMode="spline" keySplines="0.16 1 0.3 1" keyTimes="0;1" />
        {/* Subtle breathing fill */}
        <animate attributeName="fill" values="rgba(201,168,76,0);rgba(201,168,76,0.05);rgba(201,168,76,0)"
          dur="5s" begin="2.5s" repeatCount="indefinite" />
      </polygon>

      {/* Kite facet edges — staggered draw-in */}
      {T.map(([tx, ty], k) => (
        <g key={k}>
          <line x1={tx.toFixed(2)} y1={ty.toFixed(2)} x2={G[k][0].toFixed(2)} y2={G[k][1].toFixed(2)}
            stroke="rgba(201,168,76,0.38)" strokeWidth="0.6"
            strokeDasharray="100" strokeDashoffset="100">
            <animate attributeName="stroke-dashoffset" from="100" to="0"
              dur="0.7s" begin={`${1.0 + k * 0.07}s`} fill="freeze" />
          </line>
          <line x1={tx.toFixed(2)} y1={ty.toFixed(2)} x2={G[(k + 1) % 8][0].toFixed(2)} y2={G[(k + 1) % 8][1].toFixed(2)}
            stroke="rgba(201,168,76,0.38)" strokeWidth="0.6"
            strokeDasharray="100" strokeDashoffset="100">
            <animate attributeName="stroke-dashoffset" from="100" to="0"
              dur="0.7s" begin={`${1.0 + k * 0.07 + 0.04}s`} fill="freeze" />
          </line>
        </g>
      ))}

      {/* Star facet spokes */}
      {T.map(([tx, ty], k) => (
        <line key={`s${k}`} x1={tx.toFixed(2)} y1={ty.toFixed(2)}
          x2={GI[k][0].toFixed(2)} y2={GI[k][1].toFixed(2)}
          stroke="rgba(201,168,76,0.22)" strokeWidth="0.45"
          strokeDasharray="60" strokeDashoffset="60">
          <animate attributeName="stroke-dashoffset" from="60" to="0"
            dur="0.5s" begin={`${1.6 + k * 0.05}s`} fill="freeze" />
        </line>
      ))}

      {/* Sparkle dots — appear and pulse at each table vertex */}
      {T.map(([x, y], k) => (
        <circle key={`sp${k}`} cx={x.toFixed(2)} cy={y.toFixed(2)}
          r="0" fill="rgba(201,168,76,0.9)" opacity="0">
          {/* Appear */}
          <animate attributeName="opacity" from="0" to="1"
            dur="0.1s" begin={`${2.0 + k * 0.1}s`} fill="freeze" />
          {/* Pulse size */}
          <animate attributeName="r"
            values="0;2.5;1.5;3;1.5"
            keyTimes="0;0.1;0.4;0.55;1"
            dur="3.5s" begin={`${2.0 + k * 0.1}s`} repeatCount="indefinite" />
          {/* Pulse opacity */}
          <animate attributeName="opacity"
            values="1;0.9;0.4;1;0.4"
            keyTimes="0;0.1;0.4;0.55;1"
            dur="3.5s" begin={`${2.0 + k * 0.1}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Centre culet — beats */}
      <circle cx={cx} cy={cy} r="2.5" fill="rgba(201,168,76,0.8)">
        <animate attributeName="r" values="1;3.5;1.5;2.5;1.5" dur="3s" begin="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;1;0.6;1;0.5" dur="3s" begin="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ── 02 / The Metal — Hex lattice with ripple wave ──────────────────────────
// Grid fades in → pulse ripples outward from centre hex → diagonal shimmer
function MetalLatticeSVG() {
  const hexR = 16
  const hexW = hexR * Math.sqrt(3)

  const hexes: { pts: string; x: number; y: number; dist: number; key: string }[] = []
  for (let row = -2; row <= 4; row++) {
    for (let col = -1; col <= 5; col++) {
      const x = col * hexW + (row % 2 !== 0 ? hexW / 2 : 0) + 20
      const y = row * hexR * 1.5 + 20
      if (x < -20 || x > 215 || y < -20 || y > 215) continue
      const dist = Math.sqrt((x - 100) ** 2 + (y - 100) ** 2)
      const pts  = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 30) * Math.PI / 180
        return `${(x + hexR * Math.cos(a)).toFixed(1)},${(y + hexR * Math.sin(a)).toFixed(1)}`
      }).join(' ')
      hexes.push({ pts, x, y, dist, key: `${row}-${col}` })
    }
  }

  // Sort by distance for layering (centre on top)
  const maxDist = Math.max(...hexes.map(h => h.dist))

  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <GoldGlowDefs id="mg" />
      <defs>
        <radialGradient id="metalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(201,168,76,0.18)" />
          <stop offset="70%"  stopColor="rgba(201,168,76,0.04)" />
          <stop offset="100%" stopColor="rgba(201,168,76,0)" />
        </radialGradient>
      </defs>

      {/* Background radial glow */}
      <circle cx="100" cy="100" r="80" fill="url(#metalGlow)">
        <animate attributeName="r" values="70;90;70" dur="6s" repeatCount="indefinite" />
      </circle>

      {/* Hex grid — each hex fades in based on distance from centre */}
      {hexes.map(({ pts, x, y, dist, key }) => {
        const normDist  = dist / maxDist
        const baseOpa   = 0.15 + (1 - normDist) * 0.2
        const fadeDelay = normDist * 0.8
        // Ripple: closer hexes pulse brighter, with phase offset by distance
        const rippleDur = 4 + normDist * 2
        const rippleDelay = (dist / 30) % rippleDur

        return (
          <g key={key} opacity="0">
            {/* Fade in on load */}
            <animate attributeName="opacity" from="0" to="1"
              dur="0.6s" begin={`${fadeDelay}s`} fill="freeze" />

            {/* Hex outline */}
            <polygon points={pts}
              fill="rgba(201,168,76,0.02)"
              stroke={`rgba(201,168,76,${baseOpa.toFixed(2)})`}
              strokeWidth={normDist < 0.3 ? '0.9' : '0.5'}>
              {/* Ripple pulse on stroke opacity */}
              <animate attributeName="stroke-opacity"
                values={`${baseOpa.toFixed(2)};${Math.min(baseOpa * 3.5, 0.9).toFixed(2)};${baseOpa.toFixed(2)}`}
                dur={`${rippleDur}s`}
                begin={`${fadeDelay + rippleDelay}s`}
                repeatCount="indefinite" />
              {/* Fill flash on pulse */}
              <animate attributeName="fill"
                values="rgba(201,168,76,0.02);rgba(201,168,76,0.07);rgba(201,168,76,0.02)"
                dur={`${rippleDur}s`}
                begin={`${fadeDelay + rippleDelay}s`}
                repeatCount="indefinite" />
            </polygon>

            {/* Node dot at hex centre */}
            <circle cx={x.toFixed(1)} cy={y.toFixed(1)}
              r={normDist < 0.25 ? '1.8' : '1.1'}
              fill={`rgba(201,168,76,${(baseOpa * 0.9).toFixed(2)})`}>
              <animate attributeName="r"
                values={`${normDist < 0.25 ? 1.8 : 1.1};${normDist < 0.25 ? 3 : 2};${normDist < 0.25 ? 1.8 : 1.1}`}
                dur={`${rippleDur}s`}
                begin={`${fadeDelay + rippleDelay}s`}
                repeatCount="indefinite" />
            </circle>
          </g>
        )
      })}

      {/* Centre hex — prominent glow + strong pulse */}
      {(() => {
        const pts = Array.from({ length: 6 }, (_, i) => {
          const a = (i * 60 - 30) * Math.PI / 180
          return `${(100 + hexR * Math.cos(a)).toFixed(1)},${(100 + hexR * Math.sin(a)).toFixed(1)}`
        }).join(' ')
        return (
          <g>
            <polygon points={pts} fill="rgba(201,168,76,0.08)"
              stroke="rgba(201,168,76,0.85)" strokeWidth="1.2">
              <animate attributeName="stroke-opacity" values="0.85;0.4;0.85" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="fill" values="rgba(201,168,76,0.08);rgba(201,168,76,0.18);rgba(201,168,76,0.08)"
                dur="2.5s" repeatCount="indefinite" />
            </polygon>
          </g>
        )
      })()}

      {/* Slow diagonal shimmer line sweeping across */}
      <g>
        <animateTransform attributeName="transform" type="translate"
          values="-240 0; 240 0" dur="5s" repeatCount="indefinite" />
        <rect x="0" y="-20" width="40" height="240" fill="none"
          stroke="rgba(201,168,76,0.06)" strokeWidth="40"
          transform="rotate(-25 20 100)" />
      </g>
    </svg>
  )
}

// ── 03 / The Craft — Ring cross-section with orbiting band dots ────────────
// Rings draw in → dots orbit continuously → arc-of-light sweeps outer ring
function RingProfileSVG() {
  const N    = 20
  const rMid = 61
  const outerCirc = +(2 * Math.PI * 72).toFixed(1)   // ~452
  const innerCirc = +(2 * Math.PI * 50).toFixed(1)   // ~314
  const midCirc   = +(2 * Math.PI * rMid).toFixed(1) // ~383

  const dots = Array.from({ length: N }, (_, i) => {
    const a = i * (360 / N) * Math.PI / 180
    return [100 + rMid * Math.cos(a), 100 + rMid * Math.sin(a)] as [number, number]
  })

  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <GoldGlowDefs id="rg" />

      {/* Outer band ring — draws in */}
      <circle cx="100" cy="100" r="72" fill="none"
        stroke="rgba(201,168,76,0.6)" strokeWidth="1"
        strokeDasharray={outerCirc} strokeDashoffset={outerCirc}>
        <animate attributeName="stroke-dashoffset"
          from={outerCirc} to="0" dur="1.8s" fill="freeze"
          calcMode="spline" keySplines="0.16 1 0.3 1" keyTimes="0;1" />
      </circle>

      {/* Band edge (inner wall of the shank) — draws in with delay */}
      <circle cx="100" cy="100" r="50" fill="none"
        stroke="rgba(201,168,76,0.4)" strokeWidth="0.7"
        strokeDasharray={innerCirc} strokeDashoffset={innerCirc}>
        <animate attributeName="stroke-dashoffset"
          from={innerCirc} to="0" dur="1.6s" begin="0.4s" fill="freeze"
          calcMode="spline" keySplines="0.16 1 0.3 1" keyTimes="0;1" />
      </circle>

      {/* Between-wall shading */}
      <circle cx="100" cy="100" r="61" fill="none"
        stroke="rgba(201,168,76,0.08)" strokeWidth="22" />

      {/* Mid reference dashes */}
      <circle cx="100" cy="100" r="61" fill="none"
        stroke="rgba(201,168,76,0.15)" strokeWidth="0.4" strokeDasharray="3 4" />

      {/* Arc-of-light sweeping around the outer ring */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from="0 100 100" to="360 100 100" dur="7s" repeatCount="indefinite" />
        <circle cx="100" cy="100" r="72" fill="none"
          stroke="rgba(201,168,76,0.6)" strokeWidth="2"
          strokeDasharray={`${(outerCirc * 0.12).toFixed(1)} ${(outerCirc * 0.88).toFixed(1)}`} />
      </g>

      {/* Second arc — outer glow, slower */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from="180 100 100" to="540 100 100" dur="14s" repeatCount="indefinite" />
        <circle cx="100" cy="100" r="72" fill="none"
          stroke="rgba(201,168,76,0.25)" strokeWidth="4"
          strokeDasharray={`${(outerCirc * 0.08).toFixed(1)} ${(outerCirc * 0.92).toFixed(1)}`} />
      </g>

      {/* Orbiting band dots — whole group rotates */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from="0 100 100" to="360 100 100" dur="24s" repeatCount="indefinite" />
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)}
            r={i % 4 === 0 ? '2.2' : '1.2'}
            fill={`rgba(201,168,76,${i % 4 === 0 ? '0.65' : '0.3'})`}>
            {/* Pulsing brightness */}
            <animate attributeName="opacity"
              values="0.6;1;0.6" dur="2s"
              begin={`${i * 0.1}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>

      {/* Width callout lines — extend on load */}
      {[
        { x1: 50, y1: 100, x2: 28, y2: 100 },
        { x1: 150, y1: 100, x2: 172, y2: 100 },
      ].map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x1} y2={l.y1}
          stroke="rgba(201,168,76,0.5)" strokeWidth="0.6">
          <animate attributeName="x2" from={l.x1} to={l.x2}
            dur="0.6s" begin={`${1.8 + i * 0.1}s`} fill="freeze" />
        </line>
      ))}
      {/* End caps */}
      {[
        { x: 28, y1: 95, y2: 105 },
        { x: 172, y1: 95, y2: 105 },
      ].map((l, i) => (
        <line key={`cap${i}`} x1={l.x} y1={100} x2={l.x} y2={100}
          stroke="rgba(201,168,76,0.5)" strokeWidth="0.6">
          <animate attributeName="y1" from="100" to={l.y1}
            dur="0.3s" begin={`${2.4 + i * 0.1}s`} fill="freeze" />
          <animate attributeName="y2" from="100" to={l.y2}
            dur="0.3s" begin={`${2.4 + i * 0.1}s`} fill="freeze" />
        </line>
      ))}
    </svg>
  )
}

// ── 04 / The Promise — Certification seal ─────────────────────────────────
// Outer dashed ring rotates → tick marks light clockwise → diamond spins
function PromiseSealSVG() {
  const TICKS  = 24
  const outerC = +(2 * Math.PI * 82).toFixed(1)   // ~515
  const mainC  = +(2 * Math.PI * 72).toFixed(1)   // ~452

  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <GoldGlowDefs id="pg" />

      {/* Slowly rotating outer dashed ring */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from="0 100 100" to="360 100 100" dur="30s" repeatCount="indefinite" />
        <circle cx="100" cy="100" r="82" fill="none"
          stroke="rgba(201,168,76,0.28)" strokeWidth="0.7" strokeDasharray="6 5" />
      </g>

      {/* Second dashed ring, counter-rotating slightly faster */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from="0 100 100" to="-360 100 100" dur="50s" repeatCount="indefinite" />
        <circle cx="100" cy="100" r="87" fill="none"
          stroke="rgba(201,168,76,0.1)" strokeWidth="0.5" strokeDasharray="2 10" />
      </g>

      {/* Main ring — draws in */}
      <circle cx="100" cy="100" r="72" fill="none"
        stroke="rgba(201,168,76,0.55)" strokeWidth="0.9"
        strokeDasharray={mainC} strokeDashoffset={mainC}>
        <animate attributeName="stroke-dashoffset"
          from={mainC} to="0" dur="2s" fill="freeze"
          calcMode="spline" keySplines="0.16 1 0.3 1" keyTimes="0;1" />
      </circle>

      {/* Inner ring */}
      <circle cx="100" cy="100" r="52" fill="none"
        stroke="rgba(201,168,76,0.28)" strokeWidth="0.6"
        strokeDasharray="326" strokeDashoffset="326">
        <animate attributeName="stroke-dashoffset"
          from="326" to="0" dur="1.5s" begin="0.5s" fill="freeze"
          calcMode="spline" keySplines="0.16 1 0.3 1" keyTimes="0;1" />
      </circle>

      {/* Tick marks — light up sequentially clockwise, loop */}
      {Array.from({ length: TICKS }, (_, i) => {
        const a  = (i * (360 / TICKS) - 90) * Math.PI / 180
        const r1 = i % 6 === 0 ? 56 : 63
        const r2 = 70
        const isMajor = i % 6 === 0
        const cycleLen = 4   // seconds per full sweep
        const delay    = (i / TICKS) * cycleLen

        return (
          <line key={i}
            x1={(100 + r1 * Math.cos(a)).toFixed(1)} y1={(100 + r1 * Math.sin(a)).toFixed(1)}
            x2={(100 + r2 * Math.cos(a)).toFixed(1)} y2={(100 + r2 * Math.sin(a)).toFixed(1)}
            stroke={`rgba(201,168,76,${isMajor ? '0.55' : '0.28'})`}
            strokeWidth={isMajor ? '1' : '0.55'}>
            {/* Sequential glow sweep */}
            <animate attributeName="stroke-opacity"
              values={`${isMajor ? 0.55 : 0.28};0.95;${isMajor ? 0.55 : 0.28}`}
              dur={`${cycleLen}s`}
              begin={`${1.5 + delay}s`}
              repeatCount="indefinite" />
            <animate attributeName="stroke-width"
              values={`${isMajor ? 1 : 0.55};${isMajor ? 2 : 1.2};${isMajor ? 1 : 0.55}`}
              dur={`${cycleLen}s`}
              begin={`${1.5 + delay}s`}
              repeatCount="indefinite" />
          </line>
        )
      })}

      {/* Slowly spinning diamond symbol at centre */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from="0 100 100" to="360 100 100" dur="18s" repeatCount="indefinite" />
        <polygon points="100,80 118,100 100,120 82,100"
          fill="rgba(201,168,76,0.06)" stroke="rgba(201,168,76,0.75)" strokeWidth="1">
          <animate attributeName="stroke-opacity" values="0.75;0.4;0.75" dur="3s" repeatCount="indefinite" />
          <animate attributeName="fill" values="rgba(201,168,76,0.06);rgba(201,168,76,0.14);rgba(201,168,76,0.06)"
            dur="3s" repeatCount="indefinite" />
        </polygon>
        {/* Inner cross lines of diamond */}
        <line x1="100" y1="80" x2="100" y2="120" stroke="rgba(201,168,76,0.25)" strokeWidth="0.5" />
        <line x1="82" y1="100" x2="118" y2="100" stroke="rgba(201,168,76,0.25)" strokeWidth="0.5" />
      </g>

      {/* Centre heartbeat dot */}
      <circle cx="100" cy="100" r="2" fill="rgba(201,168,76,0.9)">
        <animate attributeName="r" values="1.5;4;1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;1;0.5;1;0.7" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ── Panel data ─────────────────────────────────────────────────────────────
const PANELS = [
  {
    num: '01', section: 'The Stone',
    heading: 'Every facet\ncatches light',
    body: 'GIA certified, conflict-free. Each stone selected for exceptional cut, colour, and clarity — graded before it ever touches the setting.',
    Visual: DiamondFacetSVG,
  },
  {
    num: '02', section: 'The Metal',
    heading: 'Forged to\noutlast time',
    body: "Eight alloys, 14K to Platinum. Each refined to precise hardness and warmth. The metal you choose defines the ring's character for a lifetime.",
    Visual: MetalLatticeSVG,
  },
  {
    num: '03', section: 'The Craft',
    heading: 'Handmade,\nnever mass-produced',
    body: 'Cast to order in our workshop. Hand-finished over three days. Yours ships in three weeks — never sitting in a warehouse, never rushed.',
    Visual: RingProfileSVG,
  },
  {
    num: '04', section: 'The Promise',
    heading: 'Yours for life.\nGuaranteed.',
    body: 'Lifetime resizing. 30-day returns. Certificate of authenticity included. If it ever needs attention, we take care of it — no questions asked.',
    Visual: PromiseSealSVG,
  },
]

// ── Component ──────────────────────────────────────────────────────────────
export function HorizontalFeatures() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const trackRef   = useRef<HTMLDivElement>(null)

  // Pause all 44 SMIL animations when section is off-screen.
  // Without this, they saturate the browser rendering pipeline (79% Rendering in profile)
  // even while the Hero ring is visible, causing periodic 2-second hangs.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const io = new IntersectionObserver(
      ([entry]) => {
        wrapper.querySelectorAll('svg').forEach(svg => {
          entry.isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations()
        })
      },
      { threshold: 0 },
    )
    io.observe(wrapper)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const track   = trackRef.current
    if (!wrapper || !track) return

    const tween = gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: wrapper,
        pin: true,
        scrub: true,
        end: () => `+=${track.scrollWidth - window.innerWidth}`,
      },
    })

    return () => { tween.kill() }
  }, [])

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: 'var(--dark)', width: '100vw' }}>
      <div style={{
        position: 'absolute', top: 32, left: 52, zIndex: 10,
        fontSize: 10, letterSpacing: '0.22em', color: 'var(--text-muted)',
        textTransform: 'uppercase', fontFamily: 'var(--font-body)',
        pointerEvents: 'none',
      }}>
        Crafted details
      </div>

      <div ref={trackRef} style={{ display: 'flex', width: 'max-content', height: '100vh', alignItems: 'stretch' }}>
        {PANELS.map((panel) => {
          const { Visual } = panel
          return (
            <div key={panel.num} style={{
              width: '100vw', flexShrink: 0,
              display: 'flex', alignItems: 'center',
              borderRight: '1px solid #141414',
            }}>
              {/* Left — animated SVG visual */}
              <div style={{
                width: '50%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRight: '1px solid #141414',
                padding: '0 72px',
              }}>
                <div style={{ width: 'min(340px, 42vw)', aspectRatio: '1/1' }}>
                  <Visual />
                </div>
              </div>

              {/* Right — editorial text */}
              <div style={{
                width: '50%', padding: '0 72px 0 64px',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0,
              }}>
                <div style={{
                  fontSize: 10, letterSpacing: '0.22em', color: 'var(--gold)',
                  textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: 20,
                }}>
                  {panel.num} &nbsp;/&nbsp; {panel.section}
                </div>

                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(42px, 5.2vw, 72px)',
                  fontWeight: 300, fontStyle: 'italic',
                  letterSpacing: '0.02em', color: 'var(--text-primary)',
                  lineHeight: 1.12, marginBottom: 28, whiteSpace: 'pre-line',
                }}>
                  {panel.heading}
                </h2>

                <div style={{ width: 32, height: 1, background: 'var(--gold)', opacity: 0.4, marginBottom: 24 }} />

                <p style={{
                  fontSize: 13, lineHeight: 1.8,
                  color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
                  fontWeight: 300, maxWidth: 360, letterSpacing: '0.02em',
                }}>
                  {panel.body}
                </p>

                <div style={{
                  marginTop: 40, fontSize: 10, letterSpacing: '0.2em',
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span>{panel.num} / 04</span>
                  <span style={{ width: 24, height: 1, background: '#2a2a2a', display: 'inline-block' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
