# Forward Deployed Engineer · Take-home · Urumi

---

## WWW.URUMI.AI TAKE-HOME · FORWARD DEPLOYED ENGINEER

_For candidate review_

---

## URUMI · FDE TAKE-HOME

### A shaped take-home like real work.

An evaluation exercise designed to look like the kind of problem a Forward Deployed Engineer at Urumi solves: embed inside a WooCommerce codebase, build something a customer would want to use, ship it fast with AI as a force multiplier.

> **THIS IS AN EXERCISE** — The brand and product page below are public references for study — not a customer of ours. Build a prototype that shows us how you'd approach this kind of work. The code you write is yours; we evaluate it, share feedback, and delete our copy after the process.

---

## THE REFERENCE

### A premium engagement-ring brand. Configurable jewelry.

Imagine a US DTC engagement-ring brand on WooCommerce that sells deeply configurable jewelry — metal, stone shape, setting style, band style. The product page has to reflect all of it without losing the premium feel of the brand.

We're pointing you at Do Amore as a public reference — strong site, well-shot product photography, clear design language. Study it to understand the problem space. Your output should be your own work, inspired by what you see, not a copy of it.

**Reference product to study:**
[doamore.com / Classic Solitaire Ring →](https://www.doamore.com/engagement-rings/classic-solitaire-ring/)

**Site to study for design language:**
[doamore.com →](https://www.doamore.com/)

---

## THE TASK

### Build a 3D interactive product page — as a prototype.

Imagine you're tasked with reimagining a configurable engagement-ring product page. Build a prototype where a shopper can configure the ring in 3D, see every change reflected live, and add the result to cart — backed by a WooCommerce store you set up locally.

| #   | Feature                   | Description                                                                                                                 |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 01  | **Rotate the ring**       | Cursor or touch. Smooth, premium, no jank. Not a clunky model-viewer feel.                                                  |
| 02  | **Switch metals live**    | 14K white gold · yellow gold · rose gold. Material changes on the 3D model in real time.                                    |
| 03  | **Swap the center stone** | A few diamond shapes — round, oval, princess. Stone changes live on the ring.                                               |
| 04  | **Live price update**     | Price reflects the configuration in real time — pulled from WooCommerce, not hardcoded.                                     |
| 05  | **Add to cart**           | The cart reflects the exact configuration the shopper built.                                                                |
| 06  | **Premium feel**          | Reads like an engagement-ring brand site, not an engineering demo. Study the reference for cues; output should be your own. |

> **REFERENCE FOR FEEL** — [Royal Enfield · Goan 350 configurator](https://makeityours.royalenfield.com/configurator/goan-350) is the calibration target for interaction feel — smooth transitions, premium materials, no rough edges. Not the exact UI. Not the fidelity (that's a multi-million-dollar build). Just the feel that lands as premium.

---

## BONUS · CONFIGURATOR IN 3D

### Stretch goal. Make the picker 3D too.

A look at the live product page shows the configuration shoppers expect: 10 stone shapes and 8 metal swatches. The current picker uses flat illustrations for stones and color discs for metals.

> **FROM THE LIVE PRODUCT PAGE · DOAMORE.COM**

If you have headroom: make the picker itself 3D too. Render the stones as small interactive 3D thumbnails — same shaders as the ring on the right — so the choice you're making always matches what you see on the ring.

You won't have hand-modelled 3D meshes for every stone shape. That's where AI tools come in — image-to-3D services and procedural shaders can generate the variations for you. A few angles worth considering:

- **AI-generated meshes** — Tripo3D or similar, fed by the existing 2D stone illustrations
- **Parametric shape morphing** — one stone model that interpolates between cuts
- **Premium subset** — 3 hero shapes in beautiful 3D, the rest stay flat or come later

_Bonus, not required. If you take it on, show us how you thought about it. There's no right answer — just a creative one._

---

## BACKEND

### Headless WooCommerce — real data, no fakes.

The backend is WooCommerce running headless, with a composite product driving the configuration. Your frontend (whatever stack you pick) talks to WooCommerce over its REST API, not as PHP templates. The frontend pulls live data: variations, prices, stock. No hardcoded JSON.

Set up a local WooCommerce instance, install the reference composite product, expose it via API, and wire your frontend to it. We need to be able to clone, run `docker compose up` (or equivalent), and have a working store + frontend in under 5 minutes.

---

## TOOLS YOU CAN USE

### Use AI aggressively.

We use AI aggressively at Urumi. The question isn't whether you do — it's how thoughtfully. Pick the tools that help you ship.

**3D MODEL GENERATION**
[Tripo3D](https://studio.tripo3d.ai/) for image-to-3D from the existing 2D product photography. Or any other tool that works for you.

**Intentionally ambiguous decisions — you decide:**

- How many metals and stones to support (3 of each is fine; more is better only if quality holds)
- How to handle stones you don't have 3D models for (placeholder · procedural · skip?)
- Whether the configurator is the whole product page, or a section within an otherwise normal product page — either works, your call
- Mobile responsiveness scope

**3D RENDERING**
Three.js · React Three Fiber · Babylon.js. Your call — justify the choice.

**AI TOOLING**
Claude Code · Cursor · Copilot · v0. Show us how you collaborate with AI, not whether you do it alone.

**DESIGN**
Claude Design. For fast UI iteration if needed.

---

## WHAT WE'RE EVALUATING

### Seven dimensions. All matter.

| Dimension                   | What We're Looking For                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **End-user feel**           | Does it feel premium? Smooth interactions, considered loading states, no rough edges that would embarrass you in a live demo.                                      |
| **Visual fidelity**         | Does the prototype hold its own as a premium brand surface? Strong type, restrained color, intentional whitespace — informed by the reference, not copied from it. |
| **WooCommerce integration** | Does configuration drive live data? Can you add to cart and see the configured product, with the right price, in the cart?                                         |
| **Code quality**            | Clean, organized, intentional. Not perfect — this is a 3-day prototype — but the code should look like something a future engineer could pick up.                  |
| **Decision-making**         | Where you made non-obvious calls (3D library, composite-product approach, missing models), explain why.                                                            |
| **Self-direction**          | This brief is intentionally underspecified. We want to see how you navigate ambiguity, not how you follow a spec.                                                  |

> **INTENTIONALLY AMBIGUOUS — You decide. Document why.**
> A few things in this brief are vague on purpose. Make the call that best serves what a customer would actually use — and write a one-liner in the README explaining why.

---

## DELIVERABLES

### A repo, a recording, an architecture doc.

| #   | Deliverable                | Details                                                                                                                                                              |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | **Working app**            | Live URL preferred (Vercel, Netlify, Fly, your call) with WooCommerce reachable too. Local docker-compose acceptable as a fallback — but a live link tells us a lot. |
| 02  | **README**                 | How to run · stack choices · what you'd build next.                                                                                                                  |
| 03  | **3-min screen recording** | Walk through the experience as a buyer would use it. Voice over the recording.                                                                                       |
| 04  | **Architecture doc**       | One page max. What the data flow looks like from frontend interaction → WooCommerce cart.                                                                            |

---

## TIMELINE

### 3 – 5 days from this brief.

We expect roughly **15 – 25 hours** of focused work. Not full-time, but committed. If you go significantly over, flag it in the README and explain what blocked you.

If you hit something genuinely blocking that AI can't solve, send a quick message before losing a day on it. Pre-existing 3D assets are fine. Generating from scratch is fine. Whatever helps you spend time on the parts that matter — the customer experience and the integration.

---

## NOTES FROM US

### A few things we want you to know.

**Use AI aggressively.** We use AI aggressively at Urumi. The question isn't whether you do — it's how thoughtfully.

**We don't expect a finished product.** We expect a credible prototype — clean enough that we can see how you think, focused enough to actually finish.

**Polish the parts that matter.** A small surface done beautifully beats a large surface done roughly. We can imagine the extension. We can't imagine a rough thing as premium.

**This brief is the shape of the real work.** Forward Deployed Engineers at Urumi embed inside customer codebases and ship surfaces like this. We sent this brief because we think you could be one of those engineers.

---

## SUBMISSION

**URUMI AI · FORWARD DEPLOYED ENGINEERING**

Submissions: [hire@urumi.ai](mailto:hire@urumi.ai)

---

_Links referenced in this document:_

- https://www.urumi.ai/
- https://www.doamore.com/
- https://www.doamore.com/engagement-rings/classic-solitaire-ring/
- https://makeityours.royalenfield.com/configurator/goan-350
- https://studio.tripo3d.ai/
