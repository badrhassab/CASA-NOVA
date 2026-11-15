import React from 'react';
import type { BodyZone } from '../types';

const ZONES: Array<{ id: BodyZone; label: string; d: string }> = [
  { id: 'head', label: 'Head', d: 'M100 18c-12 0-22 10-22 22s10 22 22 22 22-10 22-22-10-22-22-22z' },
  { id: 'neck', label: 'Neck', d: 'M90 60h20v14H90z' },
  { id: 'shoulders', label: 'Shoulders', d: 'M48 74h104v16H48z' },
  { id: 'chest', label: 'Chest', d: 'M72 90h56v36H72z' },
  { id: 'upperBack', label: 'Upper back', d: 'M78 126h44v22H78z' },
  { id: 'lowerBack', label: 'Lower back', d: 'M78 148h44v24H78z' },
  { id: 'hips', label: 'Hips', d: 'M70 172h60v20H70z' },
  { id: 'knees', label: 'Knees', d: 'M74 230h20v18H74zm32 0h20v18h-20z' },
  { id: 'ankles', label: 'Ankles', d: 'M76 290h16v14H76zm32 0h16v14h-16z' },
];

interface BodyMapProps {
  selected: BodyZone[];
  onChange: (zones: BodyZone[]) => void;
}

export const BodyMap: React.FC<BodyMapProps> = ({ selected, onChange }) => {
  const toggle = (id: BodyZone) => {
    if (selected.includes(id)) onChange(selected.filter((z) => z !== id));
    else onChange([...selected, id]);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <svg
        viewBox="0 0 200 320"
        width="160"
        height="256"
        aria-label="Body map front view"
        style={{ flexShrink: 0 }}
      >
        {/* silhouette outline */}
        <path
          d="M100 16c-14 0-26 12-26 26 0 10 6 19 14 23v8H52c-4 0-6 3-6 6v12l22 8v20c0 8 4 14 10 18v18c-2 4-4 10-4 16v28c0 6 2 10 6 12v40c0 8 4 20 8 28v18c0 4 2 6 6 6h12c4 0 6-2 6-6v-18c4-8 8-20 8-28v-40c4-2 6-6 6-12v-28c0-6-2-12-4-16v-18c6-4 10-10 10-18v-20l22-8V79c0-3-2-6-6-6h-36v-8c8-4 14-13 14-23 0-14-12-26-26-26z"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1.2"
          opacity="0.5"
        />
        {ZONES.map((z) => {
          const on = selected.includes(z.id);
          return (
            <path
              key={z.id}
              d={z.d}
              fill={on ? 'var(--orange)' : 'transparent'}
              stroke={on ? 'var(--orange)' : 'var(--muted)'}
              strokeWidth="1.5"
              opacity={on ? 0.85 : 0.7}
              style={{ cursor: 'pointer', transition: 'fill 0.15s, stroke 0.15s' }}
              onClick={() => toggle(z.id)}
            >
              <title>{z.label}</title>
            </path>
          );
        })}
      </svg>

      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex flex-wrap gap-2">
          {ZONES.map((z) => {
            const on = selected.includes(z.id);
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => toggle(z.id)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '8px 12px',
                  border: `1px solid ${on ? 'var(--orange)' : 'var(--muted)'}`,
                  color: on ? 'var(--orange)' : 'var(--fg)',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                {z.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onChange([])}
          style={{
            alignSelf: 'flex-start',
            marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Nowhere
        </button>
      </div>
    </div>
  );
};

export default BodyMap;
