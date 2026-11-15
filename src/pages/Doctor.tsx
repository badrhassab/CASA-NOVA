import React from 'react';
import { Header } from '../components/Header';

export const Doctor: React.FC = () => (
  <div
    className="relative min-h-screen flex flex-col"
    style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: "'Inter Tight', sans-serif" }}
  >
    <Header />
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
      <span
        className="text-[11px] uppercase tracking-[0.12em] mb-2"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--orange)' }}
      >
        ■ AI DOCTOR
      </span>
      <h1
        className="font-medium uppercase tracking-[-0.03em] leading-[0.95] text-center"
        style={{ fontSize: 'clamp(2.5rem,6vw,6rem)', color: 'var(--fg)' }}
      >
        Your AI<br />Doctor
      </h1>
      <p className="text-sm max-w-sm text-center mt-2" style={{ color: 'var(--muted)' }}>
        This page is coming soon.
      </p>
    </main>
  </div>
);

export default Doctor;
