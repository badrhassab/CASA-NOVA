import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, SAMPLE_ASTRONAUT_CONTEXT } from '../services/assistronaut';

const INTENT_BADGES = {
  bone_question:      { label: '🦴 Bone Health',        color: 'bg-amber-950 text-amber-300 border-amber-800' },
  immune_question:    { label: '🦠 Immune Health',      color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  astronomy_question: { label: '🪐 Astronomy & Science', color: 'bg-purple-950 text-purple-300 border-purple-800' },
  symptom_report:     { label: '🩺 Symptom Report',     color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  mission_question:   { label: '🚀 Mission Health',     color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  countermeasure:     { label: '🛡️ Countermeasure',    color: 'bg-teal-950 text-teal-300 border-teal-800' },
  general_health:     { label: '💡 Health Info',        color: 'bg-slate-800 text-slate-300 border-slate-700' },
  emergency:          { label: '🚨 EMERGENCY',           color: 'bg-rose-950 text-rose-300 border-rose-700' },
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl w-fit">
      <span className="text-sky-400 text-xs font-semibold tracking-wider uppercase">ASSISTRONAUT</span>
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function MissionPanel({ ctx }) {
  const m = ctx.mission;
  const h = ctx.health_data;
  const progress = Math.min(100, Math.round((m.mission_day / m.planned_duration_days) * 100));

  const destinationEmoji = {
    Mars: '🔴',
    Moon: '🌕',
    ISS: '🛸',
    'Deep Space': '🌌',
  }[m.destination] || '🪐';

  return (
    <aside className="w-80 shrink-0 bg-slate-900/90 border-r border-slate-800 p-6 flex flex-col gap-5 overflow-y-auto hidden lg:flex select-none">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl">
          👨‍🚀
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-wide">{ctx.name}</div>
          <div className="text-slate-400 text-xs font-mono">ID: {ctx.id} · Age {ctx.age}</div>
        </div>
      </div>

      <div>
        <div className="text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">Active Mission</div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold text-sm">{m.name}</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
              {destinationEmoji} {m.destination}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Phase: <span className="text-slate-200">{m.phase}</span>
          </div>
          <div className="text-xs text-slate-400">
            Gravity: <span className="text-amber-400 font-medium">{m.gravity_exposure}</span>
          </div>
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
        <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
          <span>Launch (Day 0)</span>
          <span>{progress}% elapsed</span>
        </div>
      </div>

      <div>
        <div className="text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">Telemetry & Records</div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2.5">
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-semibold">Latest Bone Scan</div>
            <div className="text-xs text-slate-200 mt-0.5">{h.latest_bone_scan || 'No telemetry recorded'}</div>
          </div>
          <div className="border-t border-slate-800/60 pt-2">
            <div className="text-[11px] text-slate-500 uppercase font-semibold">Resistance Exercise</div>
            <div className="text-xs text-emerald-400 mt-0.5">{h.exercise_adherence || 'Pending upload'}</div>
          </div>
          <div className="border-t border-slate-800/60 pt-2">
            <div className="text-[11px] text-slate-500 uppercase font-semibold">Immune Biomarkers</div>
            <div className="text-xs text-slate-200 mt-0.5">{h.immune_biomarkers || 'No active alerts'}</div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed">
        Assistronaut Clinical Decision Support. NASA HRP safety protocols enforced.
      </div>
    </aside>
  );
}

function MessageBubble({ msg, onFollowup }) {
  const isUser = msg.role === 'user';
  const badge = msg.intent ? INTENT_BADGES[msg.intent] || INTENT_BADGES.general_health : null;

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[75%] sm:max-w-[65%] bg-sky-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-lg">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 animate-fade-in">
      <div className="max-w-[90%] sm:max-w-[80%] flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 text-xs font-bold tracking-wider uppercase">ASSISTRONAUT</span>
          {badge && (
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>

        {/* Emergency Escalation Banner */}
        {msg.escalation_flag && (
          <div className="bg-rose-950/90 border-2 border-rose-500 rounded-xl p-4 text-rose-200 text-sm leading-relaxed shadow-xl animate-pulse">
            <div className="font-bold flex items-center gap-2 text-rose-300 text-base mb-1">
              <span>🚨</span> EMERGENCY ESCALATION PROTOCOL ACTIVATED
            </div>
            {msg.escalation_reason && (
              <div className="text-xs text-rose-400 font-mono mb-2">Reason: {msg.escalation_reason}</div>
            )}
            Please notify the Flight Surgeon and Onboard Medical Officer immediately.
          </div>
        )}

        {/* Assistant Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 text-slate-100 text-sm leading-relaxed shadow-xl whitespace-pre-wrap">
          {msg.content}
        </div>

        {/* Sources Citing Section */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-col gap-1.5">
            <div className="text-[11px] text-sky-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span>📚</span> Verified Scientific Sources
            </div>
            <div className="flex flex-col gap-1">
              {msg.sources.map((s, idx) => (
                <a
                  key={idx}
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

        {/* Suggested Follow-up Actions */}
        {msg.suggested_followup && msg.suggested_followup.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {msg.suggested_followup.map((query, idx) => (
              <button
                key={idx}
                onClick={() => onFollowup(query)}
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
}

export default function AssistronautChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Greetings, Commander Alex. I am ASSISTRONAUT, your mission-aware health support assistant.\n\n" +
        "I have full awareness of your mission parameters (ARES-01 Mars transit, Day 126) and continuous access to NASA Human Research Program clinical findings. " +
        "You can consult me about spaceflight physiological changes, symptom management, radiation, bone/muscle countermeasures, or immune monitoring.\n\n" +
        "How may I support your health today?",
      intent: 'general_health',
      sources: [
        {
          title: "NASA — Five Hazards of Human Spaceflight",
          url: "https://www.nasa.gov/hrp/hazards/",
          source: "NASA",
        },
      ],
      suggested_followup: [
        'Is my current mission dangerous for my bones?',
        'I am having a cold with a runny nose.',
        'Does Martian gravity protect bones after landing?',
      ],
      escalation_flag: false,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage(text, history, conversationId, SAMPLE_ASTRONAUT_CONTEXT);
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          intent: data.intent,
          sources: data.sources || [],
          suggested_followup: data.suggested_followup || [],
          escalation_flag: data.escalation_flag || false,
          escalation_reason: data.escalation_reason,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I could not establish communication with the Assistronaut backend service. " +
            "Please ensure the Django service is running on http://localhost:8000 and that Ollama is initialized (`ollama serve`).\n\n" +
            "For urgent clinical needs, please notify the Onboard Medical Officer immediately.",
          intent: 'general_health',
          sources: [],
          suggested_followup: [],
          escalation_flag: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <MissionPanel ctx={SAMPLE_ASTRONAUT_CONTEXT} />

      {/* Main Chat Container */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top Navbar */}
        <header className="h-16 shrink-0 bg-slate-900/80 border-b border-slate-800 px-6 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <div className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                ASSISTRONAUT
                <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800 font-mono px-2 py-0.5 rounded-md">
                  v1.0 CDS
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Onboard Medical & Countermeasure Intelligence System
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 rounded-full px-3 py-1 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online · Transit Mode
            </div>
          </div>
        </header>

        {/* Message Log */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                msg={msg}
                onFollowup={(query) => handleSend(query)}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Dock */}
        <footer className="border-t border-slate-800/80 bg-slate-900/90 px-4 sm:px-8 py-4 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about bone density, immune changes, symptoms, radiation..."
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white font-medium px-5 py-3 rounded-xl text-sm transition-all shadow-lg shadow-sky-600/20 shrink-0"
              >
                Send
              </button>
            </div>
            <div className="text-center text-[11px] text-slate-500">
              Emergency symptoms are automatically escalated to Mission Medical Protocol. Assistronaut does not replace licensed medical officers.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export { AssistronautChat };
