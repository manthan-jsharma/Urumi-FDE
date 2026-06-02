'use client'

import { useState } from 'react'
import { addToCart as apiAddToCart } from '@/lib/woocommerce'
import { useConfigStore } from '@/lib/store'
import { METAL_CONFIGS, STONE_CONFIGS } from '@/lib/materials'
function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function useCart() {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const metal = useConfigStore((s) => s.metal)
  const stone = useConfigStore((s) => s.stone)
  const price = useConfigStore((s) => s.price)
  const addCartItem = useConfigStore((s) => s.addCartItem)
  const setCartOpen = useConfigStore((s) => s.setCartOpen)

  async function handleAddToCart() {
    if (adding) return
    setAdding(true)
    setAdded(false)

    const metalLabel = METAL_CONFIGS[metal]?.label ?? metal
    const stoneLabel = STONE_CONFIGS[stone]?.label ?? stone
    const finalPrice = price ?? 980

    try {
      await apiAddToCart({
        metalKey: metal,
        stoneKey: stone,
        metalLabel,
        stoneLabel,
        price: finalPrice,
      })

      addCartItem({
        id: generateId(),
        metalKey: metal,
        metalLabel,
        stoneKey: stone,
        stoneLabel,
        price: finalPrice,
        quantity: 1,
      })

      setAdded(true)
      setTimeout(() => {
        setCartOpen(true)
        setAdded(false)
      }, 800)
    } catch (err) {
      console.error('Add to cart failed:', err)
    } finally {
      setAdding(false)
    }
  }

  return { handleAddToCart, adding, added }
}
