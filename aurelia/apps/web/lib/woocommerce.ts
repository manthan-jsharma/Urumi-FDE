import { BASE_RING_PRICE, METAL_CONFIGS, STONE_CONFIGS } from './materials'

export interface WCProduct {
  id: number
  name: string
  price: string
  regular_price: string
}

export interface PricingData {
  basePrice: number
  metalPrices: Record<string, number>
  stonePrices: Record<string, number>
}

const FALLBACK_PRICING: PricingData = {
  basePrice: BASE_RING_PRICE,
  metalPrices: Object.fromEntries(Object.entries(METAL_CONFIGS).map(([k, v]) => [k, v.price])),
  stonePrices: Object.fromEntries(Object.entries(STONE_CONFIGS).map(([k, v]) => [k, v.price])),
}

export async function fetchPricing(signal?: AbortSignal): Promise<PricingData> {
  try {
    const res = await fetch('/api/wc/price', { signal })
    if (!res.ok) return FALLBACK_PRICING
    const data = await res.json()
    return {
      basePrice: data.basePrice ?? BASE_RING_PRICE,
      metalPrices: data.metalPrices ?? FALLBACK_PRICING.metalPrices,
      stonePrices: data.stonePrices ?? FALLBACK_PRICING.stonePrices,
    }
  } catch {
    return FALLBACK_PRICING
  }
}

export interface AddToCartPayload {
  metalKey: string
  stoneKey: string
  metalLabel: string
  stoneLabel: string
  price: number
}

export async function addToCart(payload: AddToCartPayload): Promise<{ success: boolean; cartKey?: string }> {
  const res = await fetch('/api/wc/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart_item_data: {
        aurelia_configuration: {
          metal: payload.metalKey,
          stone: payload.stoneKey,
          metal_label: payload.metalLabel,
          stone_label: payload.stoneLabel,
          configured_price: payload.price,
        },
      },
    }),
  })

  if (!res.ok) throw new Error(`Cart error: ${res.status}`)
  const data = await res.json()
  return { success: true, cartKey: data.cart_key }
}

export async function fetchCart(): Promise<{ items: CartResponseItem[]; totals: Record<string, string> }> {
  return { items: [], totals: {} }
}

export interface CartResponseItem {
  item_key: string
  name: string
  quantity: number
  price: string
  cart_item_data: {
    aurelia_configuration?: {
      metal_label: string
      stone_label: string
      configured_price: number
    }
  }
}
