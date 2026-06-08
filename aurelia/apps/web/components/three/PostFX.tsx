'use client'

import { EffectComposer, Vignette, Bloom, DepthOfField } from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'

interface PostFXProps {
  vignette?: number

  // Bloom — facet highlight glow.  Only pixels above luminanceThreshold bloom.
  bloom?: boolean
  bloomIntensity?: number       // default 0.35
  bloomThreshold?: number       // default 0.85

  // Depth of field — macro jewellery photography feel.
  // Disabled by setting bokehScale to 0 (neutral — no blur applied).
  dof?: boolean
  dofFocusDistance?: number     // world-space camera→focal-plane (units)
  dofFocusRange?: number        // sharp zone depth in world units
  dofBokeh?: number             // bokeh blur scale (0 = off, 0.5 = subtle)
}

export function PostFX({
  vignette       = 0.45,
  bloom          = false,
  bloomIntensity = 0.18,
  bloomThreshold = 0.90,
  dof            = false,
  dofFocusDistance = 3.5,
  dofFocusRange    = 1.0,
  dofBokeh         = 0.6,
}: PostFXProps) {
  return (
    <EffectComposer>
      {dof && (
        <DepthOfField
          worldFocusDistance={dofFocusDistance}
          worldFocusRange={dofFocusRange}
          bokehScale={dofBokeh}
          height={480}
        />
      )}

      {/* Bloom: intensity=0 when disabled → pass-through */}
      <Bloom
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.06}
        intensity={bloom ? bloomIntensity : 0}
        kernelSize={KernelSize.MEDIUM}
        blendFunction={BlendFunction.ADD}
      />

      <Vignette
        darkness={vignette}
        offset={0.3}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
