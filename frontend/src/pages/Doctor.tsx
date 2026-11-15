import React from 'react';
import Header from '../components/Header';
import { AssistronautChat } from '../components/AssistronautChat';

export const Doctor: React.FC = () => {
  return (
    <div
      className="relative min-h-screen flex flex-col bg-[#050505] text-[#F2F2F0]"
      style={{ fontFamily: "'Inter Tight', sans-serif" }}
    >
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 flex flex-col gap-1">
          <span
            className="text-[11px] uppercase tracking-[0.14em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--orange, #FF5A1F)' }}
          >
            ■ NASA HRP CLINICAL DECISION SUPPORT SYSTEM
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">
            Assistronaut AI Doctor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Autonomous medical copilot equipped with NASA Clinical Practice Guidelines and real-time biometric telemetry.
          </p>
        </div>
        <AssistronautChat />
      </main>
    </div>
  );
};

export default Doctor;
