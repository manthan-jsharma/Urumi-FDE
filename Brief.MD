# Aurelia — 3D Engagement Ring Configurator

## Complete Claude Code Build Brief

> You are building a **production-grade, premium 3D engagement ring configurator** as a take-home assignment for Urumi AI (a Forward Deployed Engineering firm). Read every word of this brief before writing a single line of code. The evaluation judges end-user feel, visual fidelity, WooCommerce integration, code quality, decision-making, and self-direction. Every bonus item must be attempted.

---

## 0. Context & References

**What this is:** A headless WooCommerce-powered engagement ring configurator with a cinematic landing page and a Royal Enfield–quality 3D configurator. The reference ring is the **DoAmore Twist Ring** — two intertwined bands (one pavé diamonds, one plain metal), center stone in four claw prongs.

**Design inspiration:**

- DoAmore.com — premium DTC jewelry brand, restrained typography, warm cream/dark palette
- Royal Enfield "Make It Yours" configurator — product takes 70% of screen, UI wraps it, floating 3D callouts, showroom environment background
- Lusion.co — scroll animation quality, cinematic camera moves, WebGL + GSAP integration

**Feel calibration:** Royal Enfield Goan 350 configurator interaction feel — smooth transitions, premium materials, zero jank. Not the UI or fidelity level. Just the feel.

**We have:** A GLB file of the Twist ring from Tripo3D (basic mesh, needs R3F material enhancement and also react three fibre enhancement).

---

## 1. Project Structure

```
aurelia/
├── apps/
│   ├── web/                          # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page /
            ├── select/
│   │           └── page.tsx                  # Ring selector /select
│   │   │   ├── configure/
│   │   │   │   └── page.tsx          # Configurator /configure
│   │   │   ├── ring-3d/
│   │   │   │   └── page.tsx          # Bonus Tripo3D page /ring-3d
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── three/                # All R3F components
│   │   │   │   ├── RingScene.tsx     # Main 3D ring scene
│   │   │   │   ├── RingMesh.tsx      # Ring mesh + materials
│   │   │   │   ├── DiamondMesh.tsx   # Center stone mesh
│   │   │   │   ├── Environment.tsx   # Lighting + HDRI
│   │   │   │   ├── StoneThumb.tsx    # 3D stone thumbnail canvas
│   │   │   │   ├── MetalThumb.tsx    # 3D metal swatch canvas
│   │   │   │   └── PostFX.tsx        # Bloom, vignette, chromatic ab
            ├── selector/
                ├── RingSelector.tsx   # Model selection page
                └── RingCarousel.tsx   # Arrow navigation between
│   │   │   ├── landing/
│   │   │   │   ├── Hero.tsx          # Full viewport hero section
│   │   │   │   ├── HorizontalFeatures.tsx  # Pinned horizontal scroll
│   │   │   │   ├── MetalsTeaser.tsx  # Scroll-driven metal swap
│   │   │   │   ├── Testimonials.tsx  # Testimonials + marquee
│   │   │   │   └── FinalCTA.tsx      # Pre-configurator CTA
│   │   │   ├── configurator/
│   │   │   │   ├── ConfiguratorLayout.tsx
│   │   │   │   ├── StonePicker.tsx   # 10 stones (6 3D + 4 flat)
│   │   │   │   ├── MetalPicker.tsx   # 8 metals (all 3D swatches)
│   │   │   │   ├── PriceDisplay.tsx  # Live price from WooCommerce
│   │   │   │   ├── AddToCart.tsx     # Cart integration
│   │   │   │   └── FloatingCallout.tsx  # RE-style 3D space labels
│   │   │   └── ui/
│   │   │       ├── CustomCursor.tsx
│   │   │       ├── PageTransition.tsx
│   │   │       └── CartDrawer.tsx
│   │   ├── lib/
│   │   │   ├── woocommerce.ts        # WooCommerce REST API client
│   │   │   ├── store.ts              # Zustand config store
│   │   │   └── materials.ts          # PBR material configs
│   │   ├── hooks/
│   │   │   ├── useRingMaterials.ts
│   │   │   ├── usePrice.ts           # Debounced price fetching
│   │   │   └── useCart.ts
│   │   └── public/
│   │       └── models/
│   │           └── twist-ring.glb    # YOUR GLB GOES HERE
├── docker/
│   ├── docker-compose.yml
│   ├── wordpress/
│   │   └── setup.sh                  # WooCommerce seed script
│   └── nginx/
│       └── nginx.conf
└── README.md
```

---

## 2. Tech Stack — Non-Negotiable

| Layer              | Choice                                     | Version         | Reason                                           |
| ------------------ | ------------------------------------------ | --------------- | ------------------------------------------------ |
| Framework          | Next.js                                    | 14 (App Router) | SSR + fast hydration + Vercel deploy             |
| 3D Engine          | React Three Fiber                          | ^8              | Declarative, best DX for material swaps          |
| 3D Helpers         | @react-three/drei                          | latest          | OrbitControls, Environment, Html, ContactShadows |
| Post-processing    | @react-three/postprocessing                | latest          | Bloom, Vignette, ChromaticAberration             |
| Scroll             | Lenis                                      | latest          | Smooth scroll, GSAP integration                  |
| Animations         | GSAP + ScrollTrigger                       | 3.x             | Camera moves, pinned sections, text reveals      |
| Spring animations  | react-spring                               | ^9              | Material lerp, UI micro-animations               |
| State              | Zustand                                    | ^4              | Configurator state                               |
| Page transitions   | Framer Motion                              | ^11             | Route transitions, UI animations                 |
| Styling            | Tailwind CSS                               | ^3              | Utility classes                                  |
| Backend            | WordPress + WooCommerce                    | latest          | Per brief requirement                            |
| Cart API           | CoCart                                     | ^3              | Headless cart REST API                           |
| Composite Products | WooCommerce Composite Products             | latest          | Multi-component product                          |
| Container          | Docker Compose                             | -               | One-command setup                                |
| Deploy             | Vercel (frontend) + Fly.io or Railway (WP) | -               | Live URL                                         |

---

## 3. Landing Page — `/`

### Visual Identity (non-negotiable)

- Background: `#0a0a0a` (near black) throughout
- Primary accent: `#c9a84c` (warm gold)
- Typography: Cormorant Garamond (serif, editorial) + Inter (sans, UI)
- All section transitions: Lenis smooth scroll + GSAP ScrollTrigger
- Custom cursor: small gold dot that scales on hover over interactive elements

### Section 01 — Cinematic Hero (full viewport)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ · AURELIA                              CONFIGURE →  │
│                                                     │
│   YOURS.     [    3D RING    ]                      │
│              [  auto-rotating ]    FOREVER.         │
│                                                     │
│              [ CONFIGURE YOURS → ]                  │
│                    ↓ scroll                         │
└─────────────────────────────────────────────────────┘
```

**Implementation:**

- Full viewport `<Canvas>` behind DOM text (pointer-events: none on canvas)
- Ring auto-rotates at 0.003 rad/frame around Y axis, slight wobble on X
- "YOURS." text left-aligned, "FOREVER." right-aligned, both at `clamp(8vw, 12vw, 160px)`
- Font: Cormorant Garamond, weight 300, letter-spacing 0.05em
- On page load: GSAP timeline — letters reveal from `y: 60, opacity: 0` staggered 0.04s each using `gsap.utils.splitText` equivalent (split by character, wrap in spans)
- Ring enters: scale from 0.7 to 1.0 with spring easing over 1.2s
- Diamond sparkle: CSS `@keyframes` pulsing `filter: brightness()` on the stone material
- Nav: `letter-spacing: 0.15em`, font-size 11px, weight 400, uppercase — "· AURELIA" left, "CONFIGURE →" right
- "CONFIGURE YOURS →" CTA: thin border button, 11px spaced caps, hover: background fills gold, text goes dark. Magnetic effect on mouse proximity (within 80px, button follows cursor at 0.3 intensity)

**R3F Scene:**

```tsx
// Hero ring scene — passive mode
<Canvas camera={{ position: [0, 0, 4], fov: 35 }}>
  <Environment preset="studio" />
  <RingMesh autoRotate />
  <ContactShadows opacity={0.4} blur={2} />
  <EffectComposer>
    <Bloom intensity={0.3} luminanceThreshold={0.8} />
    <Vignette darkness={0.4} />
    <ChromaticAberration offset={[0.0005, 0.0005]} />
  </EffectComposer>
</Canvas>
```

### Section 02 — Scroll-driven ring transformation

As user scrolls past hero, GSAP ScrollTrigger drives the Three.js camera:

```js
gsap.to(cameraRef.current.position, {
  x: -2,
  y: 0.5,
  z: 6,
  scrollTrigger: {
    trigger: "#features-section",
    start: "top bottom",
    end: "top top",
    scrub: 1.5,
  },
});
// Ring rotation also driven by scroll progress
```

The ring tilts and camera orbits — it feels like you're walking around it.

### Section 03 — Horizontal Pinned Features Scroll

**Implementation:**

```js
// GSAP horizontal pin
gsap.to(".features-track", {
  x: () =>
    -(
      document.querySelector(".features-track").scrollWidth - window.innerWidth
    ),
  ease: "none",
  scrollTrigger: {
    trigger: ".features-wrapper",
    pin: true,
    scrub: 1,
    end: () => "+=" + document.querySelector(".features-track").scrollWidth,
  },
});
```

**4 Feature Cards (slide in horizontally):**

Card 1 — "Rotate in 3D"

- Micro-animation: small ring icon rotating in CSS 3D
- Body: "Drag, spin, inspect from every angle. See the pavé catch light. See the twist unfurl."

Card 2 — "Switch Metals Live"

- Micro-animation: color swatch morphing gold → white → rose
- Body: "14K to 18K. White, yellow, rose. Platinum. Eight options, all rendered in real-time PBR."

Card 3 — "Swap the Stone"

- Micro-animation: shape morphing round → oval → princess
- Body: "Ten diamond shapes. Six rendered in 3D with transmission shaders. See the difference before you decide."

Card 4 — "Price Updates Instantly"

- Micro-animation: price counter ticking up/down
- Body: "Every configuration pulls live pricing from our store. No guessing. No surprises at checkout."

**Card design:** Dark surface `#111`, 1px border `#c9a84c33`, Cormorant heading 28px, Inter body 14px, padding 48px. Card enters with `y: 40, opacity: 0` → `y: 0, opacity: 1` as it enters viewport within horizontal track.

## 3.5 Ring Selector Page — `/select`

### Purpose

Intermediate step between landing and configurator.
User picks WHICH ring style before configuring it.
Mirrors Royal Enfield's model selection page exactly.

### Journey

Landing (/) → [CONFIGURE YOURS] → /select → [CONFIGURE NOW] → /configure

### Layout

Full viewport, pure black #0a0a0a.

GHOST TEXT: Ring name enormous behind the ring.
"TWIST RING" — Cormorant Garamond, 18vw, opacity 0.06,
centered, letter-spacing 0.2em. Not readable, just texture.

CENTER: 3D ring, same GLB, same materials as configurator.
Auto-rotating slowly. No orbit controls here — passive display.
Ring is 50% of viewport height. Centered horizontally.

NAVIGATION ARROWS:
Left arrow (<<<) and right arrow (>>>) to cycle ring styles.
Style: thin, gold #c9a84c, not filled buttons — just chevron glyphs.
Font: 24px, letter-spacing 0.3em.
On click: ring fades out (opacity 0, scale 0.95, 0.3s),
new ring fades in (opacity 1, scale 1, 0.3s ease-out).
Ghost text crossfades simultaneously.

RING NAME: Below the ring, centered.
Cormorant Garamond, 28px, weight 400.
With a small dropdown chevron — clicking shows all ring styles
as a list (same pattern as RE's model dropdown).

VARIANT PILLS: Below ring name.
E.g. "Pavé Band" / "Plain Band" for Twist Ring.
Dark surface pill #1a1a1a, 1px border #333.
Selected: border #c9a84c, text #c9a84c.
Horizontal row, centered, gap 12px.
Switching variant pill updates the 3D ring material live.

CTA: "CONFIGURE NOW →"
Same button as landing — thin border, tracked caps, 11px.
On click: ring scales up slightly (GSAP, scale 1→1.08, 0.3s),
then route pushes to /configure.
The ring position and scale animate into the configurator
canvas position (same canvas persistence technique).

TOP LEFT: "← Back" — Inter 12px, tracked caps, links to /
TOP RIGHT: Ring count indicator "01 / 03" — Inter 11px, color #555

### Ring Styles to Cycle Through (3 total)

1. Twist Ring (default) — "Two paths. One story."
2. Classic Solitaire — "The original. Perfected."
3. Hidden Halo — "Beauty in the details."

Each has its own ghost text, variant pills, and 3D representation.
Use the same GLB for all three — differentiate via material/lighting
changes since you may not have 3 separate GLB files. Document this
decision in README.

### Animation on Page Entry

From landing → /select:

- Ghost text fades in from opacity 0, y: 20 → 0, duration 0.8s
- Ring rises from y: 30 → 0, opacity 0 → 1, duration 1s, ease power3.out
- Arrows and pills fade in staggered after ring, 0.15s delay each
- No abrupt loads — everything breathes in

### Why This Page Exists (README note)

"Added a model selection intermediate step mirroring Royal Enfield's
pre-configurator flow. This gives users a moment to orient before
making detailed decisions, matches premium jewelry brand conventions
(brands like Tiffany show collection first, then customization),
and provides an additional canvas to showcase 3D rendering quality."

### Section 04 — Metals Teaser (Scroll-driven material swap)

Three full-height panels stacked vertically. Ring stays centered (sticky), panel text scrolls over it. As each panel enters, the ring material transitions live.

```
Panel 1: "14K WHITE GOLD"  → ring material: white gold
Panel 2: "14K YELLOW GOLD" → ring material: yellow gold
Panel 3: "14K ROSE GOLD"   → ring material: rose gold
```

**Implementation:**

- Ring canvas is `position: sticky, top: 0` inside the section
- ScrollTrigger on each panel drives `useSpring` color lerp in the R3F material
- Text: metal name in Cormorant 72px, price starting from in Inter 16px, one-line description
- On panel transition: ring rotates 30° via GSAP + slight camera dolly

### Section 05 — Testimonials

**Layout:**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   "                                             │
│   In love with both my fiancé and this ring.   │
│   The yellow gold twist band is perfect.        │
│   "                                             │
│                        — Sarah M., New York     │
│                                                 │
│   [  ★★★★★  ] [  ★★★★★  ] [  ★★★★★  ]         │  ← marquee
└─────────────────────────────────────────────────┘
```

- 3 large editorial quotes, Cormorant italic 36px
- Quote marks: gold `#c9a84c`, 120px, opacity 0.15, absolutely positioned
- Author names: Inter 13px, letter-spacing 0.1em, gold
- Below: infinite horizontal marquee of 5-star review snippets, CSS animation, white text on dark, pause on hover
- Parallax: quote marks move at 0.5x scroll speed via GSAP

### Section 06 — Final CTA

- Full viewport, ring zooms in dramatically (GSAP camera push: z from 4 → 2.5)
- Large text: "MAKE IT YOURS" — Cormorant 96px
- Subtext: "Handcrafted in America. Every ring made to order."
- Button: "Configure Yours →" — same magnetic button, but larger (padding 16px 48px)
- On click: page transition — ring scales UP (GSAP scale 1 → 1.4), DOM fades out, route pushes to `/configure`, ring is waiting at the configurator

**Page Transition (critical — makes it feel premium):**

```tsx
// Use Framer Motion AnimatePresence + custom transition
// The 3D canvas persists across routes using a global canvas provider
// The ring position/camera lerps from landing hero position to configurator position
```

Use a React Context to keep the Canvas mounted across routes. On route change, GSAP animates camera to configurator position rather than destroying and recreating the scene.

---

## 4. Configurator Page — `/configure`

### Layout (Royal Enfield inspired)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back    AURELIA — TWIST RING                     🛒  Cart (0) │
├────────────────┬─────────────────────────────┬───────────────────┤
│                │                             │                   │
│  SHAPE         │                             │  14K White Gold   │
│  ┌──┐┌──┐┌──┐ │      [  3D RING  ]          │  Round Diamond    │
│  │  ││  ││  │ │                             │                   │
│  └──┘└──┘└──┘ │    (orbit controls          │  From $1,480      │
│  ┌──┐┌──┐┌──┐ │     drag to rotate)         │  Setting only     │
│  │  ││  ││  │ │                             │                   │
│  └──┘└──┘└──┘ │                             │ [  ADD TO CART  ] │
│  ┌──┐┌──┐┌──┐ │                             │                   │
│  │  ││  ││  │ │  [floating callout label]   │  Free shipping    │
│  └──┘└──┘└──┘ │                             │  Resize for life  │
│                │                             │                   │
├────────────────┴─────────────────────────────┴───────────────────┤
│  METAL:  ⬤ 14K White  ⬤ 14K Yellow  ⬤ 14K Rose  ⬤ 18K White...  │
└──────────────────────────────────────────────────────────────────┘
```

**Proportions:**

- Left panel (stone picker): `280px` fixed width
- Center (3D ring): `flex: 1`, minimum `500px`
- Right panel (price + cart): `300px` fixed width
- Bottom rail (metal picker): `64px` height
- Ring canvas: fills center panel entirely

### 4.1 — 3D Ring Scene (Configurator Mode)

```tsx
<Canvas
  camera={{ position: [0, 0.5, 3.5], fov: 40 }}
  gl={{
    antialias: true,
    alpha: false,
    toneMapping: THREE.ACESFilmicToneMapping,
  }}
>
  <color attach="background" args={["#0d0d0d"]} />

  {/* Showroom environment */}
  <Environment preset="studio" background={false} />
  <SpotLight
    position={[5, 8, 3]}
    intensity={2.5}
    angle={0.35}
    penumbra={0.8}
    castShadow
  />
  <ambientLight intensity={0.15} />

  {/* The ring */}
  <RingMesh
    metalConfig={currentMetal}
    stoneShape={currentStone}
    onPointerOver={() => setShowCallout(true)}
  />

  {/* Surface */}
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
    <planeGeometry args={[10, 10]} />
    <shadowMaterial opacity={0.4} />
  </mesh>

  <ContactShadows
    position={[0, -0.8, 0]}
    opacity={0.6}
    scale={3}
    blur={2.5}
    far={1}
  />

  {/* RE-style floating callout */}
  {showCallout && (
    <Html position={[0.8, 0.5, 0]} distanceFactor={4}>
      <FloatingCallout metal={currentMetal} stone={currentStone} />
    </Html>
  )}

  {/* Orbit controls */}
  <OrbitControls
    enablePan={false}
    minPolarAngle={Math.PI / 4}
    maxPolarAngle={Math.PI / 1.8}
    minDistance={2}
    maxDistance={6}
    dampingFactor={0.05}
    autoRotate={!userInteracting}
    autoRotateSpeed={0.5}
  />

  <EffectComposer>
    <Bloom intensity={0.4} luminanceThreshold={0.75} />
    <Vignette darkness={0.5} />
    <ChromaticAberration offset={[0.0003, 0.0003]} />
  </EffectComposer>
</Canvas>
```

### 4.2 — Ring Material Enhancement

The Tripo3D GLB is a basic mesh. We replace/enhance its materials completely:

```tsx
// lib/materials.ts
export const METAL_CONFIGS = {
  "14k-white": {
    color: "#E8E8F0",
    metalness: 0.88,
    roughness: 0.14,
    envMapIntensity: 2.5,
    label: "14K White Gold",
    price: 0,
  },
  "14k-yellow": {
    color: "#FFD066",
    metalness: 0.85,
    roughness: 0.16,
    envMapIntensity: 2.2,
    label: "14K Yellow Gold",
    price: 0,
  },
  "14k-rose": {
    color: "#E8A090",
    metalness: 0.86,
    roughness: 0.15,
    envMapIntensity: 2.3,
    label: "14K Rose Gold",
    price: 0,
  },
  "18k-white": {
    color: "#F0F0F8",
    metalness: 0.94,
    roughness: 0.08,
    envMapIntensity: 3.0,
    label: "18K White Gold",
    price: 200,
  },
  "18k-yellow": {
    color: "#FFDC80",
    metalness: 0.92,
    roughness: 0.1,
    envMapIntensity: 2.8,
    label: "18K Yellow Gold",
    price: 200,
  },
  "18k-rose": {
    color: "#F0B8A8",
    metalness: 0.9,
    roughness: 0.09,
    envMapIntensity: 2.7,
    label: "18K Rose Gold",
    price: 200,
  },
  platinum: {
    color: "#E8E8F2",
    metalness: 0.98,
    roughness: 0.05,
    envMapIntensity: 3.5,
    label: "Platinum",
    price: 500,
  },
  palladium: {
    color: "#D8D8E8",
    metalness: 0.96,
    roughness: 0.06,
    envMapIntensity: 3.2,
    label: "Palladium",
    price: 350,
  },
};

export const STONE_CONFIGS = {
  round: { label: "Round", price: 0, has3D: true },
  oval: { label: "Oval", price: 50, has3D: true },
  princess: { label: "Princess", price: 0, has3D: true },
  cushion: { label: "Cushion", price: 75, has3D: true },
  marquise: { label: "Marquise", price: 100, has3D: true },
  pear: { label: "Pear", price: 80, has3D: true },
  emerald: { label: "Emerald", price: 120, has3D: false },
  radiant: { label: "Radiant", price: 90, has3D: false },
  asscher: { label: "Asscher", price: 150, has3D: false },
  heart: { label: "Heart", price: 200, has3D: false },
};
```

**RingMesh component — material application:**

```tsx
// components/three/RingMesh.tsx
export function RingMesh({ metalConfig, stoneShape }) {
  const { scene } = useGLTF("/models/twist-ring.glb");
  const { color, metalness, roughness, envMapIntensity } = useSpring({
    color: metalConfig.color,
    metalness: metalConfig.metalness,
    roughness: metalConfig.roughness,
    envMapIntensity: metalConfig.envMapIntensity,
    config: { mass: 1, tension: 180, friction: 40 },
  });

  useEffect(() => {
    scene.traverse((node) => {
      if (node.isMesh) {
        if (node.name.includes("band") || node.name.includes("ring")) {
          // Apply metal material to band meshes
          node.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(metalConfig.color),
            metalness: metalConfig.metalness,
            roughness: metalConfig.roughness,
            envMapIntensity: metalConfig.envMapIntensity,
          });
        }
        if (node.name.includes("stone") || node.name.includes("diamond")) {
          // Apply transmission material to stone
          node.material = new THREE.MeshPhysicalMaterial({
            color: "#ffffff",
            metalness: 0,
            roughness: 0,
            transmission: 0.95,
            thickness: 0.5,
            ior: 2.42,
            envMapIntensity: 3,
            transparent: true,
          });
        }
      }
    });
  }, [metalConfig, scene]);

  return <primitive object={scene} />;
}
```

**Note on GLB mesh names:** Inspect the actual GLB with `useGLTF` and `console.log(scene)` to find real mesh names. Adjust the `node.name.includes()` checks to match your actual mesh names.

### 4.3 — Stone Picker (Left Panel)

**10 shapes total: 6 with 3D thumbnails, 4 with flat SVG fallbacks**

```tsx
// components/configurator/StonePicker.tsx
const STONE_SHAPES_3D = ['round', 'oval', 'princess', 'cushion', 'marquise', 'pear']
const STONE_SHAPES_FLAT = ['emerald', 'radiant', 'asscher', 'heart']

// 3D thumbnail geometry per shape
const STONE_GEOMETRIES = {
  round:    () => <sphereGeometry args={[0.5, 32, 32]} />,
  oval:     () => <sphereGeometry args={[0.35, 32, 32]} />,  // scaled x1.4 z
  princess: () => <boxGeometry args={[0.8, 0.4, 0.8]} />,
  cushion:  () => <RoundedBoxGeometry args={[0.8, 0.4, 0.8, 4, 0.12]} />,
  marquise: () => <LatheGeometry />,   // custom pointed oval
  pear:     () => <custom teardrop shape via Shape + ExtrudeGeometry />
}

// Each 3D thumbnail is its own Canvas
function StoneThumb3D({ shape, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 72, height: 72,
        border: selected ? '1.5px solid #c9a84c' : '1px solid #333',
        borderRadius: 8,
        cursor: 'pointer',
        background: '#111'
      }}
    >
      <Canvas camera={{ position: [0, 0, 2], fov: 40 }} gl={{ alpha: true }}>
        <Environment preset="studio" />
        <mesh>
          {STONE_GEOMETRIES[shape]()}
          <MeshTransmissionMaterial
            transmission={0.95}
            thickness={0.5}
            ior={2.42}
            roughness={0.02}
            color="#ffffff"
            envMapIntensity={3}
          />
        </mesh>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={2} />
      </Canvas>
      <div style={{ textAlign: 'center', fontSize: 10, color: '#888', padding: '4px 0' }}>
        {STONE_CONFIGS[shape].label}
      </div>
    </div>
  )
}

// Flat fallback for emerald, radiant, asscher, heart
function StoneThumbFlat({ shape, selected, onClick }) {
  // SVG illustrations of the stone shapes
  return (
    <div onClick={onClick} style={{...}}>
      <StoneSVG shape={shape} />
      <div>...</div>
    </div>
  )
}
```

**SVG Stone Illustrations for flat fallbacks (emerald, radiant, asscher, heart):**
Create clean, minimal SVG outlines for each — no fill, gold `#c9a84c` stroke, 1px. These should look like elegant jewelry sketches, not clipart.

### 4.4 — Metal Picker (Bottom Rail)

**8 metals, all as 3D mini-ring swatches:**

```tsx
// components/configurator/MetalPicker.tsx
function MetalSwatch({ metalKey, config, selected, onClick }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div
        onClick={onClick}
        style={{
          width: 48,
          height: 48,
          border: selected ? "2px solid #c9a84c" : "1px solid #333",
          borderRadius: "50%",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <Canvas
          camera={{ position: [0, 0.3, 1.8], fov: 50 }}
          gl={{ alpha: true }}
        >
          <Environment preset="studio" />
          {/* Mini ring — torus geometry */}
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[0.5, 0.15, 16, 64]} />
            <meshPhysicalMaterial
              color={config.color}
              metalness={config.metalness}
              roughness={config.roughness}
              envMapIntensity={config.envMapIntensity}
            />
          </mesh>
        </Canvas>
      </div>
      <span
        style={{
          fontSize: 9,
          color: selected ? "#c9a84c" : "#666",
          letterSpacing: "0.08em",
        }}
      >
        {config.label.replace("Gold", "").replace("14K", "14K").trim()}
      </span>
    </div>
  );
}
```

**Bottom rail layout:**

```
[METAL]  ⬤14KW  ⬤14KY  ⬤14KR  ⬤18KW  ⬤18KY  ⬤18KR  ⬤Plat  ⬤Pall
```

Dark background `#111`, 1px top border `#222`, padding 12px 24px.

### 4.5 — Floating Callout (Royal Enfield Style)

When user selects an option, a label floats in 3D space near the ring:

```tsx
// components/configurator/FloatingCallout.tsx
// Uses Drei's <Html> component — positioned in 3D world space
function FloatingCallout({ metal, stone, visible }) {
  return (
    <Html
      position={[1.2, 0.8, 0]}
      distanceFactor={3}
      style={{ pointerEvents: "none" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
        style={{
          background: "rgba(10, 10, 10, 0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(201, 168, 76, 0.3)",
          borderRadius: 6,
          padding: "8px 14px",
          color: "#fff",
          fontSize: 12,
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ color: "#c9a84c", fontSize: 10, marginBottom: 2 }}>
          {METAL_CONFIGS[metal].label}
        </div>
        <div>{STONE_CONFIGS[stone].label} Diamond</div>
      </motion.div>
    </Html>
  );
}
```

### 4.6 — Live Price Display

```tsx
// hooks/usePrice.ts
export function usePrice(metalKey: string, stoneShape: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // WooCommerce REST API — composite product variations
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/wc/v3/products/${COMPOSITE_PRODUCT_ID}?` +
            `consumer_key=${process.env.NEXT_PUBLIC_WC_KEY}&consumer_secret=${process.env.NEXT_PUBLIC_WC_SECRET}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        // Parse composite component pricing
        const basePrice = parseFloat(data.price);
        const metalAddon = METAL_CONFIGS[metalKey].price;
        const stoneAddon = STONE_CONFIGS[stoneShape].price;
        setPrice(basePrice + metalAddon + stoneAddon);
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [metalKey, stoneShape]);

  return { price, loading };
}
```

**Price display component — animated counter:**

```tsx
// Animate price change with react-spring number spring
const { displayPrice } = useSpring({
  displayPrice: price ?? 0,
  config: { mass: 1, tension: 200, friction: 30 },
});
```

### 4.7 — Add to Cart

```tsx
// hooks/useCart.ts
export async function addToCart(config: RingConfig) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/cocart/v2/cart/add-item`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: COMPOSITE_PRODUCT_ID,
        quantity: 1,
        cart_item_data: {
          configuration: {
            metal: config.metal,
            stone_shape: config.stone,
            metal_label: METAL_CONFIGS[config.metal].label,
            stone_label: STONE_CONFIGS[config.stone].label,
          },
        },
        // Composite product components
        components: {
          [BAND_COMPONENT_ID]: {
            product_id: METAL_PRODUCT_IDS[config.metal],
            quantity: 1,
          },
          [STONE_COMPONENT_ID]: {
            product_id: STONE_PRODUCT_IDS[config.stone],
            quantity: 1,
          },
        },
      }),
    }
  );
  return res.json();
}
```

**Add to Cart button behavior:**

1. Click → button shows spinner, ring does a slow 360° celebration rotation via GSAP
2. Success → button shows "Added ✓", cart count badge in header increments
3. Cart drawer slides in from right showing the configuration with price
4. Cart item shows: "Twist Ring — 14K Yellow Gold, Oval Diamond — $1,580"

### 4.8 — Zustand Store

```tsx
// lib/store.ts
interface ConfigStore {
  metal: keyof typeof METAL_CONFIGS;
  stone: keyof typeof STONE_CONFIGS;
  cartCount: number;
  cartItems: CartItem[];
  setMetal: (metal: string) => void;
  setStone: (stone: string) => void;
  addToCart: (item: CartItem) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  metal: "14k-yellow",
  stone: "round",
  cartCount: 0,
  cartItems: [],
  setMetal: (metal) => set({ metal }),
  setStone: (stone) => set({ stone }),
  addToCart: (item) =>
    set((state) => ({
      cartCount: state.cartCount + 1,
      cartItems: [...state.cartItems, item],
    })),
}));
```

---

## 5. Bonus Page — `/ring-3d`

**Purpose:** Showcase the Tripo3D-generated GLB from the DoAmore custom ring image. This is a standalone immersive experience.

```tsx
// app/ring-3d/page.tsx
// Full screen Canvas
// Ring enters with GSAP camera dolly from far → close
// Same materials/shaders as configurator
// Orbit controls — full 360°
// Minimal UI: ring name, material label, "Configure this ring →" CTA
// Background: dark with very subtle particle field (50 small floating dots, CSS)
```

**Entry animation:**

```js
gsap.from(camera.position, {
  z: 12,
  y: 3,
  duration: 2.5,
  ease: "power3.out",
  onUpdate: () => camera.lookAt(0, 0, 0),
});
```

---

## 6. WooCommerce Backend

### docker-compose.yml

```yaml
version: "3.8"

services:
  db:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress_pass
      MYSQL_ROOT_PASSWORD: root_pass
    volumes:
      - db_data:/var/lib/mysql

  wordpress:
    image: wordpress:latest
    restart: always
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress_pass
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_CONFIG_EXTRA: |
        define('WP_SITEURL', 'http://localhost:8080');
        define('WP_HOME', 'http://localhost:8080');
    volumes:
      - wordpress_data:/var/www/html
      - ./docker/wordpress/setup.sh:/setup.sh
    depends_on:
      - db

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_WC_URL: http://localhost:8080
      NEXT_PUBLIC_WC_KEY: ${WC_CONSUMER_KEY}
      NEXT_PUBLIC_WC_SECRET: ${WC_CONSUMER_SECRET}
    depends_on:
      - wordpress

volumes:
  db_data:
  wordpress_data:
```

### WooCommerce Setup (docker/wordpress/setup.sh)

After containers start, run this to seed the store:

```bash
#!/bin/bash
# Install WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar

# Install WooCommerce
./wp-cli.phar plugin install woocommerce --activate

# Install CoCart (headless cart)
./wp-cli.phar plugin install cart-rest-api-for-woocommerce --activate

# Install Composite Products (requires license — use trial or alternative)
# Alternative: Use WooCommerce Product Add-Ons (free) to simulate composite behavior

# Create the Twist Ring composite product
./wp-cli.phar eval '
$product_id = wp_insert_post([
  "post_title" => "Aurelia Twist Ring",
  "post_type" => "product",
  "post_status" => "publish"
]);

// Set base price
update_post_meta($product_id, "_price", "980");
update_post_meta($product_id, "_regular_price", "980");

// Metal component products (8 metals)
$metals = [
  "14k-white"  => ["14K White Gold Band",  0],
  "14k-yellow" => ["14K Yellow Gold Band", 0],
  "14k-rose"   => ["14K Rose Gold Band",   0],
  "18k-white"  => ["18K White Gold Band",  200],
  "18k-yellow" => ["18K Yellow Gold Band", 200],
  "18k-rose"   => ["18K Rose Gold Band",   200],
  "platinum"   => ["Platinum Band",        500],
  "palladium"  => ["Palladium Band",       350],
];

// Stone component products (10 shapes)
$stones = [
  "round"    => ["Round Diamond",    0],
  "oval"     => ["Oval Diamond",     50],
  "princess" => ["Princess Diamond", 0],
  "cushion"  => ["Cushion Diamond",  75],
  "marquise" => ["Marquise Diamond", 100],
  "pear"     => ["Pear Diamond",     80],
  "emerald"  => ["Emerald Diamond",  120],
  "radiant"  => ["Radiant Diamond",  90],
  "asscher"  => ["Asscher Diamond",  150],
  "heart"    => ["Heart Diamond",    200],
];

// Create sub-products and store IDs as post meta
foreach ($metals as $key => $data) {
  $sub_id = wp_insert_post([
    "post_title" => $data[0],
    "post_type" => "product",
    "post_status" => "publish"
  ]);
  update_post_meta($sub_id, "_price", $data[1]);
  update_post_meta($sub_id, "_sku", "metal-" . $key);
  update_post_meta($product_id, "metal_product_" . str_replace("-", "_", $key), $sub_id);
}

foreach ($stones as $key => $data) {
  $sub_id = wp_insert_post([
    "post_title" => $data[0],
    "post_type" => "product",
    "post_status" => "publish"
  ]);
  update_post_meta($sub_id, "_price", $data[1]);
  update_post_meta($sub_id, "_sku", "stone-" . $key);
  update_post_meta($product_id, "stone_product_" . $key, $sub_id);
}

echo "Product ID: " . $product_id . "\n";
'

# Enable CORS for headless frontend
./wp-cli.phar eval '
add_filter("rest_pre_serve_request", function($value) {
  header("Access-Control-Allow-Origin: *");
  header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type, Authorization");
  return $value;
});
'

# Generate API keys
./wp-cli.phar eval '
$user_id = 1;
$consumer_key = "ck_" . wc_rand_hash();
$consumer_secret = "cs_" . wc_rand_hash();
echo "WC_CONSUMER_KEY=" . $consumer_key . "\n";
echo "WC_CONSUMER_SECRET=" . $consumer_secret . "\n";
'
```

### API Endpoints Used

```
GET  /wp-json/wc/v3/products/{id}                    → product + price
GET  /wp-json/wc/v3/products/{id}/variations         → all variants
POST /wp-json/cocart/v2/cart/add-item                → add to cart
GET  /wp-json/cocart/v2/cart                         → cart contents
```

---

## 7. Zustand State Shape

```typescript
interface RingConfig {
  // Current selections
  metal: string; // '14k-yellow'
  stone: string; // 'round'

  // Derived
  price: number | null;
  priceLoading: boolean;

  // Cart
  cartCount: number;
  cartItems: CartItem[];
  cartOpen: boolean;

  // UI state
  userInteracting: boolean; // disables auto-rotate
  showCallout: boolean;
  calloutPosition: [number, number, number];

  // Actions
  setMetal: (metal: string) => void;
  setStone: (stone: string) => void;
  setPrice: (price: number) => void;
  setCartOpen: (open: boolean) => void;
  addCartItem: (item: CartItem) => void;
  setUserInteracting: (v: boolean) => void;
}
```

---

## 8. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_WC_URL=http://localhost:8080
NEXT_PUBLIC_WC_KEY=ck_xxxxxxxxxxxx
NEXT_PUBLIC_WC_SECRET=cs_xxxxxxxxxxxx
NEXT_PUBLIC_COMPOSITE_PRODUCT_ID=123
NEXT_PUBLIC_BAND_COMPONENT_ID=1
NEXT_PUBLIC_STONE_COMPONENT_ID=2
```

---

## 9. Performance Requirements

- **First paint:** < 2s — use `<Suspense>` with a loading shimmer, defer heavy R3F until hydration
- **GLTF loading:** Preload with `useGLTF.preload('/models/twist-ring.glb')` at module level
- **Multiple Canvases:** Each stone/metal thumbnail is a separate `<Canvas>` — use `frameloop="demand"` so they only render on interaction, not every frame
- **Lenis + GSAP:** Connect via `lenis.on('scroll', ScrollTrigger.update)` and `gsap.ticker.add(lenis.raf)`
- **Three.js disposal:** Always dispose geometries and materials in useEffect cleanup
- **Image optimization:** Use `next/image` for any raster assets

---

## 10. Code Quality Standards

- TypeScript strict mode throughout — no `any` types
- All R3F components in `/components/three/` — never mix 3D and DOM components
- All WooCommerce API calls through `/lib/woocommerce.ts` — never inline fetch calls in components
- All material configs in `/lib/materials.ts` — never hardcode colors in components
- Zustand store is the single source of truth — no local useState for config selections
- Every useEffect with a fetch has an AbortController cleanup
- GSAP animations cleaned up in useGSAP callback or useEffect return
- `useGLTF` used for all GLB loading — never raw THREE.GLTFLoader

---

## 11. Typography Implementation

```tsx
// app/layout.tsx
import { Cormorant_Garamond, Inter } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
});
```

```css
/* globals.css */
:root {
  --gold: #c9a84c;
  --gold-dim: rgba(201, 168, 76, 0.3);
  --dark: #0a0a0a;
  --dark-surface: #111111;
  --dark-border: #1f1f1f;
  --text-primary: #f5f5f0;
  --text-secondary: #888880;
  --font-heading: var(--font-cormorant), Georgia, serif;
  --font-body: var(--font-inter), system-ui, sans-serif;
}

h1,
h2,
h3 {
  font-family: var(--font-heading);
  font-weight: 300;
}
body {
  font-family: var(--font-body);
  background: var(--dark);
  color: var(--text-primary);
}
```

---

## 12. README Template (fill in after building)

```markdown
# Aurelia — 3D Engagement Ring Configurator

## Live Demo

- Frontend: https://aurelia-ring.vercel.app
- WooCommerce: https://aurelia-wp.fly.dev

## Quick Start

git clone ...
cd aurelia
cp .env.example .env.local # fill in WC keys
docker compose up -d # starts WordPress + MySQL

# Wait ~30s for WordPress to initialize

./docker/wordpress/setup.sh # seeds products, generates API keys
cd apps/web && npm install && npm run dev

# → http://localhost:3000

## Stack Decisions

### Why React Three Fiber over Babylon.js

R3F gives a declarative, React-idiomatic API that maps cleanly to component-based
architecture. Babylon.js is more feature-complete but its imperative style creates
messy integration with React state. For this use case (material swaps driven by
Zustand state), R3F's `useSpring` + material refs pattern is far cleaner.

### Why CoCart over native WooCommerce cart

The native WooCommerce REST API is designed for admin operations (creating orders,
managing products) — not for frontend cart flows. CoCart fills this gap with
session-based cart management, proper CORS support, and a cart API designed for
headless frontends.

### Why Lenis over native scroll

Lenis provides the momentum-based smooth scroll that makes GSAP ScrollTrigger
animations feel cinematic rather than mechanical. The integration with GSAP's
ticker ensures frame-perfect sync between scroll position and 3D camera movements.

### 3D Stone Thumbnails — approach chosen

We implemented 6 of 10 stone shapes as real 3D canvases (round, oval, princess,
cushion, marquise, pear) using the same MeshTransmissionMaterial shader as the
main ring. The remaining 4 (emerald, radiant, asscher, heart) use polished SVG
illustrations as fallbacks. This was the "premium subset" approach explicitly
suggested in the brief — 6 excellent 3D thumbnails beats 10 mediocre ones.
The 3D pipeline is in place; adding remaining geometries is additive work.

### What I'd build next

- [ ] Ring size selector with visual finger preview
- [ ] AR try-on via WebXR
- [ ] Save configuration link (shareable URL with config encoded)
- [ ] 360° video fallback for devices that can't handle WebGL
- [ ] Full 10 stone shapes in 3D
- [ ] Engraving preview on band
```

---

## 13. Architecture Doc (one-pager)

```
AURELIA — DATA FLOW

User selects metal/stone in Configurator UI
           │
           ▼
    Zustand store updates
    { metal: '18k-yellow', stone: 'oval' }
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
R3F Scene     usePrice hook
updates       (300ms debounce)
material           │
live               ▼
           GET /wp-json/wc/v3/products/{id}
           WooCommerce REST API
           (consumer key auth)
                   │
                   ▼
           Parse composite pricing:
           base ($980) + metal addon + stone addon
                   │
                   ▼
           PriceDisplay animates to new value
           (react-spring number spring)

User clicks "Add to Cart"
           │
           ▼
POST /wp-json/cocart/v2/cart/add-item
{
  id: COMPOSITE_PRODUCT_ID,
  quantity: 1,
  components: {
    band: { product_id: METAL_PRODUCT_IDS[metal] },
    stone: { product_id: STONE_PRODUCT_IDS[stone] }
  },
  cart_item_data: {
    configuration: { metal, stone, labels }
  }
}
           │
           ▼
CoCart creates session, returns cart
           │
           ▼
Cart drawer opens, showing:
"Twist Ring — 18K Yellow Gold, Oval Diamond — $1,630"
           │
           ▼
"Proceed to Checkout" → redirect to
http://localhost:8080/checkout?cocart-load-cart={token}
WooCommerce native checkout handles payment
```

---

## 14. Deliverables Checklist

Before submitting, verify:

- [ ] `docker compose up` starts everything in under 5 minutes
- [ ] Landing page: hero loads, ring auto-rotates, text animates in
- [ ] Landing page: horizontal scroll features section works
- [ ] Landing page: metals teaser scrolls and ring material changes
- [ ] Landing page: testimonials + marquee visible
- [ ] Landing page: CTA navigates to /configure with transition
- [ ] Configurator: ring renders in showroom environment
- [ ] Configurator: orbit controls work (drag rotates ring)
- [ ] Configurator: all 8 metal swatches render as 3D mini-rings
- [ ] Configurator: 6 stone 3D thumbnails render with transmission material
- [ ] Configurator: 4 flat stone fallbacks render cleanly
- [ ] Configurator: selecting metal changes ring material live
- [ ] Configurator: selecting stone changes ring stone live
- [ ] Configurator: price updates from WooCommerce API (not hardcoded)
- [ ] Configurator: Add to Cart posts to CoCart, cart count increments
- [ ] Configurator: cart drawer shows correct configuration + price
- [ ] Configurator: floating callout label visible in 3D space
- [ ] /ring-3d: bonus GLB page renders with cinematic entry
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] README complete with setup instructions
- [ ] 3-min screen recording: voiceover walking through buyer journey

---

## 15. Start Here — Build Order

Build in this exact order to avoid blocking yourself:

```
1. Docker + WooCommerce setup (get API working first)
2. Next.js app scaffold + Tailwind + fonts
3. Zustand store + material configs + WooCommerce client
4. Basic R3F scene with GLB loaded + material applied
5. Metal material system (PBR + spring lerp)
6. Stone swap system (mesh visibility or material)
7. Landing page hero (R3F canvas + typography)
7b. Ring selector page (/select) — ghost typography,
3D ring carousel, variant pills, CONFIGURE NOW CTA
8. Landing page scroll sections (GSAP + Lenis)
9. Configurator layout (left/center/right panels)
10. Stone picker (3D thumbnails + flat fallbacks)
11. Metal picker (3D swatches bottom rail)
12. Live price hook + animated display
13. Add to cart + cart drawer
14. Floating callout (Drei Html)
15. Page transition (canvas persistence across routes)
16. Configurator polish (post-processing, showroom env)
17. Landing page polish (text reveals, magnetic button, parallax)
18. /ring-3d bonus page
19. README + architecture doc
20. Screen recording
```

---

## Design Plugin Instructions

The Frontend Design plugin (claude plugin install frontend-design) is installed.
Before writing any component, Claude Code must:

1. State the aesthetic direction: "Dark Luxury — editorial jewelry brand"
2. Identify what makes this component distinctly premium (not generic)
3. Name one banned pattern it's deliberately avoiding
4. Then write the code

This applies to every single component — hero, picker, button, cart drawer,
price display. No exceptions. go read claude.md for this

## 16. Absolute Non-Negotiables

1. **No hardcoded prices** — always pulled from WooCommerce REST API
2. **No white backgrounds** — dark palette throughout, `#0a0a0a` base
3. **No jank** — 60fps on the ring. Use `frameloop="demand"` on thumbnail canvases
4. **Cart must reflect exact configuration** — metal label + stone label + correct price
5. **GLB materials must be replaced** — do not use Tripo3D's default flat materials, we must compress the GLB , enhance it using three fibre or whatevr available etc and make it look amazing from a flat 3d mesh
6. **Lenis + GSAP must be integrated** — native scroll for scroll sections is not acceptable
7. **TypeScript throughout** — no JavaScript files in /components or /lib
8. **Docker must work** — `docker compose up && ./setup.sh` must produce a working store
