'use client'

export const dynamic = 'force-dynamic'

import nextDynamic from 'next/dynamic'

const Ring3DView = nextDynamic(
  () => import('@/components/three/Ring3DView').then(m => ({ default: m.Ring3DView })),
  { ssr: false }
)

export default function Ring3DPage() {
  return <Ring3DView />
}
