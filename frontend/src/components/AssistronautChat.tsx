import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bone,
  CheckCircle2,
  ChevronRight,
  Compass,
  Cpu,
  Database,
  Dna,
  ExternalLink,
  Heart,
  HelpCircle,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wind,
  Zap,
} from 'lucide-react';
import { sendMessage, fetchAstronautContext, SAMPLE_ASTRONAUT_CONTEXT } from '../services/assistronaut';
import type { AstronautContext, ChatMessage, SourceReference } from '../types/assistronaut';

const QUICK_PROMPTS = [
  'Review my current bone density loss and T-score',
  'Assess my accumulated radiation dose against limits',
  'Check ECLSS cabin oxygen and pressure status',
  'Recommend exercise countermeasures for microgravity',
];

interface AssistronautChatProps {
  currentAstronaut?: any;
}

export const AssistronautChat: React.FC<AssistronautChatProps> = ({ currentAstronaut: propAstronaut }) => {
  const [astronaut, setAstronaut] = useState<any>(() => {
    if (propAstronaut) return propAstronaut;
    try {
      const saved = sessionStorage.getItem('astroguard_user') || localStorage.getItem('astroguard_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [liveContext, setLiveContext] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState<boolean>(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propAstronaut) setAstronaut(propAstronaut);
  }, [propAstronaut]);

  // Fetch real astronaut telemetry & health profile from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadContext = async () => {
      setContextLoading(true);
      try {
        const idToQuery = astronaut?.id || astronaut?.callsign || astronaut?.full_name || 'bbbb2222-bbbb-2222-bbbb-222222222222';
        const ctx = await fetchAstronautContext(idToQuery);
        if (isMounted && ctx) {
          setLiveContext(ctx);
          const crewName = ctx.name || astronaut?.full_name || 'Crew Member';
          const callsign = ctx.callsign || astronaut?.callsign || 'DOC-EAGLE';
          const missionName = ctx.mission?.name || 'Expedition I';
          const destination = ctx.mission?.destination || 'Moon (Artemis Base)';
          const hr = ctx.health_data?.vital_signs?.split(',')[0]?.replace('HR:', '').trim() || '62 bpm';
          const boneLoss = ctx.health_data?.bone_density_loss_pct || '0.3%';
          const rad = ctx.health_data?.radiation_accumulated_msv || '38.4 mSv';

          setMessages([
            {
              role: 'assistant',
              content: `Greetings, ${crewName} [${callsign}]. I am Assistronaut, your autonomous Clinical Decision Support Copilot for ${missionName} on ${destination}.\n\nI have established a direct telemetry link to your Supabase medical record (Resting HR: ${hr}, Bone loss: ${boneLoss}, Radiation dose: ${rad}). All countermeasures conform to NASA Human Research Program (HRP) flight standards. How may I assist your medical operations today?`,
              intent: 'general_health',
              suggested_followup: [
                'Is my current bone density loss acceptable?',
                'How does microgravity affect immune T-cell response?',
                'Verify our current ECLSS cabin oxygen level',
              ],
            },
          ]);
        }
      } catch (err) {
        console.warn('Could not load live astronaut telemetry:', err);
      } finally {
        if (isMounted) setContextLoading(false);
      }
    };

    loadContext();
    return () => {
      isMounted = false;
    };
  }, [astronaut?.id, astronaut?.callsign]);

  const activeName = liveContext?.name || astronaut?.full_name || 'rachid';
  const activeCallsign = liveContext?.callsign || astronaut?.callsign || 'Doc-Eagle';
  const activeRole = liveContext?.role || astronaut?.role || 'Médecin de Bord / EVA Lead';
  const activeMission = liveContext?.mission?.name || 'Expedition I';
  const activeDestination = liveContext?.mission?.destination || 'Lune - Cratère Shackleton';
  const isSupabaseLive = liveContext?.data_source === 'supabase' || liveContext?.data_source === 'django_orm';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Greetings, ${activeName}. Initializing Assistronaut telemetry interface...`,
      intent: 'general_health',
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage(
        text,
        messages,
        conversationId,
        liveContext || astronaut || SAMPLE_ASTRONAUT_CONTEXT,
        liveContext?.id || astronaut?.id || astronaut?.callsign || 'Doc-Eagle'
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
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Telemetry link to Assistronaut CDS backend was interrupted. Verify the Django server is running on port 8000.',
          intent: 'emergency',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-4 text-[#F2F2F0]">
      {/* ── TOP HUD TELEMETRY BAR (Connected to Supabase) ──────────────────── */}
      <div className="border border-white/[0.08] bg-[#070809]/95 p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF5A1F] via-[#FF5A1F]/40 to-transparent" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Crew and Mission Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 border border-[#FF5A1F]/30 bg-[#FF5A1F]/10 flex items-center justify-center font-mono text-xs font-bold text-[#FF5A1F] shrink-0">
              {activeCallsign.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-hud text-base font-bold text-white uppercase tracking-tight">
                  {activeName}
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 border border-white/10 bg-white/[0.04] text-zinc-400 uppercase">
                  {activeCallsign}
                </span>
              </div>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                {activeRole} · <span className="text-zinc-300">{activeMission}</span> ({activeDestination})
              </p>
            </div>
          </div>

          {/* Live Telemetry Chips from Supabase */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="border border-white/[0.06] bg-black/50 px-3 py-1.5 flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">HEART RATE</div>
                <div className="font-mono text-xs font-semibold text-white">
                  {liveContext?.health_data?.vital_signs?.split(',')[0]?.replace('HR:', '').trim() || '62 bpm'}
                </div>
              </div>
            </div>

            <div className="border border-white/[0.06] bg-black/50 px-3 py-1.5 flex items-center gap-2">
              <Bone className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">BONE T-SCORE</div>
                <div className="font-mono text-xs font-semibold text-white">
                  {liveContext?.health_data?.baseline_bone_density_tscore || '+1.3'}
                </div>
              </div>
            </div>

            <div className="border border-white/[0.06] bg-black/50 px-3 py-1.5 flex items-center gap-2">
              <Dna className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">BONE LOSS</div>
                <div className="font-mono text-xs font-semibold text-orange-400">
                  {liveContext?.health_data?.bone_density_loss_pct || '0.3%'}
                </div>
              </div>
            </div>

            <div className="border border-white/[0.06] bg-black/50 px-3 py-1.5 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">RAD ACCUMULATED</div>
                <div className="font-mono text-xs font-semibold text-white">
                  {liveContext?.health_data?.radiation_accumulated_msv || '38.4 mSv'}
                </div>
              </div>
            </div>

            <div className="border border-white/[0.06] bg-black/50 px-3 py-1.5 flex items-center gap-2">
              <Wind className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">CABIN O₂ / SUIT</div>
                <div className="font-mono text-xs font-semibold text-white">
                  {liveContext?.eclss?.cabin_oxygen_pct || '21.05'}% · {liveContext?.eclss?.suit_oxygen_reserve_pct || '96.4'}%
                </div>
              </div>
            </div>

            {/* Supabase status badge */}
            <div className="border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-emerald-500/80">DATABASE</div>
                <div className="font-mono text-[10px] font-semibold text-emerald-400 uppercase">
                  {isSupabaseLive ? 'SUPABASE SYNCED' : 'INITIALIZING'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN NASA CHAT TERMINAL ──────────────────────────────────────── */}
      <section className="flex-1 flex flex-col border border-white/[0.08] bg-[#070809]/95 min-h-[580px] lg:min-h-[640px] relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {/* Terminal Header Bar */}
        <div className="px-5 py-3 border-b border-white/[0.08] bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-[#FF5A1F]" />
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-white font-semibold">
              ASSISTRONAUT CLINICAL DECISION SUPPORT TERMINAL
            </span>
            <span className="font-mono text-[9px] px-2 py-0.5 border border-[#FF5A1F]/30 bg-[#FF5A1F]/10 text-orange-300 uppercase">
              NASA HRP STANDARDS
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] text-zinc-500">
            <span>MODEL: GPT-OSS-120B / GROQ</span>
            <span>·</span>
            <span className="text-emerald-400">CDSS ACTIVE</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 font-sans text-sm">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl ${
                  isUser ? 'ml-auto' : 'mr-auto'
                } w-full`}
              >
                {/* Technical Meta Header */}
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5 flex items-center gap-2">
                  <span className={isUser ? 'text-orange-400' : 'text-zinc-400'}>
                    {isUser ? `CREW // ${activeCallsign.toUpperCase()}` : 'ASSISTRONAUT COPILOT // NASA CDSS'}
                  </span>
                  {msg.intent && !isUser && (
                    <span className="px-1.5 py-0.2 border border-white/10 bg-white/[0.03] text-zinc-400 text-[8px]">
                      {msg.intent.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                  {msg.escalation_flag && (
                    <span className="px-1.5 py-0.2 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[8px] flex items-center gap-1 font-bold">
                      <AlertTriangle className="h-2.5 w-2.5" /> CLINICAL ESCALATION
                    </span>
                  )}
                </div>

                {/* Message Body */}
                <div
                  className={`w-full p-4 sm:p-5 leading-relaxed whitespace-pre-wrap border ${
                    isUser
                      ? 'bg-[#FF5A1F]/[0.08] border-[#FF5A1F]/40 text-white rounded-none border-l-4 border-l-[#FF5A1F]'
                      : 'bg-[#050505] border-white/[0.08] text-zinc-200 rounded-none border-l-4 border-l-zinc-600'
                  }`}
                  style={{ fontFamily: isUser ? "'Inter Tight', sans-serif" : "'Inter', sans-serif" }}
                >
                  <p className="text-[13px] sm:text-sm text-zinc-200 leading-relaxed font-light">{msg.content}</p>

                  {/* Escalation warning banner if flagged */}
                  {msg.escalation_flag && msg.escalation_reason && (
                    <div className="mt-3 p-3 border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs font-mono flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wider block mb-0.5">Flight Surgeon Alert:</span>
                        {msg.escalation_reason}
                      </div>
                    </div>
                  )}

                  {/* NASA HRP / Evidence Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                        <Database className="h-3 w-3 text-orange-400" /> Evidence Citations:
                      </span>
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[9px] px-2 py-1 border border-white/10 bg-white/[0.02] text-zinc-300 hover:text-orange-400 hover:border-orange-400/40 transition-colors flex items-center gap-1"
                        >
                          <span>{src.title}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Suggested Follow-up Questions */}
                  {msg.suggested_followup && msg.suggested_followup.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block mb-2">
                        Suggested Clinical Follow-up:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.suggested_followup.map((q, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSend(q)}
                            disabled={loading}
                            className="font-mono text-[10px] text-left px-2.5 py-1.5 border border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white hover:border-[#FF5A1F]/50 hover:bg-[#FF5A1F]/[0.06] transition-colors flex items-center gap-1.5"
                          >
                            <span className="text-[#FF5A1F] font-bold">0{qIdx + 1} /</span>
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing / Reasoning Indicator */}
          {loading && (
            <div className="flex items-center gap-3 p-4 border border-white/[0.06] bg-[#050505] max-w-md">
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-ping" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                Assistronaut analyzing telemetry & NASA HRP database...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Tactical Quick Inquiry Buttons */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-black/40 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 mr-1">QUICK INQUIRY:</span>
          {QUICK_PROMPTS.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="font-mono text-[10px] px-2.5 py-1 border border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white hover:border-[#FF5A1F]/40 hover:bg-white/[0.05] transition-colors"
            >
              [ 0{pIdx + 1} / {prompt} ]
            </button>
          ))}
        </div>

        {/* Command Terminal Input */}
        <div className="p-4 border-t border-white/[0.08] bg-black/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-[#FF5A1F]">
                &gt;
              </span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Transmit medical inquiry, symptom report, or countermeasure query..."
                disabled={loading}
                className="w-full bg-black/60 border border-white/10 py-3 pl-8 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5A1F]/60 transition-colors font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="py-3 px-5 bg-[#FF5A1F] hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-[#FF5A1F] text-black font-mono font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Transmit</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="mt-2.5 flex items-center justify-between font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
            <span>NASA HRP CDSS · AUTONOMOUS MEDICAL OPERATIONS</span>
            <span className="text-zinc-600">PRESS ENTER TO TRANSMIT</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AssistronautChat;
