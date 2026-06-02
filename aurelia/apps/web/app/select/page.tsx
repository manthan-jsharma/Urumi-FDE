import nextDynamic from 'next/dynamic'

const RingSelector = nextDynamic(
  () => import('@/components/selector/RingSelector').then(m => ({ default: m.RingSelector })),
  { ssr: false }
)

export default function SelectPage() {
  return <RingSelector />
}
