## Design Aesthetic — Non-Negotiable

Direction: Dark Luxury / Editorial Jewelry

- Background: #0a0a0a throughout — never white, never light
- Accent: #c9a84c (warm gold) — used sparingly, never as a fill
- Typography: Cormorant Garamond (serif editorial) + Inter (clean sans)
- BANNED: System fonts (Arial, Helvetica), purple gradients, rounded pill buttons,
  generic card shadows, blue primary colors, white backgrounds
- Motion: Cinematic, deliberate — nothing bouncy or playful
- Reference feel: Cartier.com + Lusion.co + Royal Enfield MiY configurator
- Every component decision must ask: "Does this feel like a $1,500 ring deserves it?"

## The Feel — Non-Negotiable

Reference: oryzo.ai (built by Lusion) — study this before touching any component.

The emotional target: "the moment before you propose."
Excitement + weight + beauty simultaneously.

Specific rules that produce this feel:

SCALE: Typography must be uncomfortably large. If it fits neatly, make it bigger.
Headings bleed off viewport on purpose. Tiny labels (10-11px) next to
enormous type (10-15vw). Never medium-sized anything.

MOTION: Everything has mass. Nothing pops. Nothing bounces.
Ease: power3.out for entries, power2.inOut for transitions.
Duration: 0.8s minimum for any meaningful animation.
The ring has weight. Camera moves have inertia.

COMMITMENT: Never hedge visually. Full dark. Full gold. Full scale.
No "pretty good" — only "extraordinary or nothing."

ALIVENESS: The page responds to the user at all times.
Mouse position → subtle ring tilt (0.02 radians max)
Scroll position → camera moves, material shifts
Hover → something always happens in 3D space
Selection → ring reacts (material change, slight rotation)

RESTRAINT: One accent color (#c9a84c gold). Used 3-4 times max per page.
Not on backgrounds. Not as fills. Only as borders, text accents,
selected states. Everything else is black and white.

ZERO GENERIC UI: No Bootstrap. No shadcn defaults. No Tailwind component kits.
Every UI element designed from scratch for this specific product.
If it looks like something you've seen before, redesign it.
