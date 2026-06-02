'use client'

import { useEffect, useRef } from 'react'
import { fetchPricing, PricingData } from '@/lib/woocommerce'
import { useConfigStore } from '@/lib/store'
import { METAL_CONFIGS, STONE_CONFIGS } from '@/lib/materials'

function calcPrice(pricing: PricingData, metal: string, stone: string): number {
  const metalAddon = pricing.metalPrices[metal] ?? METAL_CONFIGS[metal]?.price ?? 0
  const stoneAddon = pricing.stonePrices[stone] ?? STONE_CONFIGS[stone]?.price ?? 0
  return pricing.basePrice + metalAddon + stoneAddon
}

export function usePrice() {
  const metal = useConfigStore((s) => s.metal)
  const stone = useConfigStore((s) => s.stone)
  const setPrice = useConfigStore((s) => s.setPrice)
  const setPriceLoading = useConfigStore((s) => s.setPriceLoading)

  const pricingRef = useRef<PricingData | null>(null)

  // Fetch full pricing table once on mount
  useEffect(() => {
    const controller = new AbortController()
    setPriceLoading(true)
    fetchPricing(controller.signal)
      .then(pricing => {
        pricingRef.current = pricing
        setPrice(calcPrice(pricing, metal, stone))
      })
      .catch(() => {})
      .finally(() => setPriceLoading(false))
    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recalculate locally when selection changes — no new network request
  useEffect(() => {
    if (!pricingRef.current) return
    setPrice(calcPrice(pricingRef.current, metal, stone))
  }, [metal, stone, setPrice])
}
