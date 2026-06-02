# Architecture — Aurelia Ring Configurator

## Overview

Headless WooCommerce backend + Next.js frontend. WooCommerce holds product data and pricing; the frontend owns the entire customer-facing UI including checkout.

---

## Data Flow

```
Browser                       Next.js (localhost:3000)         WooCommerce (localhost:8181)
  |                                   |                                  |
  |  GET /configure                   |                                  |
  |---------------------------------->|                                  |
  |  <ConfiguratorLayout renders>     |                                  |
  |                                   |                                  |
  |  usePrice() mounts                |                                  |
  |                                   |  GET /api/wc/price               |
  |                                   |--------------------------------->|
  |                                   |  (fetches main product meta,    |
  |                                   |   batch-fetches sub-products)   |
  |                                   |<---------------------------------|
  |                                   |  { basePrice, metalPrices,      |
  |                                   |    stonePrices }                |
  |  price shown: $X,XXX              |                                  |
  |<----------------------------------|                                  |
  |                                   |                                  |
  |  User picks metal / stone         |                                  |
  |  (local calc, no network)         |                                  |
  |  price updates instantly          |                                  |
  |                                   |                                  |
  |  "Add to Ring" clicked            |                                  |
  |  → Zustand cartItems += item      |                                  |
  |  → CartDrawer opens               |                                  |
  |                                   |                                  |
  |  "Proceed to Checkout" clicked    |                                  |
  |  router.push('/checkout')  ←── SPA navigation, store preserved     |
  |                                   |                                  |
  |  CheckoutPage reads cartItems     |                                  |
  |  from Zustand store               |                                  |
  |                                   |                                  |
  |  User fills billing form          |                                  |
  |  "Place Order" clicked            |                                  |
  |                                   |  POST /api/wc/order              |
  |                                   |--------------------------------->|
  |                                   |  WC REST v3: POST /orders        |
  |                                   |  line_items with metal/stone    |
  |                                   |  as order_item_meta             |
  |                                   |<---------------------------------|
  |                                   |  { id: 42, order_key: ... }     |
  |  Order confirmed #42              |                                  |
  |<----------------------------------|                                  |
```

---

## WooCommerce Product Structure

```
Composite Product: "Aurelia Twist Ring"  (ID: 29)
  meta_data:
    _aurelia_metal_ids  → [30, 31, 32, 33]   (Simple Product IDs)
    _aurelia_stone_ids  → [34, 35, 36, 37]

  Sub-product 30: SKU "metal-14k-yellow", price $0 (base includes yellow)
  Sub-product 31: SKU "metal-14k-white",  price $120
  Sub-product 32: SKU "metal-18k-rose",   price $180
  Sub-product 33: SKU "metal-platinum",   price $380
  Sub-product 34: SKU "stone-round",      price $0  (base includes round)
  Sub-product 35: SKU "stone-oval",       price $200
  Sub-product 36: SKU "stone-princess",   price $150
  Sub-product 37: SKU "stone-cushion",    price $120
```

**Why this structure?** WooCommerce doesn't natively support "select from a matrix of options, each with independent pricing" outside of variable products (which limit you to ~50 variations). Storing sub-product IDs as meta on the parent keeps all pricing in WC admin, accessible via the standard REST API, and extensible to any number of axes without new SKU explosion.

---

## Pricing API

`GET /api/wc/price` is a Next.js route handler (server-side proxy):

1. Fetch main product → extract `_aurelia_metal_ids` and `_aurelia_stone_ids` from meta_data
2. Batch fetch all sub-products in a single `?include=30,31,32,33,34,35,36,37` request
3. Parse SKU prefix (`metal-` / `stone-`) to build lookup tables
4. Return `{ basePrice, metalPrices: { '14k-yellow': 0, ... }, stonePrices: { round: 0, ... } }`

The frontend caches this response in a ref (`pricingRef`) on mount. Metal/stone selection changes trigger only a local addition — no subsequent network calls.

---

## 3D Rendering

```
Canvas (React Three Fiber)
  ├── LightTentEnvironment   — HDR env map (studio preset), sets scene.background
  │                            → required for MeshPhysicalMaterial transmission
  ├── RingMesh               — procedural band geometry + diamond gem
  │   ├── Band meshes        — MeshPhysicalMaterial, metalKey drives color/roughness/metalness
  │   └── Diamond gem        — makeDiamond() → faceted group
  │       ├── Table           CylinderGeometry (N-gon cap)
  │       ├── Crown star zone CylinderGeometry open-ended (table→mid, rotated π/N)
  │       ├── Crown kite zone CylinderGeometry open-ended (mid→girdle)
  │       ├── Girdle          CylinderGeometry (thin ring)
  │       └── Pavilion        ConeGeometry (inverted, N faces → culet)
  │           Material: MeshPhysicalMaterial
  │             transmission: 0.88, ior: 2.42, flatShading: true
  │             iridescence: 0.5, iridescenceIOR: 2.0
  │             → flatShading makes each facet reflect at a unique angle
  │             → iridescence fakes chromatic dispersion (diamond fire)
  ├── PostFX                 — bloom + depth-of-field + vignette
  └── OrbitControls          — enableDamping, dampingFactor 0.04
```

**Why `flatShading: true`?** Each polygon face gets its own surface normal (computed via screen-space derivatives). Adjacent facets reflect/refract at different angles, producing the characteristic "fire and brilliance" contrast pattern of a real cut stone. Without flat shading, the smooth interpolated normals produce a marble-like gradient with no facet definition.

---

## State Management

Zustand store (`lib/store.ts`):

```ts
metal: string           // '14k-yellow' | '14k-white' | '18k-rose' | 'platinum'
stone: string           // 'round' | 'oval' | 'princess' | 'cushion' | ...
price: number           // computed from WC pricing data
cartItems: CartItem[]   // [{ id, metalLabel, stoneLabel, price }]
cartOpen: boolean
```

**Critical:** CartDrawer navigates to `/checkout` via `router.push()` (SPA navigation), not `<a href>`. A full-page reload wipes the Zustand store. The checkout page reads `cartItems` directly — no re-fetch needed.

---

## Key File Map

```
aurelia/
├── docker/
│   ├── docker-compose.yml          WordPress + MySQL + WP-CLI
│   └── wordpress/
│       ├── cors.php                MU-plugin: CORS headers, HTTPS scope fix
│       └── setup.sh               WP-CLI: install WC, create products, emit API keys
└── apps/web/
    ├── app/
    │   ├── page.tsx                Landing page
    │   ├── ring-3d/page.tsx        Isolated 3D preview
    │   ├── select/page.tsx         Ring style browser
    │   ├── configure/page.tsx      Configurator
    │   ├── checkout/page.tsx       Checkout
    │   └── api/
    │       ├── wc/price/route.ts   Pricing proxy → WooCommerce
    │       └── wc/order/route.ts   Order creation → WooCommerce
    ├── components/
    │   ├── three/
    │   │   ├── RingMesh.tsx        Procedural ring + diamond geometry
    │   │   ├── StoneThumb.tsx      Mini 3D stone picker thumbnails
    │   │   ├── LightTentEnvironment.tsx  HDR env map wrapper
    │   │   ├── PostFX.tsx          Bloom + DOF + vignette
    │   │   └── Ring3DView.tsx      Hero 3D view with camera intro
    │   ├── configurator/
    │   │   └── ConfiguratorLayout.tsx   Main configurator UI + metal/stone picker
    │   ├── checkout/
    │   │   └── CheckoutPage.tsx    Aurelia-branded checkout form
    │   └── ui/
    │       ├── CartDrawer.tsx      Slide-in cart
    │       └── PageTransition.tsx  SPA page transitions
    ├── hooks/
    │   ├── usePrice.ts             Fetches pricing once, recalculates locally
    │   └── useCart.ts              Add-to-cart logic
    └── lib/
        ├── store.ts                Zustand store
        ├── materials.ts            Metal config (color, roughness, metalness)
        └── woocommerce.ts          WC REST API helpers + pricing fetch
```
