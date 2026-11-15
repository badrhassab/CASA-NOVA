import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  BrainCircuit,
  ClipboardList,
  ScanFace,
  FileText,
  WifiOff,
  Radio,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity, description: 'Mission telemetry & domain alerts' },
    { name: 'Digital Twin', path: '/twin', icon: BrainCircuit, description: 'Biomechanical & physiological twin' },
    { name: 'Daily Check-In', path: '/checkin', icon: ClipboardList, description: 'Symptom, sleep & mood logging' },
    { name: 'Bio Scan', path: '/scan', icon: ScanFace, description: 'Optical biomarker & fatigue analysis' },
    { name: 'Mission Report', path: '/report', icon: FileText, description: 'Autonomous health assessment export' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070B14] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#0B1120] border-r border-[#1E293B] flex flex-col justify-between select-none z-20">
        <div>
          {/* Logo & Callout */}
          <div className="p-5 border-b border-[#1E293B]/80 flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <BrainCircuit className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <span className="font-bold tracking-wider text-base text-slate-100 flex items-center gap-1.5">
                  ASTRO<span className="text-cyan-400 font-mono">GUARD</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block -mt-0.5">
                  Autonomous Copilot
                </span>
              </div>
            </NavLink>
          </div>

          {/* Mission Context */}
          <div className="px-4 py-3 mx-3 my-3 bg-[#070B14]/80 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>TARGET: MARS</span>
              <span className="text-cyan-400 font-semibold">ARES IV</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400">Crew Station</span>
              <span className="text-xs font-medium text-slate-200">Cmdr. A. Mercer</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / System Badge */}
        <div className="p-4 border-t border-[#1E293B]/80 space-y-3">
          <div className="px-3 py-2 bg-slate-900/60 rounded-md border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>ENGINE:</span>
              <span className="text-emerald-400 font-semibold">LOCAL v1.0.4</span>
            </div>
            <div className="flex items-center justify-between">
              <span>DB STATE:</span>
              <span className="text-cyan-400">SYNCED (IndexedDB)</span>
            </div>
          </div>

          <NavLink
            to="/"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Mission Briefing (Landing)
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#070B14]">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-[#0B1120]/90 backdrop-blur border-b border-[#1E293B] px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            {/* Sol Counter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">Mission Progress:</span>
              <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-bold tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                SOL 180 <span className="text-slate-400 font-normal">/ 910</span>
              </span>
            </div>

            {/* Earth Comm Latency */}
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400 border-l border-slate-800 pl-4">
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Earth Comm Delay:</span>
              <span className="text-amber-400 font-semibold">18m 42s roundtrip</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* PWA / Offline Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-400">PWA Active</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-semibold">100% Offline Mode</span>
                </>
              )}
              <span className="text-slate-400 text-[11px] border-l border-slate-800 pl-2">Local Edge Core</span>
            </div>

            {/* Astronaut Avatar Pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-mono font-bold">
                AM
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-medium text-slate-200">Alex Mercer</div>
                <div className="text-[10px] font-mono text-slate-400">Self-Care Mode</div>
              </div>
            </div>
          </div>
        </header>

        {/* Global Medical Disclaimer Banner */}
        <div className="bg-amber-950/30 border-b border-amber-500/20 px-6 py-1.5 flex items-center justify-between text-xs text-amber-200/90 font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>
              <strong className="font-semibold text-amber-300">ASTRONAUT OPERATING DIRECTIVE:</strong> Decision support, not a medical diagnosis. Designed for autonomous astronaut evaluation on deep-space transit.
            </span>
          </div>
          <span className="text-[10px] text-amber-400/80 hidden sm:inline">Individualized Baseline Calibrated</span>
        </div>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto hud-grid p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
