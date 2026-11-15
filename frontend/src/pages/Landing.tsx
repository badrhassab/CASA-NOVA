import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Header } from '../components/Header';
import heroCutoutUrl from '../assets/hero-cutout.png';

// ─── Types ───────────────────────────────────────────────────────────────────

type ColorScheme = 'dark' | 'light';

// ─── CSS-var color tables ────────────────────────────────────────────────────

const DARK_VARS = {
  '--bg':     '#050505',
  '--fg':     '#F2F2F0',
  '--muted':  '#8A8A86',
  '--border': 'rgba(242,242,240,0.08)',
};

const LIGHT_VARS = {
  '--bg':     '#F2F4F6',
  '--fg':     '#0A0A0A',
  '--muted':  '#6B6B68',
  '--border': 'rgba(10,10,10,0.10)',
};

// ─── ECG Path definition (one full heartbeat wave tiled across a wide canvas) ─

// A simple ECG-style path: flat baseline with a QRS spike in the center
// We define one cycle, then repeat it. Total width = 1600px so it spans full screen at any res.
const ECG_CYCLE = `
  M0,0 L60,0 L70,-4 L80,0 L90,0
  L100,-2 L110,-28 L120,10 L130,-14 L140,2 L150,0
  L200,0 L220,-3 L240,0 L260,0
  L300,0 L320,0
`;
// Build a full 1600-wide path by repeating the cycle
function buildEcgPath(): string {
  const cycleW = 320;
  let d = '';
  for (let i = 0; i < 6; i++) {
    const offset = i * cycleW;
    // Parse the template and shift x coords
    const shifted = ECG_CYCLE.trim().replace(
      /([ML])([\d.-]+),([\d.-]+)/g,
      (_m, cmd, x, y) => `${cmd}${parseFloat(x) + offset},${y}`
    );
    d += (i === 0 ? shifted : shifted.replace(/^M[\d.-]+,[\d.-]+\s*/, `L${offset},0 `));
  }
  return d;
}
const ECG_PATH_D = buildEcgPath();
const ECG_TOTAL_WIDTH = 320 * 6; // ~1920px

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyTheme(scheme: ColorScheme, animated: boolean) {
  const vars = scheme === 'dark' ? DARK_VARS : LIGHT_VARS;
  const root = document.documentElement;
  root.classList.toggle('light', scheme === 'light');

  if (animated) {
    gsap.to(root, {
      '--bg':     vars['--bg'],
      '--fg':     vars['--fg'],
      '--muted':  vars['--muted'],
      '--border': vars['--border'],
      duration: 0.9,
      ease: 'power2.inOut',
    });
  } else {
    Object.entries(vars).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  }
}

function readTheme(): ColorScheme {
  try {
    const saved = localStorage.getItem('ag-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return 'dark';
}

function saveTheme(scheme: ColorScheme) {
  try { localStorage.setItem('ag-theme', scheme); } catch { /* ignore */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Landing: React.FC = () => {
  const containerRef   = useRef<HTMLDivElement>(null);
  const astronautRef   = useRef<HTMLImageElement>(null);
  const visorRef       = useRef<HTMLDivElement>(null);
  const specksRef      = useRef<HTMLDivElement>(null);
  const depthGlowRef   = useRef<HTMLDivElement>(null);
  const counterRef     = useRef<HTMLSpanElement>(null);
  const ctaRef         = useRef<HTMLDivElement>(null);
  const toggleRef      = useRef<HTMLButtonElement>(null);
  // New refs for added elements
  const vitalWordRef   = useRef<HTMLDivElement>(null);
  const ecgPathRef     = useRef<SVGPathElement>(null);
  const ecgPulseRef    = useRef<SVGPathElement>(null);
  const hrNumberRef    = useRef<HTMLSpanElement>(null);

  const schemeRef = useRef<ColorScheme>(readTheme());
  const navigate  = useNavigate();

  // ── Theme toggle ───────────────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    const next: ColorScheme = schemeRef.current === 'dark' ? 'light' : 'dark';
    schemeRef.current = next;
    saveTheme(next);
    applyTheme(next, true);

    // Fade depth glow out in light mode
    if (depthGlowRef.current) {
      gsap.to(depthGlowRef.current, {
        opacity: next === 'light' ? 0 : 1,
        duration: 0.9,
        ease: 'power2.inOut',
      });
    }
  }, []);

  // ── Main animation + parallax ─────────────────────────────────────────────
  useEffect(() => {
    applyTheme(schemeRef.current, false);

    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice        = window.matchMedia('(pointer: coarse)').matches;

    // HR live number interval
    let hrInterval: ReturnType<typeof setInterval> | null = null;

    const ctx = gsap.context(() => {
      // ── Reduced-motion: instant final state ──────────────────────────────
      if (prefersReducedMotion) {
        gsap.set(
          [
            '.gs-header-logo',
            '.gs-header-right',
            '.gs-nav-item',
            '.gs-nav-dot',
            '.gs-hl',
            '.gs-label',
            '.gs-subline',
            '.gs-br-item',
            '.gs-footer',
            '.gs-toggle',
            '.gs-corner',
            vitalWordRef.current,
            '.gs-ecg-wrap',
          ],
          { opacity: 1, x: 0, y: 0, yPercent: 0, scale: 1, scaleX: 1, scaleY: 1, clipPath: 'inset(0% 0% 0% 0%)' }
        );
        // Astronaut keeps its base scale of 1.04
        gsap.set(astronautRef.current, { opacity: 1, y: 0, scale: 1.04 });
        gsap.set(visorRef.current, { opacity: 0.25, scale: 1 });
        if (counterRef.current) counterRef.current.textContent = '001';
        if (hrNumberRef.current) hrNumberRef.current.textContent = '62';
        return;
      }

      // ── Main timeline ─────────────────────────────────────────────────────
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // 1. Astronaut image: scale 1.16 → 1.04, opacity 0 → 1, y -40 → 0 (rising up from below)
      //    xPercent: -50 horizontally centres the image (replaces CSS translateX(-50%)).
      //    GSAP fully owns the transform so CSS translateX is not needed on the element.
      tl.fromTo(
        astronautRef.current,
        { opacity: 0, scale: 1.16, y: 40, xPercent: -50 },
        { opacity: 1, scale: 1.04, y: 0, xPercent: -50, duration: 2.0, ease: 'power2.out' },
        0
      );

      // Visor orange reflection entrance
      tl.fromTo(
        visorRef.current,
        { opacity: 0, scale: 0.85 },
        { opacity: 0.25, scale: 1, duration: 1.8, ease: 'power2.out' },
        0.4
      );

      // "vital signs" ghost word: clip-path reveal (right curtain lifts)
      tl.fromTo(
        vitalWordRef.current,
        { clipPath: 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power2.out' },
        0.5
      );

      // 2. Header logo + right links fade-in + y -20 → 0
      tl.fromTo(
        ['.gs-header-logo', '.gs-header-right'],
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 },
        0.8
      );

      // 3. Nav items + dots
      tl.fromTo(
        '.gs-nav-item',
        { opacity: 0, y: -15 },
        { opacity: 1, y: 0, duration: 0.75, stagger: 0.1 },
        0.9
      );
      tl.fromTo(
        '.gs-nav-dot',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.45, stagger: 0.08 },
        1.0
      );

      // ECG line fade in
      tl.fromTo(
        '.gs-ecg-wrap',
        { opacity: 0 },
        { opacity: 1, duration: 0.9 },
        1.2
      );

      // 4. Headline reveal: each line from yPercent 110 → 0
      tl.fromTo(
        '.gs-hl',
        { yPercent: 110 },
        { yPercent: 0, duration: 1.1, stagger: 0.15 },
        1.1
      );

      // 5. Label + sub-line: fade + x -20 → 0
      tl.fromTo(
        ['.gs-label', '.gs-subline'],
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.8, stagger: 0.1 },
        1.3
      );

      // 6. Bottom-right block items + counter + corner brackets
      tl.fromTo(
        '.gs-br-item',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.75, stagger: 0.1 },
        1.45
      );

      const countObj = { val: 0 };
      tl.to(
        countObj,
        {
          val: 1,
          duration: 1.1,
          ease: 'power1.inOut',
          onUpdate() {
            if (counterRef.current) {
              counterRef.current.textContent = Math.round(countObj.val).toString().padStart(3, '0');
            }
          },
        },
        1.55
      );

      tl.fromTo(
        '.gs-corner',
        { scaleX: 0, scaleY: 0 },
        { scaleX: 1, scaleY: 1, duration: 0.55, ease: 'power2.out', stagger: 0.06 },
        1.85
      );

      // 7. Footer + toggle fade last; specks pop in
      tl.fromTo(
        ['.gs-footer', '.gs-toggle'],
        { opacity: 0 },
        { opacity: 1, duration: 0.7 },
        2.1
      );
      tl.fromTo(
        '.gs-speck',
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 1.0, stagger: 0.12 },
        1.6
      );

      // ── Post-intro loops ──────────────────────────────────────────────────

      // Astronaut float: gentle bob y 0 → -10 → 0, 5s, sine.inOut
      // Negative y = upward; scale stays at 1.04 so bottom edge never peeks out
      gsap.fromTo(astronautRef.current, 
        { y: 0 },
        { y: -10, duration: 5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2.0 },
      );

      // Visor reflection pulse: opacity 0.18 ↔ 0.3, 4s, yoyo
      gsap.to(visorRef.current, {
        opacity: 0.3, scale: 1.06, duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut',
      });

      // Specks drift
      gsap.to('.gs-speck', {
        y: 'random(-12, 12)',
        x: 'random(-10, 10)',
        duration: 'random(4, 7)',
        repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.3,
      });

      // "vital signs" slow horizontal drift: x ±30px, 12s, sine.inOut
      gsap.to(vitalWordRef.current, {
        x: 30, duration: 12, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.5,
      });

      // ECG orange pulse: animate strokeDashoffset along the path, 4s linear repeat
      if (ecgPulseRef.current) {
        const pulseLen = 120;
        const totalLen = ECG_TOTAL_WIDTH + 200;
        gsap.set(ecgPulseRef.current, {
          strokeDasharray: `${pulseLen} ${totalLen}`,
          strokeDashoffset: totalLen,
        });
        gsap.to(ecgPulseRef.current, {
          strokeDashoffset: -pulseLen,
          duration: 4,
          ease: 'none',
          repeat: -1,
        });
      }

      // HR number fluctuation: 60–66, every ~1.1s
      const hrValues = [62, 63, 61, 64, 62, 60, 65, 63, 66, 61, 62, 64];
      let hrIdx = 0;
      hrInterval = setInterval(() => {
        hrIdx = (hrIdx + 1) % hrValues.length;
        if (hrNumberRef.current) {
          hrNumberRef.current.textContent = String(hrValues[hrIdx]);
        }
      }, 1100);

      // ── Mouse parallax ────────────────────────────────────────────────────
      if (!isTouchDevice) {
        const xImg      = gsap.quickTo(astronautRef.current, 'x', { duration: 0.9, ease: 'power2.out' });
        const yImg      = gsap.quickTo(astronautRef.current, 'y', { duration: 0.9, ease: 'power2.out' });
        const xSpecks   = gsap.quickTo(specksRef.current,   'x', { duration: 1.3, ease: 'power2.out' });
        const ySpecks   = gsap.quickTo(specksRef.current,   'y', { duration: 1.3, ease: 'power2.out' });
        // Vital word moves OPPOSITE to mouse (parallax depth)
        const xVital    = gsap.quickTo(vitalWordRef.current, 'x', { duration: 1.8, ease: 'power2.out' });

        const onMove = (e: MouseEvent) => {
          const nx = (e.clientX / window.innerWidth  - 0.5) * 2;
          const ny = (e.clientY / window.innerHeight - 0.5) * 2;
          xImg(nx * 15);
          yImg(ny * 10);
          xSpecks(nx * -28);
          ySpecks(ny * -22);
          xVital(nx * -20);  // opposite direction, max 20px
        };

        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
      }
    }, container);

    return () => {
      ctx.revert();
      if (hrInterval) clearInterval(hrInterval);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: "'Inter Tight', sans-serif" }}
    >

      {/* ══ z-0 · Solid bg + depth glow (dark only) ════════════════════════════ */}
      <div
        ref={depthGlowRef}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 65% at 50% 55%, rgba(35,35,35,0.85) 0%, transparent 100%)',
        }}
      />

      {/* ══ z-10 · Giant faded "vital signs" — BEHIND astronaut ═══════════════ */}
      <div
        ref={vitalWordRef}
        aria-hidden="true"
        style={{
          position: 'absolute', zIndex: 10, pointerEvents: 'none',
          top: '18%',
          left: 0, right: 0,
          overflow: 'hidden',          // never bleeds outside viewport width
          whiteSpace: 'nowrap',
          paddingLeft: '2vw',          // slight indent so it starts just off-left
          fontFamily: "'Inter Tight', sans-serif",
          fontWeight: 500,
          fontSize: 'clamp(14vw, 20vw, 22vw)',
          letterSpacing: '-0.05em',
          lineHeight: 1,
          color: 'var(--fg)',
          opacity: 0.06,
          clipPath: 'inset(0% 100% 0% 0%)',   // GSAP reveals right→left
          userSelect: 'none',
        }}
      >
        vital signs
      </div>

      {/* ══ z-20 · ECG heartbeat line — also BEHIND astronaut ════════════════ */}
      {/* Vertically centred at ~visor height (~top 36%) */}
      <div
        className="gs-ecg-wrap"
        aria-hidden="true"
        style={{
          position: 'absolute', zIndex: 20, pointerEvents: 'none',
          top: '36%', left: 0, right: 0,
          transform: 'translateY(-50%)',
          opacity: 0,          // GSAP fades this in
        }}
      >
        {/* HR live label — always in front of ECG line but behind astronaut */}
        <div
          style={{
            position: 'absolute', top: -18, left: '3rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--muted)',
            letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span>HR</span>
          <span ref={hrNumberRef}>62</span>
          <span>BPM</span>
        </div>

        <svg
          viewBox={`0 -35 ${ECG_TOTAL_WIDTH} 50`}
          preserveAspectRatio="none"
          width="100%" height="50"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <path
            ref={ecgPathRef}
            d={ECG_PATH_D}
            fill="none" stroke="var(--fg)" strokeWidth="1"
            strokeOpacity="0.12" vectorEffect="non-scaling-stroke"
          />
          <path
            ref={ecgPulseRef}
            d={ECG_PATH_D}
            fill="none" stroke="#FF5A1F" strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* ══ z-30 · Astronaut + visor + specks ═════════════════════════════════ */}
      {/*
        Strategy: position the img absolute, bottom:0, so the suit base always
        sits at the viewport bottom edge. We scale the img slightly (1.04×) so
        the floating animation never exposes the bottom edge.
        The flex container is gone — everything is absolutely placed.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        {/* Black ellipse behind visor — keeps visor dark in light mode */}
        {/* top value: image is 85vh tall anchored at bottom:0,
            so visor (~32% from top of image) is at:
            100vh - 85vh + 85vh*0.32 ≈ 100vh - 85vh*0.68 ≈ 42.2% from top */}
        <div style={{
          position: 'absolute',
          top: '22%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(140px, 18vw, 280px)',
          height: 'clamp(110px, 14vw, 220px)',
          borderRadius: '50%',
          backgroundColor: 'var(--bg)',   // matches theme bg so it's seamless
          zIndex: 1,
        }} />

        {/* Visor orange reflection */}
        <div
          ref={visorRef}
          style={{
            position: 'absolute',
            top: '22%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(130px, 16vw, 260px)',
            height: 'clamp(100px, 12vw, 210px)',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 50% 42%, rgba(255,90,31,0.55) 0%, rgba(255,90,31,0.14) 45%, transparent 72%)',
            mixBlendMode: 'screen',
            filter: 'blur(10px)',
            opacity: 0,
            zIndex: 3,
          }}
        />

        {/* Decorative floating specks */}
        <div ref={specksRef} style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          <div className="gs-speck" style={{ position: 'absolute', top: '18%', left: '37%', width: 4, height: 4, borderRadius: '50%', opacity: 0, backgroundColor: 'var(--fg)' }} />
          <div className="gs-speck" style={{ position: 'absolute', top: '28%', left: '32%', width: 6, height: 6, borderRadius: '50%', opacity: 0, backgroundColor: 'var(--orange)' }} />
          <div className="gs-speck" style={{ position: 'absolute', top: '22%', right: '34%', width: 4, height: 4, borderRadius: '50%', opacity: 0, backgroundColor: 'var(--fg)' }} />
          <div className="gs-speck" style={{ position: 'absolute', top: '36%', right: '31%', width: 4, height: 4, borderRadius: '50%', opacity: 0, backgroundColor: 'var(--muted)' }} />
          <div className="gs-speck" style={{ position: 'absolute', top: '14%', left: '51%', width: 2, height: 2, borderRadius: '50%', opacity: 0, backgroundColor: 'var(--orange)' }} />
        </div>

        {/*
          Astronaut image:
          · position: absolute; bottom: 0; left: 50%; translateX(-50%)
            → lower edge is always flush with the viewport bottom
          · height: 85vh — large enough that the helmet sits in the upper area
          · scale(1.04) built into initial transform so float animation (+8px up)
            never exposes the bottom edge
          · transformOrigin: center bottom — so scale grows upward, not downward
        */}
        <img
          ref={astronautRef}
          src={heroCutoutUrl}
          alt="AstroGuard astronaut"
          draggable={false}
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            /* xPercent: -50 is set by GSAP below so the transform is fully GSAP-owned.
               DO NOT set translateX here — GSAP will overwrite it. */
            transformOrigin: 'center bottom',
            height: '85vh',
            maxHeight: '92vh',
            width: 'auto',
            objectFit: 'contain',
            objectPosition: 'center bottom',
            opacity: 0,
            zIndex: 4,
          }}
        />
      </div>

      {/* ══ z-40 · All foreground UI: headline, blocks, header, footer ════════ */}

      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 }}>
        <Header />
      </div>

      {/* Main bottom content */}
      <main
        style={{
          position: 'absolute', bottom: '2.5rem', left: 0, right: 0,
          zIndex: 40,
          padding: '0 3rem',
          display: 'flex', flexDirection: 'row',
          alignItems: 'flex-end', justifyContent: 'space-between',
          gap: '2rem',
        }}
      >
        {/* ── Left: Label + Giant Headline + Sub-line ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: 'min(42vw, 560px)' }}>

          {/* Label */}
          <div
            className="gs-label"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 12, opacity: 0,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            }}
          >
            <span style={{ width: 6, height: 6, flexShrink: 0, backgroundColor: 'var(--orange)', display: 'inline-block' }} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              DEEP-SPACE HEALTH COPILOT
            </span>
          </div>

          {/* Headline line 1 */}
          <div style={{ overflow: 'hidden' }}>
            <h1
              className="gs-hl"
              style={{
                margin: 0,
                fontFamily: "'Inter Tight', sans-serif",
                fontWeight: 500, textTransform: 'uppercase',
                letterSpacing: '-0.04em', lineHeight: 0.9,
                fontSize: 'clamp(2.5rem, 6vw, 7rem)',
                color: 'var(--fg)',
              }}
            >
              YOUR HEALTH.
            </h1>
          </div>

          {/* Headline line 2 */}
          <div style={{ overflow: 'hidden' }}>
            <h1
              className="gs-hl"
              style={{
                margin: 0,
                fontFamily: "'Inter Tight', sans-serif",
                fontWeight: 500, textTransform: 'uppercase',
                letterSpacing: '-0.04em', lineHeight: 0.9,
                fontSize: 'clamp(2.5rem, 6vw, 7rem)',
                color: 'var(--fg)',
              }}
            >
              YOUR MISSION.
            </h1>
          </div>

          {/* Sub-line */}
          <p
            className="gs-subline"
            style={{
              marginTop: 12, opacity: 0,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)',
            }}
          >
            AUTONOMOUS HEALTH MONITORING FOR LONG-DURATION MISSIONS
          </p>
        </div>

        {/* ── Right: Mission block ── */}
        <div
          style={{
            maxWidth: 320, flexShrink: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            paddingBottom: 8,
            /* Subtle dark scrim so text stays legible over the suit */
            background: 'radial-gradient(ellipse at 100% 100%, rgba(5,5,5,0.72) 0%, transparent 75%)',
          }}
        >
          {/* Orange accent bar */}
          <div
            className="gs-br-item"
            style={{ width: 96, height: 2, marginBottom: 16, opacity: 0, backgroundColor: 'var(--orange)' }}
          />

          {/* "/ A" label + counter */}
          <div
            className="gs-br-item"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', marginBottom: 12, opacity: 0,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--orange)', fontWeight: 700 }}>/</span>
              <span>A</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span ref={counterRef}>000</span>
              <span style={{ opacity: 0.5 }}>/ 004</span>
            </div>
          </div>

          {/* Body paragraph */}
          <p
            className="gs-br-item"
            style={{
              maxWidth: 300, marginBottom: 20, opacity: 0,
              fontSize: 13, lineHeight: 1.6, color: 'var(--muted)',
            }}
          >
            No doctor on board. No signal for 20 minutes. AstroGuard learns your body
            and tells you what to do before it becomes a problem.
          </p>

          {/* CTA with corner brackets */}
          <div ref={ctaRef} className="gs-br-item group" style={{ position: 'relative', display: 'inline-block', opacity: 0 }}>
            <span className="gs-corner" style={{ position: 'absolute', top: -4, left: -4, width: 12, height: 12, borderTop: '1px solid', borderLeft: '1px solid', borderColor: 'var(--muted)', transition: 'all 0.3s' }} />
            <span className="gs-corner" style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderTop: '1px solid', borderRight: '1px solid', borderColor: 'var(--muted)', transition: 'all 0.3s' }} />
            <span className="gs-corner" style={{ position: 'absolute', bottom: -4, left: -4, width: 12, height: 12, borderBottom: '1px solid', borderLeft: '1px solid', borderColor: 'var(--muted)', transition: 'all 0.3s' }} />
            <span className="gs-corner" style={{ position: 'absolute', bottom: -4, right: -4, width: 12, height: 12, borderBottom: '1px solid', borderRight: '1px solid', borderColor: 'var(--muted)', transition: 'all 0.3s' }} />

            <button
              type="button"
              onClick={() => navigate('/twin')}
              style={{
                padding: '10px 20px',
                fontSize: 13, fontWeight: 500, fontFamily: "'Inter Tight', sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'transparent', border: 'none',
                color: 'var(--fg)', cursor: 'pointer',
                transition: 'color 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--orange)';
                ctaRef.current?.querySelectorAll<HTMLElement>('.gs-corner').forEach(c => {
                  c.style.borderColor = 'var(--orange)';
                });
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--fg)';
                ctaRef.current?.querySelectorAll<HTMLElement>('.gs-corner').forEach(c => {
                  c.style.borderColor = 'var(--muted)';
                });
              }}
            >
              <span>BEGIN MISSION</span>
              <span style={{ fontSize: 16, transition: 'transform 0.3s' }}>→</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer / theme toggle */}
      <footer
        className="gs-footer"
        style={{
          position: 'absolute', bottom: 12,
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 40,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          opacity: 0,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <button
          ref={toggleRef}
          type="button"
          onClick={toggleTheme}
          className="gs-toggle"
          style={{
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--muted)', background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 0, transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
        >
          ◐ DARK / LIGHT
        </button>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.6 }}>
          Decision support, not a medical diagnosis.
        </span>
      </footer>
    </div>
  );
};

export default Landing;
