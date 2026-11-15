import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, SAMPLE_ASTRONAUT_CONTEXT } from '../services/assistronaut';
import { AstronautContext, ChatMessage, SourceReference } from '../types/assistronaut';

const INTENT_BADGES: Record<string, { label: string; color: string }> = {
  bone_question:      { label: '🦴 Bone Health',        color: 'bg-amber-950 text-amber-300 border-amber-800' },
  immune_question:    { label: '🦠 Immune Health',      color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  astronomy_question: { label: '🪐 Astronomy & Science', color: 'bg-purple-950 text-purple-300 border-purple-800' },
  symptom_report:     { label: '🩺 Symptom Report',     color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  mission_question:   { label: '🚀 Mission Health',     color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  countermeasure:     { label: '🛡️ Countermeasure',    color: 'bg-teal-950 text-teal-300 border-teal-800' },
  general_health:     { label: '💡 Health Info',        color: 'bg-slate-800 text-slate-300 border-slate-700' },
  emergency:          { label: '🚨 EMERGENCY',           color: 'bg-rose-950 text-rose-300 border-rose-700' },
};

interface AssistronautChatProps {
  astronaut?: AstronautContext;
  astronautId?: string;
}

export const AssistronautChat: React.FC<AssistronautChatProps> = ({ astronaut, astronautId }) => {
  const currentAstronaut = astronaut || SAMPLE_ASTRONAUT_CONTEXT;
  const m = currentAstronaut.mission;
  const h = currentAstronaut.health_data || {};
  const progress = Math.min(100, Math.round((m.mission_day / m.planned_duration_days) * 100));

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Greetings, ${currentAstronaut.name}. I am Assistronaut, your onboard clinical and science companion.\n\nI am tracking your transit parameters on mission ${m.name} (${m.destination} transit, Day ${m.mission_day} of ${m.planned_duration_days}). How can I assist you with your health, countermeasures, or mission science today?`,
      intent: 'general_health',
      suggested_followup: [
        'Is my current mission dangerous for my bones?',
        'How does microgravity affect our immune system?',
        'What are the orbital mechanics of our Hohmann transfer?',
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
            'Unable to reach Assistronaut CDS backend. Please verify your Django backend is running and connected to Supabase.',
          intent: 'general_health',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Astronaut & Mission Telemetry Sidebar */}
      <aside className="w-80 shrink-0 bg-slate-900/90 border-r border-slate-800 p-6 flex flex-col gap-5 overflow-y-auto hidden lg:flex select-none">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl">
            👨‍🚀
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wide">{currentAstronaut.name}</div>
            <div className="text-slate-400 text-xs font-mono">ID: {currentAstronaut.id} · Age {currentAstronaut.age}</div>
          </div>
        </div>

        <div>
          <div className="text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">Active Mission</div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">{m.name}</span>
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                🔴 {m.destination}
              </span>
            </div>
            <div className="text-slate-400">Phase: <span className="text-slate-200">{m.phase}</span></div>
            <div className="text-slate-400">Gravity: <span className="text-amber-400 font-medium">{m.gravity_exposure}</span></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5 font-mono">
            <span className="text-sky-400 font-semibold uppercase tracking-wider">Mission Timeline</span>
            <span className="text-slate-300">Day {m.mission_day} / {m.planned_duration_days}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-sky-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">{progress}% mission elapsed</div>
        </div>

        <div>
          <div className="text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">Supabase Medical Records</div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2.5 text-xs">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Latest Bone Scan</div>
              <div className="text-slate-200 mt-0.5">{h.latest_bone_scan || 'Day 90'}</div>
            </div>
            <div className="border-t border-slate-800/60 pt-2">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Resistance Adherence</div>
              <div className="text-emerald-400 mt-0.5">{h.exercise_adherence || '85% compliance'}</div>
            </div>
            <div className="border-t border-slate-800/60 pt-2">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Immune Biomarkers</div>
              <div className="text-slate-200 mt-0.5">{h.immune_biomarkers || 'Logged on Day 60'}</div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          Supabase Telemetry Synced. NASA HRP safety protocols enforced.
        </div>
      </aside>

      {/* Main Conversation Dock */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <header className="h-16 shrink-0 bg-slate-900/80 border-b border-slate-800 px-6 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <div className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                ASSISTRONAUT
                <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800 font-mono px-2 py-0.5 rounded-md">
                  SUPABASE CDS
                </span>
              </div>
              <div className="text-xs text-slate-400">Onboard Health & Astronomy Companion</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 rounded-full px-3 py-1 text-xs text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Neural Model (Groq 120B)
          </div>
        </header>

        {/* Message Log */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-5">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const badge = msg.intent ? INTENT_BADGES[msg.intent] || INTENT_BADGES.general_health : null;

              if (isUser) {
                return (
                  <div key={idx} className="flex justify-end">
                    <div className="max-w-[75%] sm:max-w-[65%] bg-sky-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-lg">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex justify-start">
                  <div className="max-w-[90%] sm:max-w-[80%] flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 text-xs font-bold uppercase tracking-wider">ASSISTRONAUT</span>
                      {badge && (
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    {msg.escalation_flag && (
                      <div className="bg-rose-950 border-2 border-rose-500 rounded-xl p-4 text-rose-200 text-sm font-semibold shadow-xl animate-pulse">
                        🚨 EMERGENCY ESCALATION PROTOCOL ACTIVATED — Contact Flight Surgeon Immediately
                      </div>
                    )}

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 text-slate-100 text-sm leading-relaxed shadow-xl whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-col gap-1.5">
                        <div className="text-[11px] text-sky-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <span>📚</span> Verified Scientific Sources
                        </div>
                        <div className="flex flex-col gap-1">
                          {msg.sources.map((s: SourceReference, sIdx: number) => (
                            <a
                              key={sIdx}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-sky-300 hover:text-sky-200 hover:underline flex items-center gap-1.5 truncate"
                            >
                              <span className="text-slate-500">[{s.source}]</span>
                              <span className="truncate">{s.title}</span>
                              <span className="text-slate-500 text-[10px]">↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.suggested_followup && msg.suggested_followup.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.suggested_followup.map((query: string, qIdx: number) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSend(query)}
                            className="text-xs bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700/80 hover:border-sky-500/80 px-3 py-1.5 rounded-full transition-all text-left"
                          >
                            💬 {query}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl w-fit">
                <span className="text-sky-400 text-xs font-semibold uppercase tracking-wider">ASSISTRONAUT</span>
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Dock */}
        <footer className="border-t border-slate-800/80 bg-slate-900/90 px-4 sm:px-8 py-4 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about symptoms, bone density, celestial trajectories, radiation..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-medium px-5 py-3 rounded-xl text-sm transition-all shadow-lg shadow-sky-600/20 shrink-0"
            >
              Send
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AssistronautChat;
