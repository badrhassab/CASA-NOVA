import React from 'react';
import { Gauge, Wind, Activity, AlertTriangle, Battery, ShieldAlert } from 'lucide-react';

export default function EclssHUD({ telemetry }) {
  const data = telemetry || {
    cabin_oxygen_pct: '21.05',
    cabin_oxygen_pp_mmhg: '159.2',
    cabin_pressure_kpa: '101.32',
    co2_scrub_pp_mmhg: '2.35',
    suit_oxygen_reserve_pct: '96.4',
    suit_battery_pct: '94.0',
    status_level: 'NOMINAL'
  };

  return (
    <div className="hud-panel p-5">
      <div className="hud-corner-tl" /><div className="hud-corner-br" />
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Gauge className="w-4 h-4" /> Support de Vie & Oxygène (ECLSS)
        </span>
        <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
          {data.status_level}
        </span>
      </div>

      <div className="space-y-3.5 font-mono text-xs">
        {/* O2 */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-300 flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 text-cyan-400" /> O₂ Cabine (Partielle)</span>
            <span className="font-bold text-cyan-400">{data.cabin_oxygen_pct} % ({data.cabin_oxygen_pp_mmhg} mmHg)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5">
            <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: '95%' }}></div>
          </div>
        </div>

        {/* Pression Cabine */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-300 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Pression Atmosphérique</span>
            <span className="font-bold text-emerald-400">{data.cabin_pressure_kpa} kPa (14.7 psi)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5">
            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Epuration CO2 */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Épuration CO₂ (CDRA)</span>
            <span className="font-bold text-amber-400">{data.co2_scrub_pp_mmhg} mmHg (Seuil &lt; 3.0)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5">
            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '48%' }}></div>
          </div>
        </div>

        {/* EVA Reserve */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-[11px]">
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">RÉSERVE O₂ SCAPHANDRE</div>
            <div className="text-cyan-300 font-bold mt-0.5">{data.suit_oxygen_reserve_pct} %</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">BATTERIE SCAPHANDRE</div>
            <div className="text-emerald-300 font-bold mt-0.5">{data.suit_battery_pct} %</div>
          </div>
        </div>
      </div>
    </div>
  );
}
