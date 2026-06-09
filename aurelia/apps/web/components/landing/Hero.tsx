"use client";

import { useEffect, useRef, useState, Suspense, MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RingMesh } from "@/components/three/RingMesh";
import { LightTentEnvironment } from "@/components/three/LightTentEnvironment";
import { useNavigate } from "@/components/ui/PageTransition";

gsap.registerPlugin(ScrollTrigger);

// ── Camera rig — frame-rate-independent lerp ──────────────────
function CameraRig({
  target,
}: {
  target: MutableRefObject<{
    x: number;
    y: number;
    z: number;
    lookAtY: number;
  }>;
}) {
  useFrame(({ camera }, delta) => {
    // Exponential decay: same feel at any fps. At 60fps gives same result as * 0.18.
    const t  = 1 - Math.pow(0.82, delta * 60);
    const tL = 1 - Math.pow(0.91, delta * 60);
    camera.position.x += (target.current.x - camera.position.x) * t;
    camera.position.y += (target.current.y - camera.position.y) * t;
    camera.position.z += (target.current.z - camera.position.z) * t;
    const cur  = (camera.userData.lookAtY as number) ?? 0.1;
    const next = cur + (target.current.lookAtY - cur) * tL;
    camera.userData.lookAtY = next;
    camera.lookAt(0, next, 0);
  });
  return null;
}


export function Hero({ onReady }: { onReady?: () => void }) {
  const navigate = useNavigate();

  // layout refs
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // text word inner refs — GSAP y/x/opacity only, NO inline transform
  const yoursRef = useRef<HTMLDivElement>(null);
  const foreverRef = useRef<HTMLDivElement>(null);

  // text reveal refs
  const revealLeftRef = useRef<HTMLDivElement>(null); // phase 2 left
  const revealSpecsRef = useRef<HTMLDivElement>(null); // phase 2 right specs
  const revealStoneRef = useRef<HTMLDivElement>(null); // phase 3 bottom-right
  const revealBeginRef = useRef<HTMLDivElement>(null); // phase 4 "Begin Configuration"
  const spotlightRef   = useRef<HTMLDivElement>(null); // phase 4 stone spotlight

  const mouseRef = useRef({ x: 0, y: 0 });
  const magnetRef = useRef<HTMLButtonElement>(null);

  // Initial camera: centred — no x offset so ring never drifts on first scroll
  const cameraTarget = useRef({ x: 0, y: 0.1, z: 4.2, lookAtY: 0.1 });

  // Delay Canvas mount so the loader paints before WebGL init begins
  const [canvasMounted, setCanvasMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setCanvasMounted(true), 120);
    return () => clearTimeout(id);
  }, []);

  // Pause canvas rendering when section scrolls out of view — prevents GPU drain
  // from two simultaneous WebGL scenes (Hero + FinalCTA both at 60fps).
  const [canvasActive, setCanvasActive] = useState(true);

  // ── Canvas visibility — pause when section leaves viewport ───────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([entry]) => setCanvasActive(entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // ── Entry animation ────────────────────────────────────────────
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.3 });

    if (navRef.current)
      tl.fromTo(
        navRef.current,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
        0
      );

    if (canvasWrapRef.current)
      tl.fromTo(
        canvasWrapRef.current,
        { opacity: 0, scale: 0.97 },
        { opacity: 1, scale: 1, duration: 1.8, ease: "power3.out" },
        0.1
      );

    // Words enter at their resting 40% opacity
    if (yoursRef.current)
      tl.fromTo(
        yoursRef.current,
        { y: 70, opacity: 0 },
        { y: 0, opacity: 0.42, duration: 1.2, ease: "power3.out" },
        0.35
      );

    if (foreverRef.current)
      tl.fromTo(
        foreverRef.current,
        { y: 70, opacity: 0 },
        { y: 0, opacity: 0.42, duration: 1.2, ease: "power3.out" },
        0.52
      );

    if (ctaRef.current)
      tl.fromTo(
        ctaRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        1.3
      );

      // Reveals start invisible
    [revealLeftRef, revealSpecsRef, revealStoneRef, revealBeginRef].forEach(
      (r) => {
        if (r.current) gsap.set(r.current, { opacity: 0, y: 18 });
      }
    );

    return () => { tl.kill(); };
  }, []);

  // ── Scroll driver ──────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Pre-built quickSetters — zero tween overhead, called directly each frame.
    // One setter per property: GSAP batches same-element transforms in one flush.
    const qsYoursY = gsap.quickSetter(yoursRef.current!, "y", "px");
    const qsYoursX = gsap.quickSetter(yoursRef.current!, "x", "px");
    const qsYoursR = gsap.quickSetter(yoursRef.current!, "rotation", "deg");
    const qsYoursOp = gsap.quickSetter(yoursRef.current!, "opacity");
    const qsForeverY = gsap.quickSetter(foreverRef.current!, "y", "px");
    const qsForeverX = gsap.quickSetter(foreverRef.current!, "x", "px");
    const qsForeverR = gsap.quickSetter(foreverRef.current!, "rotation", "deg");
    const qsForeverOp = gsap.quickSetter(foreverRef.current!, "opacity");
    const qsCtaOp = gsap.quickSetter(ctaRef.current!, "opacity");
    const qsRL_op = gsap.quickSetter(revealLeftRef.current!, "opacity");
    const qsRL_y = gsap.quickSetter(revealLeftRef.current!, "y", "px");
    const qsRS_op = gsap.quickSetter(revealSpecsRef.current!, "opacity");
    const qsRS_y = gsap.quickSetter(revealSpecsRef.current!, "y", "px");
    const qsRSt_op = gsap.quickSetter(revealStoneRef.current!, "opacity");
    const qsRSt_y = gsap.quickSetter(revealStoneRef.current!, "y", "px");
    const qsRB_op   = gsap.quickSetter(revealBeginRef.current!, "opacity");
    const qsRB_y    = gsap.quickSetter(revealBeginRef.current!, "y", "px");
    const qsSpot_op = gsap.quickSetter(spotlightRef.current!,   "opacity");

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=520%",
      pin: true,
      scrub: 1,
      onUpdate: (self) => {
        const p = self.progress;

        // ── YOURS + FOREVER: purely scrub-driven wave exit ────────
        // No snap-back tween — scrub: 0.6 already smooths the motion.
        // Snap-back caused glitch: scrub delivers progress ~300ms after
        // wheel stops, so getVelocity() read 0 while p was still changing,
        // firing the spring tween against an in-motion quickSetter.

        // — YOURS — exits by 22% progress
        {
          const t = Math.min(1, p / 0.22);
          const wave = Math.sin(t * Math.PI);
          qsYoursY(-320 * t - 18 * Math.sin(t * Math.PI * 2));
          qsYoursX(-90 * wave);
          qsYoursR(-4 * wave);
          qsYoursOp(0.42 * (1 - t));
        }

        // — FOREVER — exits by 30% progress
        {
          const t = Math.min(1, p / 0.3);
          const wave = Math.sin(t * Math.PI);
          qsForeverY(-320 * t - 18 * Math.sin(t * Math.PI * 2));
          qsForeverX(90 * wave);
          qsForeverR(4 * wave);
          qsForeverOp(0.42 * (1 - t));
        }

        // ── CTA: visible at start → gone on scroll → returns in phase 4 ─
        const ctaOp =
          p < 0.05
            ? 1 - p / 0.05
            : p >= 0.82
            ? Math.min(1, (p - 0.82) / 0.1)
            : 0;
        qsCtaOp(ctaOp);

        // ── 4 Camera phases ───────────────────────────────────────
        // (Pure object mutation — no GSAP overhead, read by CameraRig's useFrame)

        // Phase 1 (0→0.25) — The Presentation
        if (p < 0.25) {
          const t = p / 0.25;
          cameraTarget.current.x = 0;
          cameraTarget.current.y = 0.1 - t * 0.1;
          cameraTarget.current.z = 4.2 - t * 1.2;
          cameraTarget.current.lookAtY = 0.1;

          // Phase 2 (0.25→0.50) — The Stone
        } else if (p < 0.5) {
          const t = (p - 0.25) / 0.25;
          cameraTarget.current.x = t * 0.9;
          cameraTarget.current.y = t * 0.6;
          cameraTarget.current.z = 3.0 - t * 0.4;
          cameraTarget.current.lookAtY = 0.1 + t * 0.2;

          // Phase 3 (0.50→0.75) — The Craft
        } else if (p < 0.75) {
          const t = (p - 0.5) / 0.25;
          cameraTarget.current.x = 0.9 - t * 0.9;
          cameraTarget.current.y = 0.6 - t * 0.8;
          cameraTarget.current.z = 2.6 - t * 0.6;
          cameraTarget.current.lookAtY = 0.3 + t * 0.15;

          // Phase 4 (0.75→1.0) — The Invitation
        } else {
          const t = (p - 0.75) / 0.25;
          cameraTarget.current.x = 0;
          cameraTarget.current.y = -0.2 - t * 0.2;
          cameraTarget.current.z = 2.0 - t * 0.6;
          cameraTarget.current.lookAtY = 0.45 - t * 0.1;
        }

        // ── 3 Text reveals ────────────────────────────────────────

        // Reveal 1 — Phase 2 orbit: "Crafted in / Conflict-Free Gold" + specs
        // Enter: 0.32→0.44  |  Hold: 0.44→0.47  |  Exit: 0.47→0.50
        const op1 = (() => {
          if (p < 0.32 || p >= 0.5) return 0;
          if (p < 0.44) return (p - 0.32) / 0.12;
          if (p < 0.47) return 1;
          return (0.5 - p) / 0.03;
        })();
        const ey1 = Math.min(1, Math.max(0, (p - 0.32) / 0.12));
        qsRL_op(op1);
        qsRL_y((1 - ey1) * 20);
        qsRS_op(op1);
        qsRS_y((1 - ey1) * 20);

        // Reveal 2 — Phase 3 low: "Three cuts. One truth."
        // Enter: 0.57→0.69  |  Hold: 0.69→0.72  |  Exit: 0.72→0.75
        const op2 = (() => {
          if (p < 0.57 || p >= 0.75) return 0;
          if (p < 0.69) return (p - 0.57) / 0.12;
          if (p < 0.72) return 1;
          return (0.75 - p) / 0.03;
        })();
        const ey2 = Math.min(1, Math.max(0, (p - 0.57) / 0.12));
        qsRSt_op(op2);
        qsRSt_y((1 - ey2) * 20);

        // Reveal 3 — Phase 4: "Begin Configuration"
        // Enter: 0.80→0.90  |  Holds to end
        const op3 = Math.min(1, Math.max(0, (p - 0.8) / 0.1));
        qsRB_op(op3);
        qsRB_y((1 - op3) * 20);

        // Stone spotlight — fades in as ring fills viewport in Phase 4
        const spotOp = Math.min(1, Math.max(0, (p - 0.78) / 0.14));
        qsSpot_op(spotOp);

        // Spotlight tracks the center stone's projected screen position as the camera
        // zooms through Phase 4. Stone sits at world [0, ~0.504, 0].
        // Perspective projection at each phase boundary gives:
        //   p=0.75 (Phase 4 start): cam [0,-0.2,2.6] lookAt y=0.45 → stone ~47% screen-Y
        //   p=1.00 (Phase 4 end):   cam [0,-0.4,1.4] lookAt y=0.35 → stone ~37% screen-Y
        {
          const spotT = Math.max(0, (p - 0.75) / 0.25)
          const spotY = (47 - spotT * 10).toFixed(1)
          spotlightRef.current!.style.background =
            `radial-gradient(ellipse 18% 14% at 50% ${spotY}%, rgba(255,248,220,0.22) 0%, rgba(220,180,80,0.08) 50%, transparent 100%)`
        }
      },
    });

    return () => { st.kill(); };
  }, []);

  // ── Mouse tracking ─────────────────────────────────────────────
  useEffect(() => {
    // Cache button rect — avoids getBoundingClientRect on every mousemove
    let btnRect: { bx: number; by: number } | null = null;

    function cacheBtnRect() {
      const btn = magnetRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      btnRect = { bx: r.left + r.width / 2, by: r.top + r.height / 2 };
    }

    cacheBtnRect();
    window.addEventListener("resize", cacheBtnRect);

    const btn = magnetRef.current;
    const qtX = btn ? gsap.quickTo(btn, "x", { duration: 0.4, ease: "power2.out" }) : null;
    const qtY = btn ? gsap.quickTo(btn, "y", { duration: 0.4, ease: "power2.out" }) : null;

    function onMouseMove(e: MouseEvent) {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
      if (!qtX || !qtY || !btnRect) return;
      const { bx, by } = btnRect;
      const d = Math.hypot(e.clientX - bx, e.clientY - by);
      if (d < 90) {
        qtX((e.clientX - bx) * 0.28);
        qtY((e.clientY - by) * 0.28);
      } else {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
      }
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", cacheBtnRect);
    };
  }, []);

  function handleConfigure() {
    gsap.to(canvasWrapRef.current, {
      scale: 1.06,
      duration: 0.5,
      ease: "power2.in",
      onComplete: () => navigate("/select"),
    });
  }

  return (
    <>
      <section
        ref={sectionRef}
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: "var(--dark)",
          isolation: "isolate", // explicit stacking context: canvas z:6 > text z:2
        }}
      >
        {/* ── Nav ─────────────────────────────────────────────────── */}
        <nav
          ref={navRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            opacity: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 48px",
          }}
        >
          {/* Top-left editorial labels — landing1 reference */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.28em",
                color: "var(--gold)",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
              }}
            >
              · Solitaire
            </div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.22em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
              }}
            >
              Classic Solitaire
            </div>
          </div>
          <button
            data-cursor-hover
            onClick={handleConfigure}
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              background: "none",
              border: "none",
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
          >
            Configure →
          </button>
        </nav>

        {/*
        YOURS.
        Wrapper owns CSS top + translateY centering.
        Inner div (yoursRef) is what GSAP animates — no CSS transform on it.
        Starts at 40% opacity — resting "ghost" behind the ring.
        top: 34% → upper-center area.
      */}
        <div
          style={{
            position: "absolute",
            left: "-0.015em",
            top: "34%",
            transform: "translateY(-50%)",
            zIndex: 7,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          <div
            ref={yoursRef}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(88px, 13vw, 185px)",
              fontWeight: 300,
              fontStyle: "italic",
              letterSpacing: "0.045em",
              color: "#c9b06b",
              lineHeight: 1,
              whiteSpace: "nowrap",
              willChange: "transform, opacity",
            }}
          >
            YOURS
          </div>
        </div>

        {/*
        FOREVER.
        top: 65% → lower half, bleeds off right, overlaps ring lower-right.
        z:8 > canvas z:6 → floats ON TOP of the ring intentionally.
      */}
        <div
          style={{
            position: "absolute",
            right: "-0.015em",
            top: "65%",
            transform: "translateY(-50%)",
            zIndex: 8,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          <div
            ref={foreverRef}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(88px, 13vw, 185px)",
              fontWeight: 300,
              fontStyle: "italic",
              letterSpacing: "0.045em",
              color: "#c9b06b",
              lineHeight: 1,
              whiteSpace: "nowrap",
              willChange: "transform, opacity",
            }}
          >
            FOREVER
          </div>
        </div>

        {/*
        3D Canvas.
        alpha: false + scene.background (#0a0a0a) matches page bg exactly.
        LightTentEnvironment sets scene.background = envMap for diamond transmission.
        YOURS/FOREVER/glow sit above canvas at z:7–9.
        CSS vignette applied via overlay div inside canvas wrapper.
      */}
        <div
          ref={canvasWrapRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 6,
            opacity: 0,
          }}
        >
          {!canvasMounted && null}
          {/* Dark Velvet atmosphere — stacked CSS layers over the canvas */}
          {/* Stone spotlight — tight cone on center stone, scroll-driven Phase 4 */}
          <div
            ref={spotlightRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 9,
              pointerEvents: "none",
              opacity: 0,
              background:
                "radial-gradient(ellipse 18% 14% at 50% 47%, rgba(255,248,220,0.22) 0%, rgba(220,180,80,0.08) 50%, transparent 100%)",
            }}
          />

          {/* Room vignette — sharp wall edges, three-plane illusion */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at 50% 52%, transparent 32%, rgba(6,6,8,0.55) 44%, rgba(2,2,4,0.88) 100%)",
            }}
          />
          {/* Floor edge — slightly stronger at bottom to separate floor from side walls */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              pointerEvents: "none",
              background:
                "linear-gradient(to top, rgba(0,0,4,0.55) 0%, rgba(0,0,4,0.18) 18%, transparent 30%)",
            }}
          />
          {/* Amber glow — warm centre behind the ring */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 4,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 38% 30% at 50% 50%, rgba(130,62,0,0.18) 0%, transparent 100%)",
            }}
          />
          {canvasMounted && <Canvas
            camera={{ position: [0, 0.1, 4.2], fov: 35 }}
            gl={{
              antialias: true,
              alpha: false,
              toneMapping: 4,
              toneMappingExposure: 1.1,
            }}
            dpr={[1, 1.2]}
            frameloop={canvasActive ? 'always' : 'demand'}
          >
            <color attach="background" args={["#0a0a0a"]} />
            <Suspense fallback={null}>
              <LightTentEnvironment transparent={true} delay={500} />
              {/*
              4-light diamond rig (all castShadow:false for perf).
              Diamond sits at approx world-y ≈ 1.0–1.3 (top of ring, scale 1.8).

              1. Crown table key  — narrow cone dead-on at the table face.
                 Creates the classic single bright "star" visible in hero photography.
              2. Left cool accent — cold-white, catches left-facing kite facets.
              3. Right warm accent — warm-white, catches right-facing kite facets.
                 Cool-warm split → adjacent facets look different colors → "fire".
              4. Pavilion counter-light — from below/behind, illuminates pavilion
                 facets visible through the table. Creates internal depth / backfire.
            */}
              <ambientLight intensity={0.04} />
              {/*
              3-light diamond rig — minimal by design.
              Too many lights = all facets lit = no contrast = "just bright."
              Real diamond scintillation: ~30% facets blazing, ~70% near-black.
              RingMesh already carries its own 3-point rig for the gold band.
              These 3 lights are purely for the stone (world-y ≈ 1.0–1.3).
            */}
              {/* 1. Crown table key — ultra-narrow, hits table dead-on */}
              <spotLight
                position={[0.3, 5.5, 2]}
                intensity={260}
                angle={0.09}
                penumbra={0.15}
                color="#ffffff"
                castShadow={false}
              />
              {/* 2. Left cool accent — cold-white, left kite facets */}
              <spotLight
                position={[-1.8, 3, 2.5]}
                intensity={55}
                angle={0.2}
                penumbra={0.8}
                color="#bbd4ff"
                castShadow={false}
              />
              {/* 3. Right warm accent — warm-white, right kite facets */}
              <spotLight
                position={[1.8, 3, 2.5]}
                intensity={55}
                angle={0.2}
                penumbra={0.8}
                color="#ffd8a0"
                castShadow={false}
              />
              {/* 4. Pavilion counter-light — illuminates from below, backfire through table */}
              <pointLight
                position={[0, -0.5, -1.5]}
                intensity={14}
                color="#f0f8ff"
              />
              <RingMesh
                autoRotate
                metalKey="18k-yellow"
                rotateSpeed={0.38}
                stoneEnvIntensity={6}
                stoneTransmission={0.88}
                mouseRef={mouseRef}
                onReady={onReady}
              />
              <ContactShadows
                position={[0, -1.28, 0]}
                opacity={0.45}
                blur={2}
                scale={5}
                far={2}
                frames={1}
              />
            </Suspense>
            <CameraRig target={cameraTarget} />
          </Canvas>}
        </div>

        {/* ── Move 2: Left reveal — "CRAFTED IN" + heading ─────────── */}
        <div
          ref={revealLeftRef}
          style={{
            position: "absolute",
            bottom: 100,
            left: 52,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.30em",
              color: "var(--gold)",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              marginBottom: 12,
            }}
          >
            Crafted in
          </div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(32px, 3.8vw, 52px)",
              fontWeight: 300,
              fontStyle: "italic",
              color: "var(--text-primary)",
              lineHeight: 1.25,
            }}
          >
            Conflict-Free
            <br />
            Gold
          </div>
        </div>

        {/* ── Move 2: Right reveal — specs column ──────────────────── */}
        {/* Wrapper owns the CSS translate centering; inner ref is GSAP-only */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: 52,
            transform: "translateY(-50%)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <div
            ref={revealSpecsRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "flex-end",
            }}
          >
            {[
              "1.2 Carat",
              "Ethically sourced",
              "GIA certified",
              "Conflict free",
            ].map((spec) => (
              <div
                key={spec}
                style={{
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-body)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 1,
                    background: "rgba(201,168,76,0.3)",
                    display: "inline-block",
                  }}
                />
                {spec}
              </div>
            ))}
          </div>
        </div>

        {/* ── Move 3: Stone reveal — bottom-right ──────────────────── */}
        <div
          ref={revealStoneRef}
          style={{
            position: "absolute",
            bottom: 100,
            right: 52,
            zIndex: 10,
            pointerEvents: "none",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.30em",
              color: "var(--gold)",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              marginBottom: 12,
            }}
          >
            The stone
          </div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(32px, 3.8vw, 52px)",
              fontWeight: 300,
              fontStyle: "italic",
              color: "var(--text-primary)",
              lineHeight: 1.25,
            }}
          >
            Three cuts.
            <br />
            One truth.
          </div>
        </div>

        {/* ── Phase 4: Begin Configuration — matches beforehorizontal1/2 ─ */}
        {/*
        Centered overlay. Ring fills viewport at this point (z=1.4).
        Editorial label + large italic heading + gold divider.
        pointerEvents:none so it never blocks the button below.
      */}
        <div
          ref={revealBeginRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 120, // keep text above the CTA button below
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.38em",
              color: "var(--gold)",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              marginBottom: 18,
            }}
          >
            The Collection
          </div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(48px, 5.8vw, 84px)",
              fontWeight: 300,
              fontStyle: "italic",
              color: "var(--text-primary)",
              letterSpacing: "0.03em",
              lineHeight: 1.05,
              textAlign: "center",
            }}
          >
            Begin
            <br />
            Configuration
          </div>
          <div
            style={{
              width: 40,
              height: 1,
              background: "var(--gold)",
              opacity: 0.4,
              marginTop: 28,
            }}
          />
        </div>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        {/*
          Outer div owns CSS centering only — GSAP never touches it.
          ctaRef is on the inner div so GSAP's y/opacity don't overwrite
          the translateX(-50%), which would shift the button off-center.
        */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
        <div
          ref={ctaRef}
          style={{
            opacity: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <button
            ref={magnetRef}
            data-cursor-hover
            onClick={handleConfigure}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gold)";
              e.currentTarget.style.color = "#0a0a0a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            style={{
              padding: "12px 36px",
              border: "1px solid rgba(201,168,76,0.35)",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              transition: "background 0.35s ease, color 0.35s ease",
              willChange: "transform",
            }}
          >
            Configure Yours →
          </button>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 14,
                height: 1,
                background: "#222",
                display: "inline-block",
              }}
            />
            Scroll
            <span
              style={{
                width: 14,
                height: 1,
                background: "#222",
                display: "inline-block",
              }}
            />
          </div>
        </div>
        </div>
      </section>

    </>
  );
}
