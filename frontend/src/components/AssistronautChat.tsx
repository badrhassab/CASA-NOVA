import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bone,
  CheckCircle2,
  ChevronRight,
  Compass,
  CornerDownLeft,
  Cpu,
  Database,
  Dna,
  Heart,
  HelpCircle,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wind
} from 'lucide-react';
import { sendMessage, SAMPLE_ASTRONAUT_CONTEXT } from '../services/assistronaut';
import type { AstronautContext, ChatMessage, SourceReference } from '../types/assistronaut';

const QUICK_PROMPTS = [
  'Is my bone loss within flight limits?',
  'Check cabin CO2 effect on intracranial pressure',
  'Recommend exercise countermeasures for microgravity',
  'Assess radiation dose against the 600 mSv career limit',
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

  useEffect(() => {
    if (propAstronaut) setAstronaut(propAstronaut);
  }, [propAstronaut]);

  const activeName = astronaut?.full_name || 'Commander Alex Rivera';
  const activeCallsign = astronaut?.callsign || 'ARES-LEAD';
  const activeRole = astronaut?.role || 'Mission Commander';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Greetings, ${activeName}. I am Assistronaut, your autonomous Clinical Decision Support copilot.\n\nI am monitoring your biometric telemetry, radiation dosimetry, and cabin environmental controls for long-duration transit. All countermeasures conform to NASA Human Research Program (HRP) flight standards. How may I assist your medical operations today?`,
      intent: 'general_health',
      suggested_followup: [
        'Is my current bone density loss acceptable?',
        'How does microgravity affect immune T-cell response?',
        'Verify our current ECLSS cabin oxygen level',
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
        astronaut || SAMPLE_ASTRONAUT_CONTEXT,
        astronaut?.id || 'AST-001'
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
    <div className="w-full flex-1 flex flex-col lg:flex-row gap-5 items-stretch">
      {/* ── Left Telemetry Sidebar ────────────────────────────────────────── */}
      <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
        {/* Crew Identity Card */}
        <div className="border border-white/10 bg-[#090b0c]/90 p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-orange-400 to-transparent" />
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 mb-3">
            <span>■ CREW TELEMETRY</span>
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 border border-orange-500/30 bg-orange-500/10 flex items-center justify-center text-orange-400 font-mono text-xs font-bold shrink-0">
              {activeCallsign.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h3 className="font-hud text-base font-bold text-white uppercase truncate">{activeName}</h3>
              <p className="font-mono text-[10px] text-slate-400 tracking-wider">CALLSIGN: {activeCallsign}</p>
              <p className="font-mono text-[9px] text-orange-400/90 tracking-wider mt-0.5 uppercase">{activeRole}</p>
            </div>
          </div>
        </div>

        {/* Live Biometrics Summary */}
        <div className="border border-white/10 bg-[#090b0c]/90 p-5 flex flex-col gap-3.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 pb-2 border-b border-white/10 flex items-center justify-between">
            <span>PHYSIOLOGICAL STATUS</span>
            <Activity className="h-3.5 w-3.5 text-orange-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-white/5 bg-white/[0.02] p-2.5">
              <span className="font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-400" /> Heart Rate
              </span>
              <div className="font-mono text-sm font-semibold text-white mt-1">62 <span className="text-[10px] text-slate-400 font-normal">BPM</span></div>
            </div>
            <div className="border border-white/5 bg-white/[0.02] p-2.5">
              <span className="font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1">
                <Bone className="h-3 w-3 text-amber-400" /> T-Score
              </span>
              <div className="font-mono text-sm font-semibold text-white mt-1">+1.15 <span className="text-[10px] text-emerald-400 font-normal">Normal</span></div>
            </div>
            <div className="border border-white/5 bg-white/[0.02] p-2.5">
              <span className="font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1">
                <Dna className="h-3 w-3 text-purple-400" /> Bone Loss
              </span>
              <div className="font-mono text-sm font-semibold text-white mt-1">0.45% <span className="text-[10px] text-slate-400 font-normal">/ mo</span></div>
            </div>
            <div className="border border-white/5 bg-white/[0.02] p-2.5">
              <span className="font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1">
                <Wind className="h-3 w-3 text-sky-400" /> Cabin O₂
              </span>
              <div className="font-mono text-sm font-semibold text-white mt-1">20.9% <span className="text-[10px] text-emerald-400 font-normal">101.3 kPa</span></div>
            </div>
          </div>

          {/* Adherence Bar */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">
              <span>Countermeasure Adherence</span>
              <span className="text-orange-400">85%</span>
            </div>
            <div className="h-1 bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400" style={{ width: '85%' }} />
            </div>
            <p className="font-mono text-[9px] text-slate-500 mt-1.5">ARED Resistive + Cycle Ergometer schedule</p>
          </div>
        </div>

        {/* Clinical Protocol Badge */}
        <div className="border border-white/10 bg-[#090b0c]/90 p-4 font-mono text-[10px] text-slate-400 leading-relaxed">
          <div className="flex items-center gap-2 text-orange-400 mb-1 text-[11px] font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> NASA CDSS PROTOCOL
          </div>
          Continuous risk surveillance for SANS, microgravity osteopenia, immune dysregulation, and high-LET cosmic radiation.
        </div>
      </aside>

      {/* ── Main Chat Terminal ───────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col border border-white/10 bg-[#090b0c]/90 min-h-[580px] lg:min-h-[640px] relative overflow-hidden">
        {/* Terminal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-4 w-4 text-orange-400" />
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-white font-semibold">
              ASSISTRONAUT COGNITIVE ENGINE
            </span>
            <span className="font-mono text-[9px] px-2 py-0.5 border border-orange-500/30 bg-orange-500/10 text-orange-300">
              NASA HRP v1.0
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] text-slate-500">
            <span>MODEL: GPT-OSS-120B</span>
            <span>·</span>
            <span className="text-emerald-400">LATENCY: 240ms</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-sm">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl ${
                  isUser ? 'ml-auto' : 'mr-auto'
                }`}
              >
                {/* Meta header */}
                <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-2">
                  <span>{isUser ? activeCallsign : 'ASSISTRONAUT COPILOT'}</span>
                  {msg.intent && !isUser && (
                    <span className="px-1.5 py-0.5 border border-orange-500/20 bg-orange-500/5 text-orange-300 text-[8px]">
                      {msg.intent.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Message body */}
                <div
                  className={`p-4 leading-relaxed whitespace-pre-wrap border ${
                    isUser
                      ? 'bg-orange-500/10 border-orange-500/40 text-white'
                      : 'bg-[#050607] border-white/10 text-slate-200'
                  }`}
                  style={{ fontFamily: isUser ? "'Inter Tight', sans-serif" : "'Inter', sans-serif" }}
                >
                  {msg.content}

                  {/* Sources pill if provided */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 font-mono text-[9px]">
                      <span className="text-slate-500">CLINICAL REFERENCES:</span>
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 border border-white/15 bg-white/5 hover:border-orange-400 hover:text-orange-300 transition-colors text-slate-300"
                        >
                          {src.title} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggested follow-ups */}
                {msg.suggested_followup && msg.suggested_followup.length > 0 && !isUser && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {msg.suggested_followup.map((f, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => handleSend(f)}
                        className="font-mono text-[10px] px-2.5 py-1 border border-white/10 hover:border-orange-500/60 bg-white/[0.02] hover:bg-orange-500/10 text-slate-400 hover:text-orange-200 transition-all text-left"
                      >
                        {f} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-orange-400 font-mono text-xs p-3 border border-orange-500/20 bg-orange-500/5 max-w-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              Synthesizing NASA HRP clinical countermeasure...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 border-t border-white/10 bg-black/30 flex items-center gap-2 overflow-x-auto select-none">
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 whitespace-nowrap">
            QUICK PROMPTS:
          </span>
          {QUICK_PROMPTS.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSend(prompt)}
              className="font-mono text-[9px] uppercase px-2.5 py-1 border border-white/10 hover:border-orange-400 bg-white/[0.02] text-slate-400 hover:text-orange-300 transition-colors whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Command Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 border-t border-white/10 bg-black/60 flex items-center gap-2 sm:gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Report symptoms, ask about countermeasures, or verify telemetry..."
              className="w-full bg-[#050607] border border-white/15 px-4 py-3 font-mono text-xs sm:text-sm text-white placeholder:text-slate-600 outline-none focus:border-orange-500/80 transition-colors"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 border border-orange-400 bg-orange-500 hover:bg-orange-400 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
          >
            <span>TRANSMIT</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </section>
    </div>
  );
};

export default AssistronautChat;
