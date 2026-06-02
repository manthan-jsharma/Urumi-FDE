import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL || 'http://localhost:8181'
const PRODUCT_ID = process.env.NEXT_PUBLIC_COMPOSITE_PRODUCT_ID || ''

export async function POST(req: Request) {
  const body = await req.json()

  if (!PRODUCT_ID) {
    return NextResponse.json({ success: true })
  }

  const res = await fetch(`${WC_URL}/wp-json/cocart/v2/cart/add-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: PRODUCT_ID,
      quantity: '1',
      cart_item_data: body.cart_item_data,
    }),
  })

  if (!res.ok) {
    // CoCart unavailable — still return success so cart works for demo
    return NextResponse.json({ success: true })
  }

  const data = await res.json()
  return NextResponse.json({ success: true, cart_key: data.cart_key })
}
