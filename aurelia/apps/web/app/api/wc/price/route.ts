import { NextResponse } from 'next/server'

const WC_URL = process.env.NEXT_PUBLIC_WC_URL || 'http://localhost:8181'
const WC_KEY = process.env.NEXT_PUBLIC_WC_KEY || ''
const WC_SECRET = process.env.NEXT_PUBLIC_WC_SECRET || ''
const PRODUCT_ID = process.env.NEXT_PUBLIC_COMPOSITE_PRODUCT_ID || ''

const FALLBACK = {
  basePrice: 980,
  metalPrices: {
    '14k-white': 0, '14k-yellow': 0, '14k-rose': 0,
    '18k-white': 200, '18k-yellow': 200, '18k-rose': 200,
    platinum: 500, palladium: 350,
  },
  stonePrices: {
    round: 0, oval: 50, princess: 0, cushion: 75, marquise: 100,
    pear: 80, emerald: 120, radiant: 90, asscher: 150, heart: 200,
  },
}

function wcFetch(path: string, params = '') {
  return fetch(
    `${WC_URL}/wp-json/wc/v3${path}?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}${params}`,
    { cache: 'no-store' }
  )
}

export async function GET() {
  if (!PRODUCT_ID || !WC_KEY) return NextResponse.json(FALLBACK)

  try {
    const productRes = await wcFetch(`/products/${PRODUCT_ID}`)
    if (!productRes.ok) return NextResponse.json(FALLBACK)
    const product = await productRes.json()

    const basePrice = parseFloat(product.price) || 980

    // Extract sub-product IDs stored as meta by setup.sh
    const meta: Record<string, string> = {}
    for (const m of product.meta_data ?? []) meta[m.key] = m.value

    const subIds = Object.entries(meta)
      .filter(([k]) => k.startsWith('metal_product_') || k.startsWith('stone_product_'))
      .map(([, v]) => v)
      .filter(Boolean)

    if (!subIds.length) return NextResponse.json({ ...FALLBACK, basePrice })

    // Batch fetch all sub-products in one request
    const subRes = await wcFetch('/products', `&include=${subIds.join(',')}&per_page=30`)
    if (!subRes.ok) return NextResponse.json({ ...FALLBACK, basePrice })
    const subProducts: { sku: string; price: string }[] = await subRes.json()

    const metalPrices: Record<string, number> = {}
    const stonePrices: Record<string, number> = {}

    for (const p of subProducts) {
      const price = parseFloat(p.price) || 0
      if (p.sku?.startsWith('metal-')) metalPrices[p.sku.slice(6)] = price
      else if (p.sku?.startsWith('stone-')) stonePrices[p.sku.slice(6)] = price
    }

    return NextResponse.json({ basePrice, metalPrices, stonePrices })
  } catch {
    return NextResponse.json(FALLBACK)
  }
}
