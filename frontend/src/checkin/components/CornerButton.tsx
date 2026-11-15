import React, { useRef } from 'react';

interface CornerButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  accent?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}

export const CornerButton: React.FC<CornerButtonProps> = ({
  children,
  onClick,
  disabled = false,
  accent = false,
  className = '',
  type = 'button',
  ariaLabel,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  const setCorners = (color: string) => {
    wrapRef.current?.querySelectorAll<HTMLElement>('.ck-corner').forEach((c) => {
      c.style.borderColor = color;
    });
  };

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        opacity: disabled ? 0.35 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <span className="ck-corner" style={cornerStyle('tl')} />
      <span className="ck-corner" style={cornerStyle('tr')} />
      <span className="ck-corner" style={cornerStyle('bl')} />
      <span className="ck-corner" style={cornerStyle('br')} />
      <button
        type={type}
        aria-label={ariaLabel}
        onClick={onClick}
        style={{
          minHeight: 56,
          minWidth: 56,
          padding: '0 22px',
          background: 'transparent',
          border: 'none',
          color: accent ? 'var(--orange)' : 'var(--fg)',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--orange)';
          setCorners('var(--orange)');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = accent ? 'var(--orange)' : 'var(--fg)';
          setCorners('var(--muted)');
        }}
      >
        {children}
      </button>
    </div>
  );
};

function cornerStyle(pos: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    pointerEvents: 'none',
    transition: 'border-color 0.2s',
    borderColor: 'var(--muted)',
  };
  if (pos === 'tl') return { ...base, top: -3, left: -3, borderTop: '1px solid', borderLeft: '1px solid' };
  if (pos === 'tr') return { ...base, top: -3, right: -3, borderTop: '1px solid', borderRight: '1px solid' };
  if (pos === 'bl') return { ...base, bottom: -3, left: -3, borderBottom: '1px solid', borderLeft: '1px solid' };
  return { ...base, bottom: -3, right: -3, borderBottom: '1px solid', borderRight: '1px solid' };
}

export default CornerButton;
