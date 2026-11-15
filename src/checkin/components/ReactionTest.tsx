import React, { useCallback, useEffect, useRef, useState } from 'react';

const TRIALS = 3;

interface ReactionTestProps {
  value: number | null;
  onComplete: (avgMs: number) => void;
  onSkip: () => void;
}

type Phase = 'idle' | 'wait' | 'ready' | 'done';

export const ReactionTest: React.FC<ReactionTestProps> = ({ value, onComplete, onSkip }) => {
  const [phase, setPhase] = useState<Phase>(value != null ? 'done' : 'idle');
  const [trial, setTrial] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [avg, setAvg] = useState<number | null>(value);
  const [falseStart, setFalseStart] = useState(false);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const scheduleReady = useCallback(() => {
    clearTimer();
    setPhase('wait');
    setFalseStart(false);
    const delay = 800 + Math.random() * 1800;
    timerRef.current = window.setTimeout(() => {
      startRef.current = performance.now();
      setPhase('ready');
    }, delay);
  }, []);

  const begin = () => {
    setResults([]);
    setAvg(null);
    setTrial(0);
    scheduleReady();
  };

  const handleTap = () => {
    if (phase === 'wait') {
      clearTimer();
      setFalseStart(true);
      setPhase('idle');
      return;
    }
    if (phase !== 'ready') return;

    const ms = Math.round(performance.now() - startRef.current);
    const next = [...results, ms];
    setResults(next);
    const nextTrial = trial + 1;
    setTrial(nextTrial);

    if (nextTrial >= TRIALS) {
      const mean = Math.round(next.reduce((s, n) => s + n, 0) / next.length);
      setAvg(mean);
      setPhase('done');
      onComplete(mean);
    } else {
      scheduleReady();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {phase === 'idle' && (
        <button
          type="button"
          onClick={begin}
          style={{
            alignSelf: 'flex-start',
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '14px 20px',
            border: '1px solid var(--muted)',
            background: 'transparent',
            color: 'var(--fg)',
            cursor: 'pointer',
            borderRadius: 0,
          }}
        >
          Start reaction test
        </button>
      )}

      {(phase === 'wait' || phase === 'ready') && (
        <button
          type="button"
          onClick={handleTap}
          aria-label={phase === 'ready' ? 'Tap now' : 'Wait for orange'}
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            border: `2px solid ${phase === 'ready' ? 'var(--orange)' : 'var(--muted)'}`,
            background: phase === 'ready' ? 'var(--orange)' : 'transparent',
            cursor: 'pointer',
            transition: 'background 0.05s, border-color 0.05s',
            alignSelf: 'flex-start',
          }}
        />
      )}

      {phase === 'wait' && (
        <span style={monoStyle}>Wait for orange · trial {trial + 1}/{TRIALS}</span>
      )}
      {phase === 'ready' && (
        <span style={{ ...monoStyle, color: 'var(--orange)' }}>TAP NOW</span>
      )}
      {falseStart && (
        <span style={{ ...monoStyle, color: 'var(--status-orange)' }}>Too early — try again</span>
      )}

      {phase === 'done' && avg != null && (
        <div className="flex flex-col gap-1">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 64,
              lineHeight: 1,
              color: 'var(--fg)',
              letterSpacing: '-0.04em',
            }}
          >
            {avg}
          </span>
          <span style={monoStyle}>AVG MS · {TRIALS} trials</span>
          <button
            type="button"
            onClick={begin}
            style={{
              ...monoStyle,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              alignSelf: 'flex-start',
              marginTop: 8,
              color: 'var(--muted)',
            }}
          >
            Retake
          </button>
        </div>
      )}

      {phase !== 'done' && (
        <button
          type="button"
          onClick={() => {
            clearTimer();
            setPhase(value != null ? 'done' : 'idle');
            onSkip();
          }}
          style={{
            ...monoStyle,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            alignSelf: 'flex-start',
            color: 'var(--muted)',
          }}
        >
          Skip test
        </button>
      )}
    </div>
  );
};

const monoStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
};

export default ReactionTest;
