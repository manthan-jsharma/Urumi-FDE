# Aurelia — 3D Ring Configurator

A headless WooCommerce-backed engagement ring configurator built as a take-home prototype for Urumi AI's Forward Deployed Engineer role.

A premium 3D product experience where a shopper can rotate a ring, switch metals live, swap the center stone, see the price update in real time from WooCommerce, add to cart, and check out — all within a dark-luxury branded interface.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) |
| 3D | React Three Fiber + Three.js |
| Post-FX | @react-three/postprocessing (Bloom + DOF) |
| Animation | GSAP + Framer Motion |
| State | Zustand |
| Backend | WordPress + WooCommerce (Docker / InstaWP) |

---

## How to Run

### Prerequisites
- Node 18+
- Docker Desktop

### 1. Start WooCommerce backend

```bash
cd aurelia/docker
docker compose up -d
```

Wait ~30 seconds, then run the setup script:

```bash
cd aurelia
./setup.sh http://localhost:8181
```

This installs WooCommerce, creates the composite ring product with metal/stone sub-products, and outputs API credentials.

### 2. Configure environment

Create `aurelia/apps/web/.env.local`:

```env
NEXT_PUBLIC_WC_URL=http://localhost:8181
NEXT_PUBLIC_WC_KEY=<key from setup output>
NEXT_PUBLIC_WC_SECRET=<secret from setup output>
NEXT_PUBLIC_COMPOSITE_PRODUCT_ID=<id from setup output>
```

### 3. Start frontend

```bash
cd aurelia/apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing — full-viewport hero with animated 3D ring |
| `/ring-3d` | Isolated 3D preview with cinematic camera intro |
| `/select` | Ring style browser (Twist, Solitaire, Hidden Halo) |
| `/configure` | Main configurator — metal + stone picker, live price, add to cart |
| `/checkout` | Custom Aurelia-branded checkout — places order in WooCommerce |

---

## Architecture

See [ARCHITECTURE.md](aurelia/apps/web/ARCHITECTURE.md) for the full data-flow diagram from frontend interaction → WooCommerce cart.

---

## What I'd Build Next

1. Real GLB ring model — procedural geometry works for prototype, a sculpted mesh reads better at hero scale
2. Vercel + Railway deploy — frontend on Vercel, WordPress on Railway with persistent MySQL
3. Band width + setting style selectors — WooCommerce composite structure already supports additional axes
4. Mobile layout — stacked portrait with bottom-sheet controls
5. Engraving text input — wired to order line_item meta
