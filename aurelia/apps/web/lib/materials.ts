export interface MetalConfig {
  color: string
  metalness: number
  roughness: number
  envMapIntensity: number
  clearcoat: number
  clearcoatRoughness: number
  label: string
  shortLabel: string
  price: number
}

export interface StoneConfig {
  label: string
  price: number
  has3D: boolean
}

// Physical accuracy targets for polished jewelry:
// - metalness: 0.95–1.0  (gold/platinum are fully metallic)
// - roughness: 0.03–0.08  (mirror-polished surface)
// - envMapIntensity: 3–5  (strong IBL so environment reflections read)
// - clearcoat: adds the secondary gloss layer visible in jewelry photography

export const METAL_CONFIGS: Record<string, MetalConfig> = {
  '14k-white': {
    color: '#E2E2EC',
    metalness: 0.96,
    roughness: 0.06,
    envMapIntensity: 3.5,
    clearcoat: 0.7,
    clearcoatRoughness: 0.04,
    label: '14K White Gold',
    shortLabel: '14K White',
    price: 0,
  },
  '14k-yellow': {
    color: '#D4A832',
    metalness: 0.95,
    roughness: 0.07,
    envMapIntensity: 3.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
    label: '14K Yellow Gold',
    shortLabel: '14K Yellow',
    price: 0,
  },
  '14k-rose': {
    color: '#C8805A',
    metalness: 0.95,
    roughness: 0.07,
    envMapIntensity: 3.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
    label: '14K Rose Gold',
    shortLabel: '14K Rose',
    price: 0,
  },
  '18k-white': {
    color: '#EDEDF5',
    metalness: 0.98,
    roughness: 0.04,
    envMapIntensity: 4.2,
    clearcoat: 0.9,
    clearcoatRoughness: 0.02,
    label: '18K White Gold',
    shortLabel: '18K White',
    price: 200,
  },
  '18k-yellow': {
    color: '#E8B830',
    metalness: 0.97,
    roughness: 0.05,
    envMapIntensity: 4.0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.03,
    label: '18K Yellow Gold',
    shortLabel: '18K Yellow',
    price: 200,
  },
  '18k-rose': {
    color: '#DC9870',
    metalness: 0.97,
    roughness: 0.05,
    envMapIntensity: 4.0,
    clearcoat: 0.75,
    clearcoatRoughness: 0.03,
    label: '18K Rose Gold',
    shortLabel: '18K Rose',
    price: 200,
  },
  platinum: {
    color: '#E8E8F2',
    metalness: 1.0,
    roughness: 0.03,
    envMapIntensity: 5.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    label: 'Platinum',
    shortLabel: 'Platinum',
    price: 500,
  },
  palladium: {
    color: '#DADAE8',
    metalness: 0.99,
    roughness: 0.04,
    envMapIntensity: 4.5,
    clearcoat: 0.9,
    clearcoatRoughness: 0.02,
    label: 'Palladium',
    shortLabel: 'Palladium',
    price: 350,
  },
}

export const STONE_CONFIGS: Record<string, StoneConfig> = {
  round:    { label: 'Round',    price: 0,   has3D: true  },
  oval:     { label: 'Oval',     price: 50,  has3D: true  },
  princess: { label: 'Princess', price: 0,   has3D: true  },
  cushion:  { label: 'Cushion',  price: 75,  has3D: true  },
  marquise: { label: 'Marquise', price: 100, has3D: true  },
  pear:     { label: 'Pear',     price: 80,  has3D: true  },
  emerald:  { label: 'Emerald',  price: 120, has3D: false },
  radiant:  { label: 'Radiant',  price: 90,  has3D: false },
  asscher:  { label: 'Asscher',  price: 150, has3D: false },
  heart:    { label: 'Heart',    price: 200, has3D: false },
}

export const DEFAULT_METAL = '14k-yellow'
export const DEFAULT_STONE = 'round'
export const BASE_RING_PRICE = 980
