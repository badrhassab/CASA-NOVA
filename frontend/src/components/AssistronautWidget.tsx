import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, SAMPLE_ASTRONAUT_CONTEXT } from '../services/assistronaut';
import { AstronautContext, ChatMessage } from '../types/assistronaut';

const INTENT_COLORS: Record<string, string> = {
  bone_question: 'border-amber-700/80 bg-amber-950/30 text-amber-300',
  immune_question: 'border-emerald-700/80 bg-emerald-950/30 text-emerald-300',
  astronomy_question: 'border-purple-700/80 bg-purple-950/30 text-purple-300',
  symptom_report: 'border-orange-700/80 bg-orange-950/30 text-orange-300',
  emergency: 'border-rose-600 bg-rose-950/50 text-rose-200 animate-pulse',
  general_health: 'border-zinc-800 bg-zinc-900 text-zinc-300',
};

interface AssistronautWidgetProps {
  astronaut?: AstronautContext;
  astronautId?: string;
}

export const AssistronautWidget: React.FC<AssistronautWidgetProps> = ({ astronaut, astronautId }) => {
  const currentAstronaut = astronaut || SAMPLE_ASTRONAUT_CONTEXT;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `AstroGuard Deep-Space Copilot online. Greetings, ${currentAstronaut.name}. How can I assist with your flight physiology, symptoms, or mission science?`,
      intent: 'general_health',
      suggested_followup: [
        'What is my current heart rate and cabin temp?',
        'I am experiencing slight dizziness',
        'Tell me about our orbital transfer trajectory',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];

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
            'AstroGuard telemetry offline: unable to reach CDS server. Check backend status.',
          intent: 'general_health',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* Floating Launcher Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group relative flex items-center gap-3 bg-[#08090d] hover:bg-[#0c0e14] text-white border border-zinc-700/80 hover:border-orange-500/80 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 font-mono text-xs font-bold">
              AG
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#08090d]" />
          </div>
          <div className="text-left font-mono">
            <div className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
              AI DOCTOR
            </div>
            <div className="text-[10px] text-zinc-400">ASTROGUARD COPILOT</div>
          </div>
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {open && (
        <div className="w-96 sm:w-[420px] h-[580px] bg-[#07080c] border border-zinc-800 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[#090b10] border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 text-xs font-mono font-bold">
                AG
              </div>
              <div>
                <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  ASTROGUARD <span className="text-orange-500">[ AI DOCTOR ]</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400">
                  {currentAstronaut.name} • HR 62 BPM
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-white font-mono text-sm px-2 py-0.5 rounded hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#050608]">
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              if (isUser) {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                );
              }
              const colorClass = m.intent ? INTENT_COLORS[m.intent] : 'border-zinc-800 bg-[#090b10] text-zinc-200';
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div
                    className={`rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${colorClass}`}
                  >
                    {m.content}
                  </div>
                  {m.suggested_followup && m.suggested_followup.length > 0 && (
                    <div className="flex flex-col gap-1 mt-0.5">
                      {m.suggested_followup.slice(0, 2).map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSend(q)}
                          className="text-[11px] font-mono bg-[#090b10] hover:bg-zinc-900 text-zinc-400 hover:text-orange-400 border border-zinc-800/80 px-2.5 py-1 rounded text-left transition-colors flex items-center gap-1"
                        >
                          <span className="text-orange-500">›</span> {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-orange-400 bg-[#090b10] border border-zinc-800 px-3 py-1.5 rounded w-fit">
                <span>ANALYZING TELEMETRY</span>
                <span className="animate-pulse">...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Dock */}
          <div className="p-3 bg-[#090b10] border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Inquire health or mission telemetry..."
              className="flex-1 bg-[#050608] border border-zinc-800 focus:border-orange-500 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none font-mono"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-mono text-xs font-semibold px-4 py-2 rounded transition-colors"
            >
              SEND
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistronautWidget;
