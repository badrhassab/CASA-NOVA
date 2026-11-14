import React, { useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { consultMedicalAI } from '../services/api';

export default function MedicalChat({ astronaut }) {
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'AI_FLIGHT_SURGEON',
      text: `Bonjour astronaute ${astronaut.full_name} ! Peux-tu me dire quels symptômes tu ressens aujourd’hui ?`,
      hazard: 'DISTANCE & AUTONOMOUS CARE',
      triage: 'ROUTINE'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), sender: 'ASTRONAUT', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await consultMedicalAI(astronaut, text);
      const aiData = res.data.ai_response;
      setMessages(prev => [...prev, {
        id: aiData.id,
        sender: 'AI_FLIGHT_SURGEON',
        text: aiData.message_text,
        hazard: aiData.hrp_hazard_tag,
        triage: aiData.triage_level
      }]);
    } catch (err) {
      // Diagnostic local de secours si le backend Django n'est pas encore démarré
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'AI_FLIGHT_SURGEON',
        text: `Astronaute ${astronaut.full_name}, je n’arrive pas à joindre le serveur pour analyser ton message. Vérifie la connexion et réessaie.`,
        hazard: 'GRAVITY & FLUID SHIFTS',
        triage: 'EVALUATE'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hud-panel p-5 flex flex-col h-[min(680px,calc(100vh-190px))] min-h-[500px]">
      <div className="hud-corner-tl" /><div className="hud-corner-br" />
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-hud text-white">ASSISTANT SANTÉ PERSONNALISÉ</h3>
            <p className="text-[10px] text-slate-400 font-mono">Adapté à votre profil de mission</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/25">NASA CDSS</span>
      </div>

      {/* Protocol Quick-Buttons */}
      <div className="mb-3">
        <div className="text-[10px] font-mono text-slate-400 mb-1 uppercase">Protocoles d'évaluation rapide :</div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => handleSend("Pression rétro-orbitaire et flou visuel de près")} className="text-[11px] font-mono bg-[#111] hover:bg-[#1a1a1a] text-orange-300 px-2 py-1 rounded border border-slate-800">SANS / Vision</button>
          <button onClick={() => handleSend("Éruption cutanée et réactivation virale suspectée")} className="text-[11px] font-mono bg-[#111] hover:bg-[#1a1a1a] text-amber-300 px-2 py-1 rounded border border-slate-800">Immunité</button>
          <button onClick={() => handleSend("Céphalée frontale et taux CO2 élevé")} className="text-[11px] font-mono bg-[#111] hover:bg-[#1a1a1a] text-rose-300 px-2 py-1 rounded border border-slate-800">CO₂ Cabine</button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3 text-xs font-mono">
        {messages.map((m) => (
          <div key={m.id} className={`p-3 rounded-lg border ${m.sender === 'ASTRONAUT' ? 'bg-orange-500/[0.06] border-orange-500/25 ml-6 text-slate-200' : 'bg-[#101010] border-slate-800 mr-6 text-slate-300'}`}>
            <div className="flex justify-between items-center mb-1 text-[10px]">
              <span className="font-bold text-orange-400">{m.sender === 'ASTRONAUT' ? 'VOUS' : 'ASSISTANT'}</span>
              {m.triage && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] ${m.triage === 'URGENT' ? 'bg-rose-500/20 text-rose-300' : m.triage === 'EVALUATE' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {m.triage}
                </span>
              )}
            </div>
            <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
            {m.hazard && (
              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-orange-400 font-semibold">
                Danger NASA identifié : {m.hazard}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="text-xs font-mono text-orange-400 animate-pulse">Analyse en cours...</div>}
      </div>

      {/* Form Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 pt-2 border-t border-slate-800">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Décrivez vos symptômes..."
          className="flex-1 bg-[#111] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
        />
        <button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60 text-black font-bold px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-1">
          <span>Envoyer</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
