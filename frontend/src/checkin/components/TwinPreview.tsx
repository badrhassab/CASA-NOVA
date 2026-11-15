import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { HealthDomain, Status } from '../../types';
import type { TwinPreviewState } from '../types';
import { STATUS_COLOR, STATUS_LABEL } from '../evaluate';

const DOMAIN_ORDER: HealthDomain[] = ['bone', 'heart', 'immune', 'mind'];
const DOMAIN_LABEL: Record<HealthDomain, string> = {
  bone: 'BONE',
  heart: 'HEART',
  immune: 'IMMUNE',
  mind: 'MIND',
};

interface TwinPreviewProps {
  state: TwinPreviewState;
  reducedMotion: boolean;
}

export const TwinPreview: React.FC<TwinPreviewProps> = ({ state, reducedMotion }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const scoreRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prevScores = useRef<(number | null)[]>([null, null, null, null]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      state.domains.forEach((d, i) => {
        const el = scoreRefs.current[i];
        if (!el) return;
        const next = d?.score ?? null;
        const prev = prevScores.current[i];

        if (next == null) {
          el.textContent = '—';
          prevScores.current[i] = null;
          return;
        }

        if (reducedMotion) {
          el.textContent = String(next);
          prevScores.current[i] = next;
          return;
        }

        const from = prev ?? 0;
        const obj = { n: from };
        gsap.to(obj, {
          n: next,
          duration: 0.75,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = String(Math.round(obj.n));
          },
        });

        const bar = root.querySelector<HTMLElement>(`.ck-twin-bar[data-i="${i}"]`);
        if (bar) {
          if (prev == null) {
            gsap.set(bar, { scaleX: 0 });
          }
          gsap.to(bar, {
            scaleX: next / 100,
            duration: 0.75,
            ease: 'power2.out',
          });
        }

        const dot = root.querySelector<HTMLElement>(`.ck-twin-dot[data-i="${i}"]`);
        if (dot && d) {
          gsap.to(dot, {
            backgroundColor: STATUS_COLOR[d.status],
            duration: 0.4,
          });
        }

        prevScores.current[i] = next;
      });

      const overallDot = root.querySelector<HTMLElement>('.ck-twin-overall-dot');
      if (overallDot && state.overall) {
        gsap.to(overallDot, {
          backgroundColor: STATUS_COLOR[state.overall],
          duration: reducedMotion ? 0 : 0.4,
        });
      }
    }, root);

    return () => ctx.revert();
  }, [state, reducedMotion]);

  return (
    <aside
      ref={rootRef}
      className="ck-twin-preview"
      style={{ height: '100%' }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--orange)',
        }}
      >
        ■ Twin preview
      </span>

      <div className="mt-5 mb-8 flex items-start gap-3">
        <span
          className="ck-twin-overall-dot mt-1.5 flex-shrink-0"
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: state.overall ? STATUS_COLOR[state.overall] : 'var(--muted)',
          }}
        />
        <div>
          <div
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontWeight: 600,
              fontSize: 20,
              letterSpacing: '-0.03em',
              color: 'var(--fg)',
            }}
          >
            {state.overall ? STATUS_LABEL[state.overall] : 'AWAITING DATA'}
          </div>
          <p
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              color: 'var(--muted)',
              margin: '6px 0 0',
              lineHeight: 1.45,
            }}
          >
            {state.why}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {DOMAIN_ORDER.map((domain, i) => {
          const d = state.domains[i];
          return (
            <div key={domain}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="ck-twin-dot"
                    data-i={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: d ? STATUS_COLOR[d.status as Status] : 'var(--muted)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      color: 'var(--fg)',
                    }}
                  >
                    {DOMAIN_LABEL[domain]}
                  </span>
                </div>
                <span
                  ref={(el) => {
                    scoreRefs.current[i] = el;
                  }}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    color: 'var(--fg)',
                  }}
                >
                  {d ? d.score : '—'}
                </span>
              </div>
              <div style={{ height: 2, background: 'var(--border)', position: 'relative' }}>
                <div
                  className="ck-twin-bar"
                  data-i={i}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '100%',
                    background: d ? STATUS_COLOR[d.status] : 'var(--muted)',
                    transform: `scaleX(${d ? d.score / 100 : 0})`,
                    transformOrigin: 'left center',
                    opacity: d ? 1 : 0.3,
                  }}
                />
              </div>
              {d && d.status !== 'green' && (
                <div style={{ marginTop: 9, paddingLeft: 10, borderLeft: `1px solid ${STATUS_COLOR[d.status]}` }}>
                  <p style={{ margin: '0 0 4px', color: 'var(--fg)', fontSize: 12, lineHeight: 1.4 }}>{d.why}</p>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12, lineHeight: 1.4 }}>Action: {d.action}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default TwinPreview;
