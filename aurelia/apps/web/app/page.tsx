import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const LandingPage = nextDynamic(
  () => import('@/components/landing/LandingPage').then(m => ({ default: m.LandingPage })),
  { ssr: false }
)

export default function Home() {
  return <LandingPage />
}
