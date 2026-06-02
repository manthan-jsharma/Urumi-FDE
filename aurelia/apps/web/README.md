# Aurelia — 3D Ring Configurator

A headless WooCommerce-backed engagement ring configurator built as a take-home prototype for Urumi AI's Forward Deployed Engineer role.

---

## What It Does

A premium 3D product experience where a shopper can:

- **Rotate the ring** in 3D (drag to orbit, momentum, smooth dampening)
- **Switch metals live** — 14K Yellow, 14K White, 18K Rose, Platinum — material changes instantly on the 3D model
- **Swap the center stone** — Round, Oval, Princess, Cushion (and more) — procedurally generated faceted geometry with a real diamond shader
- **See the price update live** — pulled from WooCommerce, not hardcoded
- **Add to cart** — cart drawer reflects exact metal/stone configuration
- **Check out** — custom Aurelia-branded checkout page, order created in WooCommerce via REST API

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR where needed, easy Vercel deploy, RSC for dynamic imports |
| 3D | React Three Fiber + Three.js | Declarative scene graph on top of WebGL; Drei utilities save considerable boilerplate |
| Post-FX | @react-three/postprocessing | Bloom + DOF in a single EffectComposer pass |
| Animation | GSAP + Framer Motion | GSAP for camera/GSAP timeline; Framer for UI transitions |
| State | Zustand | Minimal, non-context store; survives SPA navigation |
| Backend | WordPress + WooCommerce (Docker) | Headless via WC REST API v3; composite product structure drives config pricing |

**Why React Three Fiber over Babylon.js?** The React component model integrates naturally with Next.js. The Drei ecosystem provides ContactShadows, Environment, OrbitControls out of the box. Three.js's MeshPhysicalMaterial has first-class `transmission` support needed for realistic diamond rendering.

**Why procedural geometry over 3D scans?** No GLB assets were provided. Procedurally generated faceted gem geometry — two-layer crown (star zone + kite zone) + pavilion cone + girdle — with `flatShading: true` and `transmission` produces visually compelling results without any 3D scanning pipeline. Future version could layer in Tripo3D-generated assets.

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

Wait ~30 seconds for WordPress to initialize, then run the setup script:

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
| `/checkout` | Custom Aurelia checkout — places order in WooCommerce |

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full data-flow diagram.

---

## What I'd Build Next

1. **Real GLB ring model** — import a proper sculpted mesh; the procedural approach is good for a prototype but a hand-modelled ring reads better at hero scale
2. **Vercel + Railway deploy** — frontend on Vercel, WordPress on Railway with a persistent MySQL volume; `docker compose up` is fine locally but a live URL is better for stakeholders
3. **Band width + setting style selectors** — WooCommerce composite product structure already supports additional variation axes
4. **Mobile layout** — the configurator is desktop-first; a stacked portrait layout with a smaller canvas and bottom-sheet controls would work well on mobile
5. **Engraving text input** — simple `<input>` wired to a line_item meta field in the order
6. **360 video fallback** — for devices that can't run WebGL (low-end Android), swap to a pre-baked video loop

---

## Time Spent

~18 hours total. The biggest time sinks were:
- WooCommerce REST API auth scoping (HTTPS spoof needed for local docker + auth header handling)
- Diamond shader tuning — `transmission`, `iridescence`, `flatShading` interaction with env map background
- Building a custom checkout to avoid WooCommerce's native PHP checkout (CoCart server-side calls don't share browser session)
