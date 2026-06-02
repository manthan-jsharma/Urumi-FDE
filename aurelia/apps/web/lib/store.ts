import { create } from 'zustand'
import { DEFAULT_METAL, DEFAULT_STONE } from './materials'

export interface CartItem {
  id: string
  metalKey: string
  metalLabel: string
  stoneKey: string
  stoneLabel: string
  price: number
  quantity: number
}

interface ConfigStore {
  // Selections
  metal: string
  stone: string

  // Pricing
  price: number | null
  priceLoading: boolean

  // Cart
  cartCount: number
  cartItems: CartItem[]
  cartOpen: boolean

  // UI
  userInteracting: boolean
  showCallout: boolean

  // Actions
  setMetal: (metal: string) => void
  setStone: (stone: string) => void
  setPrice: (price: number | null) => void
  setPriceLoading: (v: boolean) => void
  setCartOpen: (open: boolean) => void
  addCartItem: (item: CartItem) => void
  setUserInteracting: (v: boolean) => void
  setShowCallout: (v: boolean) => void
}

export const useConfigStore = create<ConfigStore>((set) => ({
  metal: DEFAULT_METAL,
  stone: DEFAULT_STONE,
  price: null,
  priceLoading: false,
  cartCount: 0,
  cartItems: [],
  cartOpen: false,
  userInteracting: false,
  showCallout: false,

  setMetal: (metal) => set({ metal }),
  setStone: (stone) => set({ stone }),
  setPrice: (price) => set({ price }),
  setPriceLoading: (priceLoading) => set({ priceLoading }),
  setCartOpen: (cartOpen) => set({ cartOpen }),
  addCartItem: (item) =>
    set((state) => ({
      cartCount: state.cartCount + 1,
      cartItems: [...state.cartItems, item],
    })),
  setUserInteracting: (userInteracting) => set({ userInteracting }),
  setShowCallout: (showCallout) => set({ showCallout }),
}))
