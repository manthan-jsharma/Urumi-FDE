'use client'

export const dynamic = 'force-dynamic'

import nextDynamic from 'next/dynamic'

const ConfiguratorLayout = nextDynamic(
  () => import('@/components/configurator/ConfiguratorLayout').then(m => ({ default: m.ConfiguratorLayout })),
  { ssr: false }
)

export default function ConfigurePage() {
  return <ConfiguratorLayout />
}
