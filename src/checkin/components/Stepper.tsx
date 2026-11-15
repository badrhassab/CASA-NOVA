import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SECTION_LABELS } from '../questions';

interface StepperProps {
  activeIndex: number;
  reducedMotion: boolean;
}

export const Stepper: React.FC<StepperProps> = ({ activeIndex, reducedMotion }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef(activeIndex);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const circles = root.querySelectorAll<HTMLElement>('.ck-step-circle');
      const lines = root.querySelectorAll<HTMLElement>('.ck-step-line-fill');
      const active = circles[activeIndex];

      lines.forEach((line, i) => {
        const filled = i < activeIndex;
        if (reducedMotion) {
          gsap.set(line, { scaleX: filled ? 1 : 0 });
        } else {
          gsap.to(line, {
            scaleX: filled ? 1 : 0,
            duration: 0.45,
            ease: 'power2.out',
          });
        }
      });

      if (active && !reducedMotion && prevRef.current !== activeIndex) {
        gsap.fromTo(
          active,
          { scale: 0.8 },
          { scale: 1, duration: 0.4, ease: 'power3.out' },
        );
        const ring = active.querySelector('.ck-step-ring');
        if (ring) {
          gsap.fromTo(
            ring,
            { scale: 0.7, opacity: 0.8 },
            { scale: 1.45, opacity: 0, duration: 0.55, ease: 'power2.out' },
          );
        }
      }
    }, root);

    prevRef.current = activeIndex;
    return () => ctx.revert();
  }, [activeIndex, reducedMotion]);

  return (
    <div ref={rootRef} className="w-full" style={{ padding: '8px 0 4px' }}>
      <div className="flex items-start w-full" style={{ gap: 0 }}>
        {SECTION_LABELS.map((label, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          const upcoming = i > activeIndex;

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center" style={{ flex: '0 0 auto', width: 44 }}>
                <div
                  className="ck-step-circle relative flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: done ? 'var(--fg)' : 'transparent',
                    border: active
                      ? '1.5px solid var(--orange)'
                      : done
                        ? '1.5px solid var(--fg)'
                        : '1.5px solid var(--muted)',
                    color: done ? 'var(--bg)' : active ? 'var(--orange)' : 'var(--muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {active && (
                    <span
                      className="ck-step-ring absolute inset-0 rounded-full pointer-events-none"
                      style={{ border: '1px solid var(--orange)', opacity: 0 }}
                    />
                  )}
                  {i + 1}
                </div>
                <span
                  className="ck-step-label text-center mt-2"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: upcoming ? 'var(--muted)' : 'var(--fg)',
                    lineHeight: 1.25,
                    maxWidth: 72,
                    display: 'none',
                  }}
                  data-active={active ? '1' : '0'}
                >
                  {label}
                </span>
              </div>

              {i < SECTION_LABELS.length - 1 && (
                <div
                  className="relative flex-1"
                  style={{ height: 28, display: 'flex', alignItems: 'center', marginTop: 0 }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 1,
                      background: 'var(--muted)',
                      opacity: 0.35,
                    }}
                  />
                  <div
                    className="ck-step-line-fill absolute left-0 top-1/2"
                    style={{
                      width: '100%',
                      height: 1,
                      background: 'var(--fg)',
                      transform: 'scaleX(0)',
                      transformOrigin: 'left center',
                      marginTop: -0.5,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        .ck-step-label { display: none; }
        @media (min-width: 768px) {
          .ck-step-label { display: block !important; }
        }
        @media (max-width: 767px) {
          .ck-step-label[data-active="1"] { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default Stepper;
