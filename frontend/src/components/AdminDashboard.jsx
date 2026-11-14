import React, { useState } from 'react';
import { Users, Rocket, Sun, UserPlus, Plus } from 'lucide-react';
import { createAstronaut, createMission, createDestination } from '../services/api';

export default function AdminDashboard() {
  const [astronauts, setAstronauts] = useState([
    { id: '1', full_name: 'Dr. Jessica Watkins', callsign: 'Valkyrie', role: 'Commandant & Géologue', blood_type: 'O+', radiation_accumulated_msv: '42.8', baseline_bone_density_tscore: '1.15' },
    { id: '2', full_name: 'Dr. Jonny Kim', callsign: 'Doc-Eagle', role: 'Médecin de Bord & Lead EVA', blood_type: 'A+', radiation_accumulated_msv: '38.4', baseline_bone_density_tscore: '1.30' },
    { id: '3', full_name: 'Kjell Lindgren', callsign: 'Astro-Kjell', role: 'Ingénieur Support de Vie (ECLSS)', blood_type: 'B+', radiation_accumulated_msv: '61.2', baseline_bone_density_tscore: '0.95' },
  ]);

  const [missions, setMissions] = useState([
    { id: 'm1', mission_code: 'ARTEMIS-III', name: 'Artemis Polar Expedition III', current_phase: 'Sorties Extra-Véhiculaires (EVA)', progress_percent: '72.5' },
    { id: 'm2', mission_code: 'ARES-V', name: 'Transit Interplanétaire vers Mars', current_phase: 'Croisière Héliocentrique', progress_percent: '24.0' }
  ]);

  const [destinations, setDestinations] = useState([
    { id: 'd1', name: 'Lune - Cratère Shackleton', body_type: 'Moon', surface_gravity_g: '0.166', radiation_environment_msv_yr: '150.0' },
    { id: 'd2', name: 'Mars - Habitat Jezero', body_type: 'Planet', surface_gravity_g: '0.380', radiation_environment_msv_yr: '250.0' }
  ]);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="hud-panel p-4">
          <div className="text-slate-400">ASTRONAUTES ACTIFS</div>
          <div className="text-2xl font-bold font-hud text-cyan-400 mt-1">{astronauts.length}</div>
          <div className="text-[10px] text-slate-500">Dossiers médicaux HRP synchronisés</div>
        </div>
        <div className="hud-panel p-4">
          <div className="text-slate-400">MISSIONS EN COURS</div>
          <div className="text-2xl font-bold font-hud text-emerald-400 mt-1">{missions.length}</div>
          <div className="text-[10px] text-slate-500">Artemis III & Ares V</div>
        </div>
        <div className="hud-panel p-4">
          <div className="text-slate-400">DESTINATIONS SPATIALES</div>
          <div className="text-2xl font-bold font-hud text-purple-400 mt-1">{destinations.length}</div>
          <div className="text-[10px] text-slate-500">Base astrophysique</div>
        </div>
      </div>

      {/* Astronauts Table */}
      <div className="hud-panel p-5">
        <div className="hud-corner-tl" /><div className="hud-corner-br" />
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs uppercase text-cyan-400 flex items-center gap-1.5"><Users className="w-4 h-4" /> Corps des Astronautes</span>
            <h3 className="text-base font-bold font-hud text-white">Profils & Dosimétrie Carrière NASA</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                <th className="py-2.5 px-3">Nom & Prénom</th>
                <th className="py-2.5 px-3">Callsign</th>
                <th className="py-2.5 px-3">Rôle</th>
                <th className="py-2.5 px-3">Groupe</th>
                <th className="py-2.5 px-3">Radiation Cumulée</th>
                <th className="py-2.5 px-3">Score Ostéo (T-Score)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {astronauts.map(a => (
                <tr key={a.id} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-bold text-slate-200">{a.full_name}</td>
                  <td className="py-2.5 px-3 text-cyan-300">{a.callsign}</td>
                  <td className="py-2.5 px-3 text-slate-400">{a.role}</td>
                  <td className="py-2.5 px-3 text-emerald-400">{a.blood_type}</td>
                  <td className="py-2.5 px-3 text-rose-400 font-bold">{a.radiation_accumulated_msv} mSv</td>
                  <td className="py-2.5 px-3 text-purple-400">{a.baseline_bone_density_tscore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missions & Destinations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="hud-panel p-5">
          <div className="hud-corner-tl" /><div className="hud-corner-br" />
          <h3 className="text-sm font-bold font-hud text-white mb-3 flex items-center gap-2"><Rocket className="w-4 h-4 text-cyan-400" /> Expéditions Spatiales</h3>
          <div className="space-y-2.5">
            {missions.map(m => (
              <div key={m.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-cyan-300">{m.mission_code}</span>
                  <span className="text-[10px] text-emerald-400">{m.progress_percent}%</span>
                </div>
                <div className="text-slate-300 mt-1">{m.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Phase: {m.current_phase}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel p-5">
          <div className="hud-corner-tl" /><div className="hud-corner-br" />
          <h3 className="text-sm font-bold font-hud text-white mb-3 flex items-center gap-2"><Sun className="w-4 h-4 text-amber-400" /> Base Planètes & Étoiles</h3>
          <div className="space-y-2.5">
            {destinations.map(d => (
              <div key={d.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-300">{d.name}</span>
                  <span className="text-[10px] text-purple-400">{d.body_type}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Gravité: <span className="text-white font-bold">{d.surface_gravity_g} G</span> • Radiation: <span className="text-rose-400 font-bold">{d.radiation_environment_msv_yr} mSv/an</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
