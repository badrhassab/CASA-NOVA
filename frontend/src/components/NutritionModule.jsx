import React, { useState, useEffect } from 'react';
import { PieChart, Utensils, AlertCircle, PlusCircle, CheckCircle2 } from 'lucide-react';
import { getFoodInventory, getNutritionSummary, logMeal } from '../services/api';

export default function NutritionModule({ activeAstronautId }) {
  const [category, setCategory] = useState('ALL');
  const [foods, setFoods] = useState([
    { id: 'f1', item_name: 'Poulet Teriyaki & Riz Lyophilisé', category: 'REHYDRATABLE', calories_kcal: 460, protein_g: '34.0', sodium_mg: '480.0', vitamin_d_iu: '150.0', stock_quantity: 84 },
    { id: 'f2', item_name: 'Bœuf Mijoté Thermostabilisé & Légumes', category: 'THERMOSTABILIZED', calories_kcal: 380, protein_g: '29.0', sodium_mg: '410.0', vitamin_d_iu: '120.0', stock_quantity: 65 },
    { id: 'f3', item_name: 'Mélange Amandes & Canneberges Séchées', category: 'READY_TO_EAT', calories_kcal: 290, protein_g: '8.5', sodium_mg: '95.0', vitamin_d_iu: '80.0', stock_quantity: 120 },
    { id: 'f5', item_name: 'Pochette Saumon Sauvage Oméga-3', category: 'THERMOSTABILIZED', calories_kcal: 310, protein_g: '32.0', sodium_mg: '380.0', vitamin_d_iu: '650.0', stock_quantity: 78 }
  ]);
  const [consumed, setConsumed] = useState({
    calories: 1860,
    protein: 87,
    water: 1900,
    sodium: 1280,
    calcium: 580,
    vitd: 470
  });

  const handleConsume = async (food) => {
    try {
      await logMeal(activeAstronautId, food.id, 'DINNER', 1.0, 300);
    } catch (e) {
      // Offline fallback
    }
    setConsumed(prev => ({
      ...prev,
      calories: prev.calories + food.calories_kcal,
      protein: prev.protein + parseFloat(food.protein_g),
      sodium: prev.sodium + parseFloat(food.sodium_mg),
      vitd: prev.vitd + parseFloat(food.vitamin_d_iu)
    }));
  };

  const filteredFoods = category === 'ALL' ? foods : foods.filter(f => f.category === category);

  return (
    <div className="space-y-6 font-mono">
      {/* Top Cards: Targets & Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 hud-panel p-5">
          <div className="hud-corner-tl" /><div className="hud-corner-br" />
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-xs uppercase text-cyan-400 flex items-center gap-1.5">
                <PieChart className="w-4 h-4" /> Bilan Nutritionnel Quotidien
              </span>
              <h2 className="text-lg font-bold font-hud text-white">Apports & Objectifs Individuels</h2>
            </div>
            <span className="px-2.5 py-1 text-xs rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Journée avec EVA : +500 kcal
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Calories</span>
                <span className="text-cyan-400 font-bold">{consumed.calories} / 3100 kcal</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-cyan-400 h-2 rounded-full" style={{ width: `${Math.min(100, (consumed.calories / 3100) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Protéines</span>
                <span className="text-emerald-400 font-bold">{consumed.protein} / 125 g</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${Math.min(100, (consumed.protein / 125) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span title="Plafond pour limiter l'aggravation du SANS">Sodium (Plafond SANS)</span>
                <span className="text-amber-400 font-bold">{consumed.sodium} / 2000 mg</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${Math.min(100, (consumed.sodium / 2000) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Calcium</span>
                <span className="text-purple-400 font-bold">{consumed.calcium} / 1200 mg</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${Math.min(100, (consumed.calcium / 1200) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Vitamine D3</span>
                <span className="text-rose-400 font-bold">{consumed.vitd} / 1000 UI</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-rose-400 h-2 rounded-full" style={{ width: `${Math.min(100, (consumed.vitd / 1000) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Eau</span>
                <span className="text-blue-400 font-bold">{consumed.water} / 2800 ml</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${Math.min(100, (consumed.water / 2800) * 100)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Alerte Médicale Nutritionnelle HRP :</span>
              <p className="mt-0.5 text-slate-300">Déficit persistant en Vitamine D3 et Calcium. Risque de résorption osseuse trabéculaire sous microgravité. Repas riche en Vitamine D3 recommandé.</p>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Recommended Meal */}
        <div className="lg:col-span-4 hud-panel p-5 flex flex-col justify-between">
          <div className="hud-corner-tl" /><div className="hud-corner-br" />
          <div>
            <span className="text-xs uppercase text-cyan-400 block mb-1">Recommandation Intelligente</span>
            <h3 className="text-base font-bold font-hud text-white mb-2">Pochette Saumon Sauvage Oméga-3</h3>
            <p className="text-xs text-slate-400 mb-3">Recommandé spécifiquement pour combler le déficit en Vitamine D3 (+650 UI) sans excès de sodium.</p>
            <div className="bg-slate-900/90 p-3 rounded border border-cyan-500/30 text-xs space-y-1">
              <div>Catégorie : Thermostabilisé (Prêt à réchauffer)</div>
              <div>Calories : 310 kcal • Protéines : 32g • Sodium : 380 mg</div>
            </div>
          </div>
          <button 
            onClick={() => handleConsume(foods[3])}
            className="mt-4 w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-2 rounded text-xs flex items-center justify-center gap-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" /> Consommer ce Repas Recommandé
          </button>
        </div>
      </div>

      {/* Rations Inventory List */}
      <div className="hud-panel p-5">
        <div className="hud-corner-tl" /><div className="hud-corner-br" />
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs uppercase text-cyan-400 flex items-center gap-1.5"><Utensils className="w-4 h-4" /> Ravitaillement & Rations Spatiales</span>
            <h3 className="text-base font-bold font-hud text-white">Stock Alimentaire Disponible</h3>
          </div>
          <div className="flex gap-1 text-[11px]">
            <button onClick={() => setCategory('ALL')} className={`px-2 py-1 rounded border ${category === 'ALL' ? 'bg-cyan-950 text-cyan-300 border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>Tous</button>
            <button onClick={() => setCategory('REHYDRATABLE')} className={`px-2 py-1 rounded border ${category === 'REHYDRATABLE' ? 'bg-cyan-950 text-cyan-300 border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>Lyophilisés</button>
            <button onClick={() => setCategory('THERMOSTABILIZED')} className={`px-2 py-1 rounded border ${category === 'THERMOSTABILIZED' ? 'bg-cyan-950 text-cyan-300 border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>Thermostabilisés</button>
            <button onClick={() => setCategory('READY_TO_EAT')} className={`px-2 py-1 rounded border ${category === 'READY_TO_EAT' ? 'bg-cyan-950 text-cyan-300 border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>Prêts à l'emploi</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFoods.map(food => (
            <div key={food.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-slate-200">{food.item_name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Catégorie: <span className="text-cyan-400">{food.category}</span> • {food.calories_kcal} kcal • Prot: {food.protein_g}g • Stock: {food.stock_quantity}
                </div>
              </div>
              <button onClick={() => handleConsume(food)} className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded border border-slate-700 text-xs">
                Consommer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
