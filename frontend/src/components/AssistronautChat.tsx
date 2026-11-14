import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, SAMPLE_ASTRONAUT_CONTEXT } from '../services/assistronaut';
import { AstronautContext, ChatMessage, SourceReference } from '../types/assistronaut';

const INTENT_BADGES: Record<string, { label: string; color: string }> = {
  bone_question:      { label: '🦴 BONE PROTOCOL',      color: 'bg-amber-950/60 text-amber-400 border-amber-800/80' },
  immune_question:    { label: '🧬 IMMUNE SURVEILLANCE', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80' },
  astronomy_question: { label: '🪐 MISSION ASTROPHYSICS', color: 'bg-purple-950/60 text-purple-300 border-purple-800/80' },
  symptom_report:     { label: '🩺 SYMPTOM TRIAGE',     color: 'bg-orange-950/70 text-orange-400 border-orange-700/80' },
  mission_question:   { label: '🚀 TRAJECTORY & TRANSIT', color: 'bg-blue-950/60 text-blue-300 border-blue-800/80' },
  countermeasure:     { label: '🛡️ COUNTERMEASURE',     color: 'bg-teal-950/60 text-teal-300 border-teal-800/80' },
  general_health:     { label: '💡 CLINICAL INFO',       color: 'bg-zinc-900 text-zinc-300 border-zinc-700' },
  emergency:          { label: '🚨 EMERGENCY ALERT',     color: 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse' },
};

interface AssistronautChatProps {
  astronaut?: AstronautContext;
  astronautId?: string;
  onNavigateHome?: () => void;
}

export const AssistronautChat: React.FC<AssistronautChatProps> = ({ astronaut, astronautId, onNavigateHome }) => {
  const currentAstronaut = astronaut || SAMPLE_ASTRONAUT_CONTEXT;
  const m = currentAstronaut.mission;
  const h = currentAstronaut.health_data || {};
  const eclss = currentAstronaut.eclss || {};
  const progress = Math.min(100, Math.round(((m.mission_day || 126) / (m.planned_duration_days || 900)) * 100));

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Greetings, ${currentAstronaut.name}. AstroGuard Deep-Space Clinical Copilot is online.\n\nI am monitoring your transit telemetry on mission ${m.name} (${m.destination} transit • Day ${m.mission_day || 126} of ${m.planned_duration_days || 900}). Your vitals, cabin life-support telemetry, and flight biometrics are synced. How can I assist you with your health, countermeasures, or mission science today?`,
      intent: 'general_health',
      suggested_followup: [
        'What is my current heart rate and cabin temperature?',
        'I am feeling a little dizziness. Is this normal on our transit?',
        'Is our current mission dangerous for my bone density?',
        'Explain the orbital mechanics of our Hohmann transfer',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMessage];

    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage(
        text,
        messages,
        conversationId,
        astronaut ? currentAstronaut : null,
        astronautId || currentAstronaut.id
      );

      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          intent: data.intent,
          sources: data.sources,
          suggested_followup: data.suggested_followup,
          escalation_flag: data.escalation_flag,
          escalation_reason: data.escalation_reason,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Autonomous link error: Unable to reach Assistronaut CDS backend. Verify your Django backend is running on port 8000 and connected to Supabase.',
          intent: 'general_health',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#060709] text-zinc-100 font-sans overflow-hidden select-none">
      {/* ──────────────── Top Navigation Bar (AstroGuard Theme) ──────────────── */}
      <header className="h-14 border-b border-zinc-800/80 bg-[#08090d]/95 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-widest text-white uppercase font-sans">
              ASTROGUARD
            </span>
            <span className="text-[10px] font-mono text-orange-500/90 tracking-wider">
              [ v1.0 ]
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800 mx-2 hidden sm:block" />

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold tracking-wider uppercase text-zinc-400">
            <button 
              onClick={onNavigateHome}
              className="hover:text-white transition-colors"
            >
              HOME
            </button>
            <span className="text-orange-500 text-[10px]">•</span>
            <span className="hover:text-white cursor-pointer transition-colors">
              DAILY CHECK-IN
            </span>
            <span className="text-orange-500 text-[10px]">•</span>
            <span className="hover:text-white cursor-pointer transition-colors">
              BODY TWIN
            </span>
            <span className="text-orange-500 text-[10px]">•</span>
            <span className="text-orange-400 border-b border-orange-500 pb-0.5">
              AI DOCTOR
            </span>
          </nav>
        </div>

        {/* Right Status Indicators */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="uppercase text-emerald-400/90 font-medium tracking-wider">OFFLINE READY</span>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span className="hover:text-white cursor-pointer">report ↗</span>
            <span className="hover:text-white cursor-pointer">planets ↗</span>
          </div>
        </div>
      </header>

      {/* ──────────────── Real-Time Telemetry HUD Strip ──────────────── */}
      <div className="bg-[#090b0f] border-b border-zinc-800/60 px-6 py-1.5 flex items-center justify-between text-[11px] font-mono text-zinc-400 overflow-x-auto shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-orange-500">■</span>
            <span className="text-zinc-500">VITALS:</span>
            <span className="text-white font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-rose-500 inline animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              {h.vital_signs ? h.vital_signs.split(',')[0] : 'HR 62 BPM'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">CABIN TEMP:</span>
            <span className="text-white font-semibold">
              {eclss.cabin_temp_c ? `${eclss.cabin_temp_c}°C` : '21.5°C'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">CABIN O₂:</span>
            <span className="text-white font-semibold">
              {eclss.cabin_oxygen_pct ? `${eclss.cabin_oxygen_pct}%` : '20.9%'}
            </span>
          </div>
          <div className="flex items-center gap-2 hidden sm:flex">
            <span className="text-zinc-500">PRESS:</span>
            <span className="text-white font-semibold">
              {eclss.cabin_pressure_kpa ? `${eclss.cabin_pressure_kpa} kPa` : '101.3 kPa'}
            </span>
          </div>
          <div className="flex items-center gap-2 hidden md:flex">
            <span className="text-zinc-500">CO₂:</span>
            <span className="text-white font-semibold">
              {eclss.co2_scrub_pp_mmhg ? `${eclss.co2_scrub_pp_mmhg} mmHg` : '2.2 mmHg'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-zinc-500">
          <span>DEST: <strong className="text-orange-400">{m.destination || 'MARS'}</strong> ({m.surface_gravity_g || 0.38}g)</span>
          <span>COMM DELAY: <strong className="text-zinc-300">{m.earth_comm_delay_seconds || 240}s</strong></span>
        </div>
      </div>

      {/* ──────────────── Main Workspace Body ──────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Telemetry Sidebar (AstroGuard HUD Style) */}
        <aside className="w-80 shrink-0 bg-[#07080c] border-r border-zinc-800/80 p-5 flex flex-col gap-5 overflow-y-auto hidden lg:flex">
          {/* Astronaut Identity Card */}
          <div className="relative bg-[#0b0d13] border border-zinc-800 rounded p-4">
            <div className="absolute top-2 right-2 text-[10px] font-mono text-orange-500/80">
              001 / 004
            </div>
            <div className="text-[10px] font-mono text-orange-500 tracking-wider uppercase mb-1">
              ■ CREW MEMBER
            </div>
            <div className="text-white font-bold text-base tracking-wide">
              {currentAstronaut.name}
            </div>
            <div className="text-zinc-400 text-xs font-mono mt-0.5">
              {currentAstronaut.callsign || 'ARES-LEAD'} • {currentAstronaut.role || 'Mission Commander'}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800/70 flex justify-between text-xs font-mono text-zinc-400">
              <span>BLOOD: <strong className="text-white">{currentAstronaut.blood_type || 'O-POS'}</strong></span>
              <span>RAD: <strong className="text-orange-400">{h.radiation_accumulated_msv || '42.5 mSv'}</strong></span>
            </div>
          </div>

          {/* Active Mission Transit HUD */}
          <div className="bg-[#0b0d13] border border-zinc-800 rounded p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-mono text-orange-500 tracking-wider uppercase">
                ■ MISSION TRACKER
              </span>
              <span className="font-mono text-xs text-orange-400 font-semibold">{progress}%</span>
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{m.name}</div>
              <div className="text-zinc-400 text-xs mt-0.5">
                {m.phase || 'Interplanetary transit'}
              </div>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-600 to-amber-500 h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-zinc-400">
              <span>Day {m.mission_day || 126}</span>
              <span>T-900 Days</span>
            </div>
          </div>

          {/* Biometrics & Organ Systems */}
          <div className="bg-[#0b0d13] border border-zinc-800 rounded p-4 flex flex-col gap-2.5">
            <div className="text-[10px] font-mono text-orange-500 tracking-wider uppercase">
              ■ BIOMETRICS TELEMETRY
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#0e1017] p-2 rounded border border-zinc-800/60">
                <div className="text-[10px] text-zinc-500">HEART RATE</div>
                <div className="text-white font-bold mt-0.5">62 BPM</div>
              </div>
              <div className="bg-[#0e1017] p-2 rounded border border-zinc-800/60">
                <div className="text-[10px] text-zinc-500">BLOOD PRESS</div>
                <div className="text-white font-bold mt-0.5">118/76</div>
              </div>
              <div className="bg-[#0e1017] p-2 rounded border border-zinc-800/60">
                <div className="text-[10px] text-zinc-500">ICP (EST.)</div>
                <div className="text-white font-bold mt-0.5">
                  {h.intracranial_pressure_est_mmhg || '14.2 mmHg'}
                </div>
              </div>
              <div className="bg-[#0e1017] p-2 rounded border border-zinc-800/60">
                <div className="text-[10px] text-zinc-500">SANS GRADE</div>
                <div className="text-emerald-400 font-bold mt-0.5">
                  {h.optic_disc_edema_grade !== undefined && h.optic_disc_edema_grade !== null
                    ? `GRADE ${h.optic_disc_edema_grade}`
                    : 'GRADE 0'}
                </div>
              </div>
            </div>
          </div>

          {/* Life Support ECLSS Status */}
          <div className="bg-[#0b0d13] border border-zinc-800 rounded p-4 flex flex-col gap-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-orange-500 tracking-wider uppercase">
                ■ ECLSS LIFE SUPPORT
              </span>
              <span className="text-emerald-400 text-[10px] font-bold">NORMAL</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/50">
              <span className="text-zinc-400">Cabin Oxygen</span>
              <span className="text-white">{eclss.cabin_oxygen_pct || '20.9'}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/50">
              <span className="text-zinc-400">Cabin Pressure</span>
              <span className="text-white">{eclss.cabin_pressure_kpa || '101.3'} kPa</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/50">
              <span className="text-zinc-400">Cabin Temp</span>
              <span className="text-white">{eclss.cabin_temp_c || '21.5'}°C</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">CO₂ Scrubber</span>
              <span className="text-white">{eclss.co2_scrub_pp_mmhg || '2.20'} mmHg</span>
            </div>
          </div>
        </aside>

        {/* Center Chat Viewport */}
        <main className="flex-1 flex flex-col bg-[#050608] relative overflow-hidden">
          {/* Subtle Background Watermark (AstroGuard Vitals Line) */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center select-none overflow-hidden">
            <span className="text-[18vw] font-black tracking-tighter text-white">VITALS</span>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6 space-y-6 z-10">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const badge = msg.intent ? INTENT_BADGES[msg.intent] : null;

              if (isUser) {
                return (
                  <div key={index} className="flex justify-end">
                    <div className="max-w-2xl bg-zinc-900 border border-zinc-800/90 rounded-xl px-5 py-3.5 text-zinc-100 text-sm leading-relaxed shadow-lg relative">
                      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-orange-500 rounded-tr" />
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className="flex gap-4 max-w-3xl">
                  {/* Bot Avatar Icon */}
                  <div className="w-9 h-9 rounded bg-[#0d0f15] border border-orange-500/40 flex items-center justify-center shrink-0 text-orange-400 font-mono text-xs font-bold shadow-lg">
                    AG
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                        ASTROGUARD AI
                      </span>
                      {badge && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    {msg.escalation_flag && (
                      <div className="bg-rose-950/80 border-2 border-rose-500 rounded p-4 text-rose-200 text-sm font-semibold shadow-xl animate-pulse">
                        🚨 EMERGENCY ESCALATION PROTOCOL ACTIVATED — Contact Flight Surgeon Immediately
                      </div>
                    )}

                    {/* Chat Response Text */}
                    <div className="bg-[#090b10] border border-zinc-800/90 rounded-lg px-5 py-4 text-zinc-200 text-sm leading-relaxed shadow-xl whitespace-pre-wrap selection:bg-orange-500/30">
                      {msg.content}
                    </div>

                    {/* Scientific Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="bg-[#08090d] border border-zinc-800/80 rounded p-3 flex flex-col gap-1.5 font-mono">
                        <div className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <span>📚</span> VERIFIED SCIENTIFIC REFERENCES
                        </div>
                        <div className="flex flex-col gap-1">
                          {msg.sources.map((s: SourceReference, sIdx: number) => (
                            <a
                              key={sIdx}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-zinc-400 hover:text-orange-400 hover:underline flex items-center gap-1.5 truncate transition-colors"
                            >
                              <span className="text-zinc-600">[{s.source}]</span>
                              <span className="truncate">{s.title}</span>
                              <span className="text-orange-500/80 text-[10px]">↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Queries */}
                    {msg.suggested_followup && msg.suggested_followup.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.suggested_followup.map((query: string, qIdx: number) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSend(query)}
                            className="text-xs font-mono bg-[#0a0c12] hover:bg-zinc-900 text-zinc-300 hover:text-orange-400 border border-zinc-800 hover:border-orange-500/60 px-3 py-1.5 rounded transition-all text-left flex items-center gap-1.5"
                          >
                            <span className="text-orange-500">›</span> {query}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-3 px-4 py-3 bg-[#0a0c12] border border-zinc-800 rounded w-fit font-mono">
                <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">
                  ASTROGUARD COMPUTING
                </span>
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Dock (AstroGuard HUD Style) */}
          <footer className="border-t border-zinc-800/80 bg-[#08090d]/95 px-4 sm:px-8 py-3.5 backdrop-blur z-10">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Inquire regarding symptoms, bone density, biometrics, transit trajectory..."
                  className="w-full bg-[#050608] border border-zinc-800 focus:border-orange-500 rounded px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors font-mono"
                  disabled={loading}
                />
                <div className="absolute top-1 right-2 text-[10px] font-mono text-zinc-600 hidden sm:block pointer-events-none">
                  PRESS ENTER ↵
                </div>
              </div>
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-mono font-semibold px-6 py-3 rounded text-sm transition-all shadow-lg shadow-orange-600/20 shrink-0 flex items-center gap-2"
              >
                <span>SEND</span>
                <span>→</span>
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AssistronautChat;
