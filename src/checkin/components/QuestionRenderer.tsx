import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { BodyZone, CheckInAnswers, QuestionField } from '../types';
import { BodyMap } from './BodyMap';
import { ReactionTest } from './ReactionTest';
import { formatDelta } from '../sensors';

interface QuestionRendererProps {
  field: QuestionField;
  answers: CheckInAnswers;
  onChange: <K extends keyof CheckInAnswers>(id: K, value: CheckInAnswers[K]) => void;
  reducedMotion: boolean;
  tag?: 'auto' | 'today' | 'edited' | null;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  field,
  answers,
  onChange,
  reducedMotion,
  tag,
}) => {
  const visible = field.showIf ? field.showIf(answers) : true;
  const wrapRef = useRef<HTMLDivElement>(null);
  const prevVisible = useRef(visible);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      if (visible && !prevVisible.current) {
        if (reducedMotion) {
          gsap.set(el, { height: 'auto', opacity: 1, overflow: 'visible' });
        } else {
          gsap.set(el, { height: 0, opacity: 0, overflow: 'hidden' });
          gsap.to(el, {
            height: 'auto',
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            onComplete: () => {
              gsap.set(el, { overflow: 'visible' });
            },
          });
        }
      } else if (!visible && prevVisible.current) {
        if (reducedMotion) {
          gsap.set(el, { height: 0, opacity: 0, overflow: 'hidden' });
        } else {
          gsap.to(el, {
            height: 0,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            overflow: 'hidden',
          });
        }
      } else if (!visible) {
        gsap.set(el, { height: 0, opacity: 0, overflow: 'hidden' });
      }
    }, el);

    prevVisible.current = visible;
    return () => ctx.revert();
  }, [visible, reducedMotion]);

  const value = answers[field.id];

  return (
    <div ref={wrapRef} className="ck-field" data-field={field.id} style={{ marginBottom: 28 }}>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <label
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontWeight: 500,
            fontSize: 'clamp(1.05rem, 2.2vw, 1.35rem)',
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
          }}
        >
          {field.label}
        </label>
        {field.auto && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              border: '1px solid var(--orange)',
              padding: '2px 6px',
            }}
          >
            {field.autoTag ?? 'AUTO · WEARABLE'}
          </span>
        )}
        {!field.auto && tag === 'today' && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              padding: '2px 6px',
            }}
          >
            TODAY'S ANSWER
          </span>
        )}
        {!field.auto && tag === 'edited' && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              border: '1px solid var(--orange)',
              padding: '2px 6px',
            }}
          >
            EDITED
          </span>
        )}
      </div>

      {field.helper && (
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.04em',
            margin: '0 0 14px',
            textTransform: field.type === 'readonly' ? 'uppercase' : undefined,
          }}
        >
          {field.helper}
        </p>
      )}

      {field.type === 'stepper' && (
        <NumberStepper
          value={Number(value)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          unit={field.unit}
          onChange={(n) => onChange(field.id, n as never)}
        />
      )}

      {field.type === 'slider' && (
        <ValueSlider
          value={Number(value)}
          min={field.min ?? 0}
          max={field.max ?? 10}
          step={field.step ?? 1}
          unit={field.unit}
          onChange={(n) => onChange(field.id, n as never)}
        />
      )}

      {field.type === 'segmented' && field.options && (
        <Segmented
          options={field.options}
          value={value == null ? null : String(value)}
          onChange={(v) => onChange(field.id, v as never)}
        />
      )}

      {field.type === 'yesno' && (
        <Segmented
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          value={value == null ? null : String(value)}
          onChange={(v) => onChange(field.id, v as never)}
        />
      )}

      {field.type === 'chips' && field.options && (
        <ChipGroup
          options={field.options}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(v) => onChange(field.id, v as never)}
        />
      )}

      {field.type === 'bodyMap' && (
        <BodyMap
          selected={(value as BodyZone[]) ?? []}
          onChange={(zones) => onChange(field.id, zones as never)}
        />
      )}

      {(field.type === 'readonly' || field.type === 'sensor') && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 64,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                color: 'var(--fg)',
              }}
            >
              {typeof value === 'number'
                ? (field.decimals != null && field.decimals > 0
                    ? value.toFixed(field.decimals)
                    : (field.decimals === 0 ? String(Math.round(value)) : String(value)))
                : String(value ?? '—')}
            </span>
            {field.unit && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                }}
              >
                {field.unit}
              </span>
            )}
          </div>
          {field.baseline != null && typeof value === 'number' && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.06em',
                color: Math.abs(value - field.baseline) > field.baseline * 0.05 ? 'var(--orange)' : 'var(--muted)',
              }}
            >
              {formatDelta(value, field.baseline, field.decimals ?? 0)}
            </span>
          )}
        </div>
      )}

      {field.type === 'reaction' && (
        <ReactionTest
          value={typeof value === 'number' ? value : null}
          onComplete={(ms) => onChange(field.id, ms as never)}
          onSkip={() => onChange(field.id, null as never)}
        />
      )}

      {field.type === 'textarea' && (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(field.id, e.target.value as never)}
          rows={6}
          placeholder="Optional notes…"
          style={{
            width: '100%',
            resize: 'vertical',
            background: 'transparent',
            border: '1px solid var(--muted)',
            color: 'var(--fg)',
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 16,
            padding: 16,
            borderRadius: 0,
            outline: 'none',
            minHeight: 140,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--orange)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--muted)';
          }}
        />
      )}
    </div>
  );
};

/* ─── Inputs ──────────────────────────────────────────────────────────────── */

function NumberStepper({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  const bump = (dir: 1 | -1) => {
    const next = Math.round((value + dir * step) * 10 ** decimals) / 10 ** decimals;
    onChange(Math.max(min, Math.min(max, next)));
  };
  const display = decimals > 0 ? value.toFixed(decimals) : String(value);

  return (
    <div className="flex items-center gap-5">
      <StepBtn label="−" onClick={() => bump(-1)} />
      <div className="flex items-baseline gap-2 min-w-[120px]">
        <span style={bigMono}>{display}</span>
        {unit && <span style={unitStyle}>{unit}</span>}
      </div>
      <StepBtn label="+" onClick={() => bump(1)} />
    </div>
  );
}

function StepBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === '+' ? 'Increase' : 'Decrease'}
      style={{
        width: 48,
        height: 48,
        border: '1px solid var(--muted)',
        background: 'transparent',
        color: 'var(--fg)',
        fontSize: 22,
        cursor: 'pointer',
        borderRadius: 0,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {label}
    </button>
  );
}

function ValueSlider({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  const display = decimals > 0 ? value.toFixed(decimals) : String(value);

  return (
    <div className="flex flex-col gap-3 max-w-md">
      <div className="flex items-baseline gap-2">
        <span style={bigMono}>{display}</span>
        {unit && <span style={unitStyle}>{unit}</span>}
      </div>
      <div className="ck-slider-wrap relative" style={{ height: 28, display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            background: 'var(--muted)',
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${pct}%`,
            height: 2,
            background: 'var(--orange)',
          }}
        />
        <input
          type="range"
          className="ck-range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '12px 16px',
              border: `1px solid ${on ? 'var(--orange)' : 'var(--muted)'}`,
              color: on ? 'var(--orange)' : 'var(--fg)',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => {
    if (v === 'none') {
      onChange(['none']);
      return;
    }
    const withoutNone = value.filter((x) => x !== 'none');
    if (withoutNone.includes(v)) {
      const next = withoutNone.filter((x) => x !== v);
      onChange(next);
    } else {
      onChange([...withoutNone, v]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '12px 16px',
              border: `1px solid ${on ? 'var(--orange)' : 'var(--muted)'}`,
              color: on ? 'var(--orange)' : 'var(--fg)',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const bigMono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 64,
  lineHeight: 1,
  letterSpacing: '-0.04em',
  color: 'var(--fg)',
};

const unitStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  color: 'var(--muted)',
  textTransform: 'uppercase',
};

export default QuestionRenderer;
