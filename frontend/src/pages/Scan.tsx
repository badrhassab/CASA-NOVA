import React, { useState } from 'react';
import { ScanFace, Camera, Eye, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';

export const Scan: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const startScan = () => {
    setScanning(true);
    setScanned(false);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 2500);
  };

  return (
    <div
      className="relative min-h-screen flex flex-col bg-[#050505] text-[#F2F2F0]"
      style={{ fontFamily: "'Inter Tight', sans-serif" }}
    >
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Autonomous Bio-Optical Scan
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono">
              Computer Vision
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Non-invasive camera assessment: pupillometry, micro-saccades, and facial microvascular perfusion (rPPG).
          </p>
        </div>
        <div className="text-xs font-mono text-cyan-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          LOCAL MODEL
        </div>
      </div>

      <div className="bg-[#0B1120] p-8 rounded-xl border border-slate-800 flex flex-col items-center text-center">
        <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-cyan-500/40 bg-[#070B14] flex flex-col items-center justify-center relative overflow-hidden">
          {scanning ? (
            <>
              <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-bounce" />
              <Eye className="w-16 h-16 text-cyan-400 animate-pulse" />
              <span className="text-xs font-mono text-cyan-300 mt-4">Analyzing pupillary response...</span>
            </>
          ) : scanned ? (
            <>
              <ShieldCheck className="w-16 h-16 text-emerald-400" />
              <span className="text-xs font-mono text-emerald-300 mt-4">Scan Complete</span>
            </>
          ) : (
            <>
              <Camera className="w-16 h-16 text-slate-600 mb-2" />
              <span className="text-xs text-slate-400">Position face within frame</span>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={startScan}
            disabled={scanning}
            className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2"
          >
            <ScanFace className="w-4 h-4" />
            {scanning ? 'Performing Scan...' : 'Initiate 10-Second Bio Scan'}
          </button>
        </div>

        {scanned && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
            <div className="p-3 bg-[#070B14] rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">PUPIL CONSTRICTION VELOCITY</span>
              <div className="text-base font-mono font-bold text-slate-200 mt-0.5">4.2 mm/s (Nominal)</div>
            </div>
            <div className="p-3 bg-[#070B14] rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">FACIAL PERFUSION (rPPG)</span>
              <div className="text-base font-mono font-bold text-amber-300 mt-0.5">Slight Vasoconstriction</div>
            </div>
            <div className="p-3 bg-[#070B14] rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">EYE FATIGUE INDEX</span>
              <div className="text-base font-mono font-bold text-amber-300 mt-0.5">6.8 / 10 (Elevated)</div>
            </div>
          </div>
        )}
      </div>
    </main>
  </div>
  );
};
