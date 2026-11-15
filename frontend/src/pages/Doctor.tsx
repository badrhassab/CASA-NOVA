import React from 'react';
import Header from '../components/Header';
import { AssistronautChat } from '../components/AssistronautChat';

interface DoctorProps {
  currentAstronaut?: any;
}

export const Doctor: React.FC<DoctorProps> = ({ currentAstronaut }) => {
  return (
    <div
      className="relative min-h-screen flex flex-col bg-[#050505] text-[#F2F2F0]"
      style={{ fontFamily: "'Inter Tight', sans-serif" }}
    >
      <Header />
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-8 py-6 flex flex-col">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span
              className="text-[10px] uppercase tracking-[0.2em] font-mono text-orange-400 block mb-1"
            >
              ■ NASA HRP CLINICAL DECISION SUPPORT SYSTEM (CDSS)
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-white font-hud">
              Assistronaut Copilot
            </h1>
          </div>
          <div className="font-mono text-[10px] text-slate-500 text-right">
            <span>FLIGHT SURGEON COPILOT</span>
            <span className="mx-2">·</span>
            <span className="text-emerald-400">STATUS: NOMINAL</span>
          </div>
        </div>

        <AssistronautChat currentAstronaut={currentAstronaut} />
      </main>
    </div>
  );
};

export default Doctor;
