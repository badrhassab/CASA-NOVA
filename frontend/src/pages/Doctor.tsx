import React from 'react';
import Header from '../components/Header';
import { AssistronautChat } from '../components/AssistronautChat';

interface DoctorProps {
  currentAstronaut?: any;
}

export const Doctor: React.FC<DoctorProps> = ({ currentAstronaut }) => {
  return (
    <div
      className="relative min-h-screen flex flex-col bg-[#050505] text-[#F2F2F0] overflow-x-hidden"
      style={{ fontFamily: "'Inter Tight', sans-serif" }}
    >
      {/* Background Starfield and Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,90,31,0.06),transparent_60%)]" />
      <div
        className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 font-mono text-[160px] font-black uppercase text-white/[0.015] select-none tracking-tighter"
        aria-hidden
      >
        ASSISTRONAUT
      </div>

      <Header />

      <main className="relative z-10 flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-8 py-5 flex flex-col">
        {/* Minimalist NASA Header Banner */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_8px_rgba(255,90,31,0.8)]" />
              <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-zinc-400">
                DEEP-SPACE HEALTH COPILOT · NASA HRP CDSS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white font-hud">
              Assistronaut
            </h1>
          </div>

          <div className="font-mono text-[10px] text-zinc-500 flex items-center gap-3 uppercase tracking-wider">
            <span>AUTONOMOUS CLINICAL DECISION SUPPORT</span>
            <span className="text-zinc-700">|</span>
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              ONLINE & SYNCED
            </span>
          </div>
        </div>

        <AssistronautChat currentAstronaut={currentAstronaut} />
      </main>
    </div>
  );
};

export default Doctor;
