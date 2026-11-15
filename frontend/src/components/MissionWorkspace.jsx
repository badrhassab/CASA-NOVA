import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Compass,
  LogOut,
  MapPin,
  Orbit,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { getAstronautMissions } from '../services/api';
import NutritionModule from './NutritionModule';

const formatDate = (value, includeTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'long' }
  ).format(date);
};

const missionStatus = (status) => {
  const labels = { active: 'Active', planned: 'Planned', completed: 'Completed' };
  return labels[String(status || '').toLowerCase()] || status || 'Not specified';
};

function MissionField({ label, value, mono = false }) {
  return (
    <div className="min-w-0 border-t border-white/[0.08] pt-3">
      <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className={`mt-1.5 break-words text-sm leading-5 text-slate-200 ${mono ? 'font-mono text-[11px]' : ''}`}>{value ?? '—'}</dd>
    </div>
  );
}

function MissionCard({ mission }) {
  const progress = Math.max(0, Math.min(100, Number(mission.progress_percent) || 0));
  const destination = mission.destination_details;
  const status = String(mission.status || '').toLowerCase();

  return (
    <article className="mission-card relative overflow-hidden border border-white/10 bg-[#090b0c]/90">
      <div className="h-px bg-gradient-to-r from-orange-400/90 via-orange-500/25 to-transparent" />
      <div className="p-5 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center border border-orange-400/25 bg-orange-400/[0.06] text-orange-300">
              <Rocket className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.22em] text-orange-300">{mission.mission_code}</p>
              <h2 className="mt-2 font-hud text-xl font-semibold leading-tight text-white sm:text-2xl">{mission.name}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                {destination?.name || 'Destination unavailable'}
              </p>
            </div>
          </div>
          <span className={`border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em] ${status === 'active'
            ? 'border-orange-400/30 bg-orange-400/[0.06] text-orange-300'
            : status === 'completed'
              ? 'border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-300'
              : 'border-white/15 bg-white/[0.03] text-slate-300'
          }`}>
            {missionStatus(mission.status)}
          </span>
        </div>

        <div className="mt-7 border-y border-white/[0.08] py-4">
          <div className="mb-2.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="text-slate-500">Mission progress</span>
            <span className="text-orange-300">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-1 overflow-hidden bg-white/[0.09]">
            <div className="h-full bg-gradient-to-r from-orange-600 to-orange-300 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(mission.start_date)} — {formatDate(mission.end_date)}</span>
            <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Mission day {mission.mission_day ?? '—'}</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-4 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Activity className="h-3.5 w-3.5 text-orange-400" /> Mission record
          </p>
          <dl className="grid grid-cols-1 gap-x-7 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <MissionField label="Mission ID" value={mission.id} mono />
            <MissionField label="Mission code" value={mission.mission_code} mono />
            <MissionField label="Mission name" value={mission.name} />
            <MissionField label="Destination" value={destination?.name || 'Destination unavailable'} />
            <MissionField label="Start date" value={formatDate(mission.start_date)} />
            <MissionField label="Planned end date" value={formatDate(mission.end_date)} />
            <MissionField label="Mission day" value={mission.mission_day} />
            <MissionField label="Current phase" value={mission.current_phase} />
            <MissionField label="Progress" value={`${progress.toFixed(1)}%`} />
            <MissionField label="Status" value={mission.status} mono />
            <MissionField label="Record created" value={formatDate(mission.created_at, true)} />
            <MissionField label="Crew role" value={mission.crew_assignment?.crew_role} />
            <MissionField label="EVA qualified" value={mission.crew_assignment?.eva_qualified ? 'Yes' : 'No'} />
            <MissionField label="Crew assignment date" value={formatDate(mission.crew_assignment?.assigned_at, true)} />
          </dl>
        </div>
      </div>
    </article>
  );
}

export default function MissionWorkspace({ astronaut, onLogout }) {
  const [page, setPage] = useState('home');
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAstronautMissions(astronaut.access_token);
      setMissions(response.data.missions || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Unable to load crew assignments. Check the connection to mission control.');
    } finally {
      setLoading(false);
    }
  }, [astronaut.access_token]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const activeMissions = missions.filter((mission) => String(mission.status).toLowerCase() === 'active').length;
  const featuredMission = missions.find((mission) => String(mission.status).toLowerCase() === 'active') || missions[0];
  const systemStatus = loading ? 'Syncing crew record' : error ? 'Link unavailable' : 'Crew record synced';

  return (
    <div className="mission-page relative min-h-screen overflow-hidden bg-[#070809] text-white antialiased">
      <div className="starfield pointer-events-none absolute inset-0" />
      <div className="workspace-glow pointer-events-none absolute inset-0" />
      <div className="workspace-watermark pointer-events-none absolute select-none" aria-hidden="true">MISSION</div>

      <header className="relative z-20 border-b border-white/[0.09] bg-[#070809]/80 px-4 backdrop-blur-xl sm:px-8 lg:px-12">
        <div className="mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-5">
          <button onClick={() => setPage('home')} className="flex shrink-0 items-center gap-3 text-left">
            <Orbit className="h-6 w-6 text-orange-400" strokeWidth={1.5} />
            <span>
              <span className="block font-hud text-sm font-bold tracking-wide text-white">ASTROGUARD</span>
              <span className="block font-mono text-[8px] tracking-[0.22em] text-slate-500">MISSION CONTROL</span>
            </span>
          </button>

          <nav className="hidden items-center gap-2 font-hud text-[10px] font-medium uppercase tracking-wide lg:flex">
            <button onClick={() => setPage('home')} className={`transition ${page === 'home' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Home</button>
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            <button onClick={() => setPage('missions')} className={`transition ${page === 'missions' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>My missions</button>
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            <button onClick={() => setPage('nutrition')} className={`transition ${page === 'nutrition' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Nutrition &amp; meal management</button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[0.13em] text-slate-500 lg:flex">
              <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-rose-400' : loading ? 'animate-pulse bg-amber-300' : 'bg-emerald-400'}`} />
              {systemStatus}
            </div>
            <span className="hidden max-w-40 truncate border-l border-white/10 pl-3 text-xs text-slate-300 sm:block">{astronaut.full_name}</span>
            <button onClick={onLogout} className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 transition hover:border-orange-400/40 hover:text-white" title="Sign out">
              <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        {page === 'nutrition' ? (
          <NutritionModule astronaut={astronaut} onBack={() => setPage('home')} />
        ) : page === 'home' ? (
          <section className="mx-auto grid min-h-[calc(100vh-170px)] w-full max-w-5xl items-center gap-10">
            <div className="relative py-4 lg:py-10">
              <p className="mb-5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">
                <span className="h-1.5 w-1.5 bg-orange-500" /> Deep-space crew console
              </p>
              <h1 className="font-hud text-[clamp(3rem,7.6vw,7.25rem)] font-semibold uppercase leading-[0.86] tracking-[-0.075em] text-white">
                Welcome,<br /><span className="text-white/85">{astronaut.full_name}</span>
              </h1>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">Crew mission overview</p>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                Review your crew assignments, destination, and current flight phase from your personal mission console.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-5">
                <button onClick={() => setPage('missions')} className="group inline-flex items-center gap-4 bg-orange-500 px-5 py-3.5 font-hud text-xs font-bold uppercase tracking-[0.15em] text-[#120c07] transition hover:bg-orange-400">
                  My missions <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={() => setPage('nutrition')} className="group inline-flex items-center gap-3 border border-orange-400/45 px-4 py-3.5 font-hud text-[10px] font-semibold uppercase tracking-[0.1em] text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/10">
                  Nutrition &amp; meal management <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </button>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                  {loading ? 'Checking assignments…' : error ? 'Assignment status unavailable' : `${missions.length} assigned · ${activeMissions} active`}
                </span>
              </div>

              <div className="mt-12 hidden max-w-2xl items-center gap-5 border-t border-white/15 pt-4 sm:flex">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Crew operations</span>
                <span className="h-px flex-1 bg-gradient-to-r from-orange-500/70 to-transparent" />
                <span className="font-mono text-[9px] text-slate-500">{astronaut.callsign || 'FLIGHT CREW'}</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-3xl">
              <div className="mission-hero-visual relative overflow-hidden border border-white/10 bg-[#090b0c]/80">
                <div className="relative p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-300">01 / Assigned operations</span>
                    <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.13em] text-slate-400">
                      <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-rose-400' : loading ? 'bg-amber-300' : 'bg-orange-400'}`} />
                      {loading ? 'Syncing' : error ? 'Offline' : 'Roster ready'}
                    </span>
                  </div>

                  <div className="relative z-10">
                    <div className="mb-4 flex items-end justify-between border-b border-white/20 pb-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-orange-300">Crew record</p>
                        <p className="mt-2 font-hud text-4xl font-semibold leading-none text-white">{loading ? '—' : String(missions.length).padStart(2, '0')}</p>
                      </div>
                      <Target className="mb-1 h-5 w-5 text-orange-400" strokeWidth={1.4} />
                    </div>

                    {error ? (
                      <div>
                        <p className="text-sm font-medium text-white">Mission link unavailable</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{error}</p>
                        <button onClick={loadMissions} className="mt-4 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-orange-300 hover:text-white"><RefreshCw className="h-3.5 w-3.5" /> Retry sync</button>
                      </div>
                    ) : loading ? (
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">Checking crew assignments…</p>
                    ) : featuredMission ? (
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-mono text-[10px] tracking-[0.18em] text-orange-300">{featuredMission.mission_code}</span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">{missionStatus(featuredMission.status)}</span>
                        </div>
                        <p className="mt-2 font-hud text-lg font-semibold text-white">{featuredMission.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5 text-orange-400" />{featuredMission.destination_details?.name || 'Destination unavailable'}</p>
                        <div className="mt-4 flex items-center gap-3">
                          <div className="h-px flex-1 bg-white/15"><div className="h-px bg-orange-400" style={{ width: `${Math.max(0, Math.min(100, Number(featuredMission.progress_percent) || 0))}%` }} /></div>
                          <span className="font-mono text-[9px] text-orange-300">{Number(featuredMission.progress_percent || 0).toFixed(1)}%</span>
                        </div>
                        <button onClick={() => setPage('missions')} className="mt-5 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-white transition hover:text-orange-300">Open mission file <ArrowRight className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <div>
                        <p className="font-hud text-lg font-semibold text-white">No current assignment</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">New missions will appear here when they are assigned to your crew profile.</p>
                        <button onClick={() => setPage('missions')} className="mt-5 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-white transition hover:text-orange-300">View mission file <ArrowRight className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-between font-mono text-[8px] uppercase tracking-[0.17em] text-slate-600">
                <span>AstroGuard / Crew {astronaut.callsign || '01'}</span><span>Mission control</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="min-h-[calc(100vh-180px)] pt-2 sm:pt-5">
            <button onClick={() => setPage('home')} className="mb-8 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-400 transition hover:text-orange-300">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </button>

            <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-6">
              <div>
                <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-orange-300"><span className="h-1.5 w-1.5 bg-orange-500" /> Flight record / Crew {astronaut.callsign || '01'}</p>
                <h1 className="mt-3 font-hud text-4xl font-semibold uppercase leading-none tracking-[-0.05em] text-white sm:text-6xl">My missions</h1>
                <p className="mt-3 text-sm text-slate-400">Assignments recorded for {astronaut.full_name}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-slate-500">Active missions</p>
                  <p className="mt-1 font-hud text-2xl text-white">{loading ? '—' : String(activeMissions).padStart(2, '0')}</p>
                </div>
                <button onClick={loadMissions} disabled={loading} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-300 transition hover:border-orange-400/40 hover:text-white disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync
                </button>
              </div>
            </div>

            {loading ? (
              <div className="border border-white/10 bg-[#090b0c]/85 p-8 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">Loading crew assignments…</div>
            ) : error ? (
              <div className="border border-rose-500/25 bg-rose-950/20 p-6">
                <p className="text-sm text-rose-200">{error}</p>
                <button onClick={loadMissions} className="mt-4 inline-flex items-center gap-2 bg-orange-500 px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-black hover:bg-orange-400"><RefreshCw className="h-3.5 w-3.5" /> Retry sync</button>
              </div>
            ) : missions.length === 0 ? (
              <div className="border border-white/10 bg-[#090b0c]/85 px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center border border-white/10 bg-white/[0.03] text-orange-300"><Compass className="h-5 w-5" /></div>
                <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-orange-300">Crew record / Empty</p>
                <h2 className="mt-2 font-hud text-2xl font-semibold uppercase text-white">No missions assigned</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">There are no mission assignments linked to your crew profile. New operations will appear here when they are assigned.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {missions.map((mission) => <MissionCard key={mission.id} mission={mission} />)}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1500px] items-center justify-between border-t border-white/[0.07] px-5 py-4 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600 sm:px-8 lg:px-12">
        <span>AstroGuard / Mission Control</span><span className="hidden sm:inline">Crew operations registry</span>
      </footer>
    </div>
  );
}
