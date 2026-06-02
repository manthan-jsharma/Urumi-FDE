import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL || 'http://localhost:8181'
const WC_KEY = process.env.NEXT_PUBLIC_WC_KEY || ''
const WC_SECRET = process.env.NEXT_PUBLIC_WC_SECRET || ''
const PRODUCT_ID = process.env.NEXT_PUBLIC_COMPOSITE_PRODUCT_ID || ''

export async function POST(req: Request) {
  const body = await req.json()
  const { billing, cartItems, total } = body

  const line_items = cartItems.map((item: { price: number; metalLabel: string; stoneLabel: string; quantity: number }) => ({
    product_id: parseInt(PRODUCT_ID),
    quantity: item.quantity,
    subtotal: String(item.price),
    total: String(item.price),
    meta_data: [
      { key: 'aurelia_metal', value: item.metalLabel },
      { key: 'aurelia_stone', value: item.stoneLabel },
    ],
  }))

  const res = await fetch(
    `${WC_URL}/wp-json/wc/v3/orders?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method: 'cod',
        payment_method_title: 'Demo Order',
        set_paid: false,
        status: 'pending',
        billing,
        shipping: billing,
        line_items,
        meta_data: [
          { key: 'aurelia_order_total', value: String(total) },
        ],
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const order = await res.json()
  return NextResponse.json({ success: true, orderId: order.id, orderNumber: order.number })
}
