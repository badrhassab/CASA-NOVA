import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, SAMPLE_ASTRONAUT_CONTEXT } from '../services/assistronaut';
import { AstronautContext, ChatMessage } from '../types/assistronaut';

const INTENT_COLORS: Record<string, string> = {
  bone_question: 'border-amber-700/80 bg-amber-950/20',
  immune_question: 'border-emerald-700/80 bg-emerald-950/20',
  astronomy_question: 'border-purple-700/80 bg-purple-950/20',
  symptom_report: 'border-cyan-700/80 bg-cyan-950/20',
  emergency: 'border-rose-600 bg-rose-950/40',
  general_health: 'border-slate-800 bg-slate-900',
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
      content: `Hello ${currentAstronaut.name}. Assistronaut online. How can I support your health, countermeasures, or mission science?`,
      intent: 'general_health',
      suggested_followup: [
        'Is my current mission dangerous for my bones?',
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
          content: 'Unable to reach Assistronaut CDS backend. Please verify your Django server is online.',
          intent: 'general_health',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
      {open && (
        <div className="w-[380px] sm:w-[420px] h-[550px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🚀</span>
              <div>
                <div className="text-white text-sm font-bold tracking-wide">ASSISTRONAUT</div>
                <div className="text-sky-400 text-[11px] font-mono">
                  {currentAstronaut.mission.name} · {currentAstronaut.name}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
              aria-label="Close widget"
            >
              ✕
            </button>
          </div>

          {/* Conversation history */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col gap-1">
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-sky-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs leading-relaxed shadow">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start flex-col gap-1.5">
                    {msg.escalation_flag && (
                      <div className="bg-rose-950 border border-rose-500 rounded-lg p-2.5 text-rose-200 text-xs font-semibold animate-pulse">
                        🚨 EMERGENCY — Contact Flight Surgeon Immediately
                      </div>
                    )}
                    <div
                      className={`max-w-[90%] border rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-slate-200 text-xs leading-relaxed shadow ${
                        INTENT_COLORS[msg.intent || 'general_health'] || 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="text-[10px] text-sky-400 pl-1 flex flex-col gap-0.5">
                        {msg.sources.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline truncate block"
                          >
                            📚 [{s.source}] {s.title}
                          </a>
                        ))}
                      </div>
                    )}

                    {msg.suggested_followup && msg.suggested_followup.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {msg.suggested_followup.slice(0, 2).map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(q)}
                            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 px-2.5 py-1 rounded-full transition-colors text-left"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl w-fit">
                <span className="text-sky-400 text-[10px] font-mono">ASSISTRONAUT</span>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 bg-slate-900 p-3 select-none">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about health or space science..."
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating launcher button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-14 h-14 bg-gradient-to-tr from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all hover:scale-105 active:scale-95 border border-sky-400/40"
        title="Open Assistronaut Health Assistant"
        aria-label="Toggle Assistronaut Health Assistant"
      >
        {open ? '✕' : '🚀'}
      </button>
    </div>
  );
};

export default AssistronautWidget;
