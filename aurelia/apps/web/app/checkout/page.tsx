import nextDynamic from 'next/dynamic'

const CheckoutPage = nextDynamic(
  () => import('@/components/checkout/CheckoutPage').then(m => ({ default: m.CheckoutPage })),
  { ssr: false }
)

export default function Checkout() {
  return <CheckoutPage />
}
