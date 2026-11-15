import React, { useState, useMemo } from 'react';
import {
  Heart,
  Brain,
  ShieldCheck,
  Dumbbell,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { MOCK_DAILY_RECORDS } from '../data/mockData';
import { analyzeAstronautTelemetry } from '../engine/anomalyEngine';
import { Status, HealthDomain } from '../types';

export const Dashboard: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(180);

  // Compute all analyses
  const analyses = useMemo(() => analyzeAstronautTelemetry(MOCK_DAILY_RECORDS), []);

  const currentAnalysis = useMemo(() => {
    return analyses.find((a) => a.day === selectedDay) ?? analyses[analyses.length - 1];
  }, [analyses, selectedDay]);

  const currentRecord = useMemo(() => {
    return MOCK_DAILY_RECORDS.find((r) => r.day === selectedDay) ?? MOCK_DAILY_RECORDS[MOCK_DAILY_RECORDS.length - 1];
  }, [selectedDay]);

  const domainIcons: Record<HealthDomain, React.ElementType> = {
    heart: Heart,
    mind: Brain,
    immune: ShieldCheck,
    bone: Dumbbell,
  };

  const domainTitles: Record<HealthDomain, string> = {
    heart: 'Cardiovascular & Autonomic',
    mind: 'Cognitive & Behavioral',
    immune: 'Immune & Radiation',
    bone: 'Musculoskeletal Integrity',
  };

  const statusColors: Record<Status, { border: string; bg: string; text: string; badge: string; glow: string }> = {
    green: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-950/20',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]'
    },
    yellow: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/25',
      text: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      glow: 'shadow-[0_0_18px_rgba(245,158,11,0.2)]'
    },
    orange: {
      border: 'border-orange-500/40',
      bg: 'bg-orange-950/25',
      text: 'text-orange-400',
      badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
      glow: 'shadow-[0_0_20px_rgba(249,115,22,0.25)]'
    },
    red: {
      border: 'border-red-500/50',
      bg: 'bg-red-950/30',
      text: 'text-red-400',
      badge: 'bg-red-500/15 text-red-300 border-red-500/40',
      glow: 'shadow-[0_0_24px_rgba(239,68,68,0.3)]'
    }
  };

  return (
    <div className="space-y-6">
      {/* Sol Navigation & Mission State Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0B1120] p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Mission Sol Health Overview
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono">
              Autonomous Copilot
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Individualized baseline anomaly detection across 4 clinical domains.
          </p>
        </div>

        {/* Sol Time-Travel Slider */}
        <div className="flex items-center gap-4 bg-[#070B14] px-4 py-2 rounded-lg border border-slate-800">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
              <span>SOL SELECTOR</span>
              <span className="text-cyan-400 font-bold">SOL {selectedDay}</span>
            </div>
            <input
              type="range"
              min="1"
              max="180"
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-44 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>
          <button
            onClick={() => setSelectedDay(180)}
            className="text-xs font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            Latest
          </button>
        </div>
      </div>

      {/* Primary Alert / Status Banner */}
      <div
        className={`p-5 rounded-xl border transition-all ${statusColors[currentAnalysis.overall].border} ${statusColors[currentAnalysis.overall].bg} ${statusColors[currentAnalysis.overall].glow}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {currentAnalysis.overall === 'green' ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className={`w-7 h-7 ${statusColors[currentAnalysis.overall].text} flex-shrink-0 mt-0.5 animate-pulse`} />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-100">
                  {currentAnalysis.overall === 'green' && 'Nominal Homeostasis Maintained'}
                  {currentAnalysis.overall === 'yellow' && 'Sub-clinical Drift Detected (Advisory Alert)'}
                  {currentAnalysis.overall === 'orange' && 'Actionable Physiological Strain (Intervention Required)'}
                  {currentAnalysis.overall === 'red' && 'Critical Anomaly (Immediate Countermeasure Mandatory)'}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold uppercase ${statusColors[currentAnalysis.overall].badge}`}>
                  {currentAnalysis.overall}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                {currentAnalysis.overall === 'green'
                  ? 'All physiological indicators remain within your personalized 45-sol baseline envelope.'
                  : 'AstroGuard has isolated multi-day trend divergence compared to your initial transit baseline. Review targeted domain actions below.'}
              </p>
            </div>
          </div>

          <div className="font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 flex-shrink-0">
            <div>BASELINE: <span className="text-slate-200">SOLS 1–45</span></div>
            <div>STATUS AT: <span className="text-cyan-400">SOL {selectedDay}</span></div>
          </div>
        </div>
      </div>

      {/* 4 Health Domain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentAnalysis.domains.map((dom) => {
          const Icon = domainIcons[dom.domain];
          const styling = statusColors[dom.status];

          return (
            <div
              key={dom.domain}
              className={`p-5 rounded-xl bg-[#0B1120] border ${styling.border} transition-all relative overflow-hidden flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${styling.text}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">
                        {domainTitles[dom.domain]}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        Domain: {dom.domain}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-bold text-slate-200">
                      {dom.score}<span className="text-xs text-slate-500 font-normal">/100</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${styling.badge}`}>
                      {dom.status}
                    </span>
                  </div>
                </div>

                {/* Explainability: WHY */}
                <div className="mt-3 p-3 rounded-lg bg-[#070B14]/90 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-mono text-slate-400 text-[11px]">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="uppercase tracking-wider font-semibold text-cyan-300">WHY (Clinical Root Cause):</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans pl-5">
                    {dom.why}
                  </p>
                </div>

                {/* Explainability: WHAT TO DO */}
                <div className="mt-2.5 p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-mono text-cyan-300 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="uppercase tracking-wider font-semibold text-cyan-300">WHAT TO DO (Autonomous Countermeasure):</span>
                  </div>
                  <p className="text-cyan-100 leading-relaxed font-sans pl-5">
                    {dom.action}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Telemetry Charts: 180-Day Physiological Drift & Baseline */}
      <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              Mission-Long Biometric Drift & Individual Baseline
              <span className="text-xs text-slate-400 font-mono">(180 Sols Telemetry)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Note the autonomic diversion starting Sol 90, with first automated advisory alert triggered at Sol 96.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span> HRV (ms)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> Heart Rate (bpm)
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2.5 h-0.5 bg-purple-400 inline-block"></span> Reaction (ms/3)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MOCK_DAILY_RECORDS.slice(0, selectedDay)}>
              <XAxis
                dataKey="day"
                stroke="#64748B"
                fontSize={11}
                tickFormatter={(val) => `Sol ${val}`}
              />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#070B14', borderColor: '#1E293B', borderRadius: '8px' }}
                labelFormatter={(label) => `Sol ${label}`}
              />
              <ReferenceLine x={45} stroke="#334155" strokeDasharray="3 3" label={{ value: 'Baseline Lock', fill: '#64748B', fontSize: 10 }} />
              <ReferenceLine x={96} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'First Alert (Sol 96)', fill: '#F59E0B', fontSize: 10 }} />
              <Line type="monotone" dataKey="hrv" stroke="#06B6D4" dot={false} strokeWidth={2} name="HRV (ms)" />
              <Line type="monotone" dataKey="hr" stroke="#F59E0B" dot={false} strokeWidth={2} name="Heart Rate (bpm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Metric Snapshots */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#070B14] p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Resting HR</span>
            <div className="text-lg font-mono font-bold text-slate-200 mt-1">
              {currentRecord.hr} <span className="text-xs text-slate-400 font-normal">bpm</span>
            </div>
          </div>
          <div className="bg-[#070B14] p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Heart Rate Var (rMSSD)</span>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
              {currentRecord.hrv} <span className="text-xs text-slate-400 font-normal">ms</span>
            </div>
          </div>
          <div className="bg-[#070B14] p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Reaction Latency</span>
            <div className="text-lg font-mono font-bold text-slate-200 mt-1">
              {currentRecord.reactionMs} <span className="text-xs text-slate-400 font-normal">ms</span>
            </div>
          </div>
          <div className="bg-[#070B14] p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Radiation Absorption</span>
            <div className="text-lg font-mono font-bold text-slate-200 mt-1">
              {currentRecord.radiationMSv} <span className="text-xs text-slate-400 font-normal">mSv/sol</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
