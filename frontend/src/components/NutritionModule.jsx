import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Bone, Check, CheckCircle2, Clock3, Droplets,
  Dumbbell, Gauge, LoaderCircle, Plus, RefreshCw, Search, Send,
  ShieldAlert, ShieldCheck, Trash2, Utensils, X,
} from 'lucide-react';
import {
  cancelMeal, getFoodInventory, getNutritionDayAnalysis, getNutritionRecommendations,
  getNutritionSummary, logHydration, logMeal, requestNutritionReview,
} from '../services/api';

const TABS = ['Summary', 'Journal', 'Catalog', 'Recommendations'];
const number = (value, digits = 0) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: digits });
const categoryName = (value) => String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const errorMessage = (error, fallback) => error.response?.data?.error || fallback;
const nutritionDateKey = (astronautId) => `astroguard:nutrition-day:${astronautId}`;
const getActiveNutritionDate = (astronautId) => {
  const actualToday = new Date().toISOString().slice(0, 10);
  const savedDate = window.localStorage.getItem(nutritionDateKey(astronautId));
  return savedDate && savedDate >= actualToday ? savedDate : actualToday;
};
const ANALYSIS_STEPS = [
  'Reading your meal journal…',
  'Calculating daily nutrients…',
  'Cross-checking recent biometric data…',
  'Evaluating potential risks…',
  'Preparing your interpretation…',
];
const RISK_ICONS = { bone: Bone, immunity: ShieldCheck, energy: Gauge, muscle: Dumbbell };
const RISK_STYLES = {
  Low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Moderate: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  High: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

function ProgressCard({ label, value, target, unit, limit = false }) {
  const hasTarget = Number(target) > 0;
  const percent = hasTarget ? (Number(value || 0) / Number(target)) * 100 : 0;
  const color = limit
    ? percent > 100 ? 'bg-rose-400' : percent >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
    : percent >= 100 ? 'bg-emerald-400' : percent < 50 ? 'bg-rose-400' : percent < 75 ? 'bg-amber-400' : 'bg-emerald-400';
  const textColor = color.replace('bg-', 'text-');
  return (
    <article className="border border-white/[0.09] bg-[#090b0c]/80 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.17em] text-slate-500">{label}{limit ? ' / Maximum' : ''}</p>
          <p className="mt-2 font-hud text-xl font-semibold text-white sm:text-2xl">{number(value, 1)} <span className="text-xs font-normal text-slate-500">{unit}</span></p>
        </div>
        {hasTarget && <span className={`font-mono text-[10px] ${textColor}`}>{Math.round(percent)}%</span>}
      </div>
      {hasTarget ? (
        <>
          <div className="mt-4 h-1.5 bg-white/[0.08]"><div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, percent)}%` }} /></div>
          <p className="mt-2 font-mono text-[9px] text-slate-600">{limit ? 'Limit' : 'Goal'} {number(target, 1)} {unit}</p>
        </>
      ) : <p className="mt-4 font-mono text-[9px] text-slate-600">Daily goal unavailable</p>}
    </article>
  );
}

function FoodCard({ food, onAdd, busy, showAdd = true }) {
  return (
    <article className="flex min-w-0 flex-col justify-between border border-white/[0.09] bg-[#090b0c]/80 p-4 transition hover:border-orange-400/30 sm:p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-orange-300">{categoryName(food.category)}</p>
            <h3 className="mt-2 text-sm font-semibold leading-5 text-white">{food.item_name}</h3>
          </div>
          <span className={`shrink-0 border px-2 py-1 font-mono text-[8px] uppercase tracking-wider ${food.stock_quantity > 0 ? 'border-emerald-500/20 text-emerald-300' : 'border-rose-500/25 text-rose-300'}`}>
            {food.stock_quantity > 0 ? `${food.stock_quantity} in stock` : 'Out of stock'}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/[0.08] pt-3 font-mono text-[9px] text-slate-400 sm:grid-cols-3">
          <span>{number(food.calories_kcal)} kcal</span><span>{number(food.protein_g, 1)} g protein</span><span>{number(food.sodium_mg, 1)} mg sodium</span>
          <span>{number(food.calcium_mg, 1)} mg calcium</span><span>{number(food.vitamin_d_iu, 1)} IU vitamin D</span>
          {Number(food.water_required_ml) > 0 && <span className="col-span-2 text-sky-300 sm:col-span-1">Add {number(food.water_required_ml)} ml water</span>}
        </div>
        <p className="mt-3 font-mono text-[8px] text-slate-600">Informational: {number(food.potassium_mg, 1)} mg potassium · {number(food.carbs_g, 1)} g carbs · {number(food.fat_g, 1)} g fat</p>
      </div>
      {showAdd && <button onClick={() => onAdd(food)} disabled={!food.stock_quantity || busy} className="mt-4 inline-flex items-center justify-center gap-2 border border-orange-400/45 px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-orange-200 transition hover:bg-orange-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Add this meal</button>}
    </article>
  );
}

export default function NutritionModule({ astronaut, onBack }) {
  const [tab, setTab] = useState('Summary');
  const [nutritionDate, setNutritionDate] = useState(() => getActiveNutritionDate(astronaut.id));
  const [catalog, setCatalog] = useState({ categories: [], meal_types: [], foods: [] });
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState('');
  const [mealType, setMealType] = useState('');
  const [portion, setPortion] = useState('1');
  const [water, setWater] = useState('0');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [analysisState, setAnalysisState] = useState('closed');
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [reviewBusy, setReviewBusy] = useState('');
  const [reviewNotice, setReviewNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [catalogResult, summaryResult] = await Promise.all([
        getFoodInventory('ALL', astronaut.access_token, nutritionDate),
        getNutritionSummary(astronaut.access_token, nutritionDate),
      ]);
      const nextCatalog = catalogResult.data;
      setCatalog(nextCatalog);
      setSummary(summaryResult.data);
      setRecommendations({ items: summaryResult.data.recommendations || [], objectives_reached: summaryResult.data.objectives_reached });
      setSelectedFood((current) => nextCatalog.foods.some((food) => String(food.id) === current && food.stock_quantity > 0)
        ? current : String(nextCatalog.foods.find((food) => food.stock_quantity > 0)?.id || ''));
      setMealType((current) => nextCatalog.meal_types.includes(current) ? current : nextCatalog.meal_types[0] || '');
    } catch (loadError) {
      setError(errorMessage(loadError, 'Nutrition data is temporarily unavailable.'));
    } finally {
      setLoading(false);
    }
  }, [astronaut.access_token, astronaut.id, nutritionDate]);

  useEffect(() => { refresh(); }, [refresh]);

  const foodsFiltered = useMemo(() => catalog.foods.filter((food) =>
    (category === 'ALL' || food.category === category)
    && food.item_name.toLowerCase().includes(search.trim().toLowerCase())), [catalog.foods, category, search]);

  const runAction = async (action, successMessage) => {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      await action();
      if (successMessage) setNotice(successMessage);
      await refresh();
    } catch (actionError) {
      setError(errorMessage(actionError, 'This nutrition action is temporarily unavailable.'));
    } finally {
      setBusy(false);
    }
  };

  const addFood = (food) => runAction(
    () => logMeal(food.id, mealType || catalog.meal_types[0] || 'DINNER', Number(portion), Number(water), astronaut.access_token, nutritionDate),
    `${food.item_name} added to your meal journal.`,
  );

  const loadRecommendations = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await getNutritionRecommendations(astronaut.access_token, nutritionDate);
      setRecommendations(response.data);
    } catch (recommendationError) {
      setError(errorMessage(recommendationError, 'Recommendations are temporarily unavailable.'));
    } finally { setBusy(false); }
  };

  useEffect(() => { if (tab === 'Recommendations' && !recommendations && !loading) loadRecommendations(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelLoggedMeal = (meal) => runAction(
    () => cancelMeal(meal.id, astronaut.access_token),
    `${meal.food_name} was removed and its stock restored.`,
  );

  const startDayAnalysis = async () => {
    setNotice('');
    setError('');
    if (!summary?.meals?.length) {
      setNotice('Log at least one meal today before starting the analysis.');
      return;
    }
    setAnalysisData(null);
    setAnalysisError('');
    setReviewNotice('');
    setAnalysisState('loading');
    setAnalysisProgress(0);
    const startedAt = Date.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const request = getNutritionDayAnalysis(astronaut.access_token, nutritionDate)
      .then((response) => ({ data: response.data }))
      .catch((requestError) => ({ error: requestError }));
    for (let index = 0; index < ANALYSIS_STEPS.length; index += 1) {
      setAnalysisStep(index);
      setAnalysisProgress(Math.round(((index + 1) / ANALYSIS_STEPS.length) * 100));
      await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 40 : 800));
    }
    const result = await request;
    const remainingTime = Math.max(0, 4000 - (Date.now() - startedAt));
    if (remainingTime) await new Promise((resolve) => window.setTimeout(resolve, remainingTime));
    if (result.error) {
      if (result.error.response?.data?.code === 'no_meals') {
        setAnalysisState('closed');
        setNotice(result.error.response.data.error || 'Log at least one meal today before starting the analysis.');
      } else {
        setAnalysisError(errorMessage(result.error, 'The day analysis could not be completed. Check your connection and try again.'));
        setAnalysisState('error');
      }
      return;
    }
    setAnalysisData(result.data);
    if (result.data.next_day) {
      window.localStorage.setItem(nutritionDateKey(astronaut.id), result.data.next_day);
      setNutritionDate(result.data.next_day);
      setNotice('A new nutrition day has started. Today’s intake is back to zero; entries from the completed day are preserved.');
    }
    setAnalysisState('results');
  };

  const closeAnalysis = () => {
    setAnalysisState('closed');
    setAnalysisError('');
    setTab('Summary');
  };

  const handleDomainReview = async (domain) => {
    setReviewBusy(domain.id);
    setAnalysisError('');
    setReviewNotice('');
    try {
      await requestNutritionReview(`${domain.title} / ${domain.level}`, domain.explanation, astronaut.access_token);
      setReviewNotice(`Review requested for ${domain.title.toLowerCase()}.`);
    } catch (reviewError) {
      setAnalysisError(errorMessage(reviewError, 'The review request could not be sent right now.'));
    } finally {
      setReviewBusy('');
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-6">
        <div>
          <button onClick={onBack} className="mb-5 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 transition hover:text-orange-300">← Back to mission control</button>
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-orange-300"><Utensils className="h-3.5 w-3.5" /> Phase 2 / Crew nutrition</p>
          <h1 className="mt-3 font-hud text-3xl font-semibold uppercase tracking-[-0.05em] text-white sm:text-5xl">Nutrition & meal management</h1>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">{astronaut.full_name} · {summary?.date || 'Today'}</p>
        </div>
        <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-300 transition hover:border-orange-400/40 hover:text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Nutrition sections">
        {TABS.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`border px-4 py-2 font-mono text-[9px] uppercase tracking-[0.12em] transition ${tab === item ? 'border-orange-400 bg-orange-500 text-black' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25 hover:text-white'}`}>{item}</button>)}
      </div>

      <p className="mb-5 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-slate-500"><Activity className="h-3 w-3 text-orange-400" /> Simulated nutrition values</p>
      {notice && <div role="status" className="mb-4 flex items-center gap-2 border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-200"><Check className="h-4 w-4" />{notice}</div>}
      {error && <div role="alert" className="mb-4 flex items-start gap-2 border border-rose-500/25 bg-rose-950/20 p-3 text-xs text-rose-200"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {loading && !summary ? <div className="flex min-h-56 items-center justify-center gap-3 border border-white/10 bg-[#090b0c]/80 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin text-orange-300" /> Loading crew nutrition data…</div> : (
        <>
          {tab === 'Summary' && summary && <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div><h2 className="font-hud text-xl font-semibold uppercase text-white">Today’s intake</h2><p className="mt-1 text-xs text-slate-500">Totals are calculated from your meal journal and hydration logs.</p></div>
              {summary.targets.is_eva_day && <span className="border border-orange-400/40 bg-orange-500/10 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-orange-200">EVA day</span>}
              <button onClick={startDayAnalysis} disabled={loading || analysisState === 'loading'} className="inline-flex items-center gap-2 border border-orange-400 bg-orange-500 px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-orange-400 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> I’m done for today</button>
              <button onClick={() => runAction(() => logHydration(250, astronaut.access_token, nutritionDate), '250 ml of water logged.')} disabled={busy} className="inline-flex items-center gap-2 border border-sky-400/30 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-sky-200 transition hover:bg-sky-400/10 disabled:opacity-50"><Droplets className="h-3.5 w-3.5" /> +250 ml water</button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <ProgressCard label="Calories" value={summary.consumed.calories_kcal} target={summary.targets.target_calories_kcal} unit="kcal" />
              <ProgressCard label="Protein" value={summary.consumed.protein_g} target={summary.targets.target_protein_g} unit="g" />
              <ProgressCard label="Water" value={summary.consumed.water_ml} target={summary.targets.target_water_ml} unit="ml" />
              <ProgressCard label="Calcium" value={summary.consumed.calcium_mg} target={summary.targets.target_calcium_mg} unit="mg" />
              <ProgressCard label="Vitamin D" value={summary.consumed.vitamin_d_iu} target={summary.targets.target_vitamin_d_iu} unit="IU" />
              <ProgressCard label="Sodium" value={summary.consumed.sodium_mg} target={summary.targets.max_sodium_mg} unit="mg" limit />
            </div>
            <div className="mt-4 border border-white/[0.08] bg-white/[0.02] p-4 font-mono text-[9px] text-slate-500">Informational totals: {number(summary.consumed.potassium_mg, 1)} mg potassium · {number(summary.consumed.carbs_g, 1)} g carbohydrates · {number(summary.consumed.fat_g, 1)} g fat</div>
            {!summary.hydration_available && <p className="mt-3 text-[10px] leading-5 text-slate-500">Water from meals and rehydratable dishes is included. Standalone water logging will be available after the optional Supabase table is installed.</p>}
          </section>}

          {tab === 'Journal' && <section className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
            <form onSubmit={(event) => { event.preventDefault(); const food = catalog.foods.find((item) => String(item.id) === selectedFood); if (food) addFood(food); }} className="h-fit border border-white/10 bg-[#090b0c]/80 p-5 sm:p-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-orange-300">Meal entry</p><h2 className="mt-2 font-hud text-xl font-semibold uppercase text-white">Log a meal</h2>
              <label className="mt-5 block font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Food item<select value={selectedFood} onChange={(event) => setSelectedFood(event.target.value)} className="mt-2 w-full border border-white/10 bg-black/50 p-3 text-xs text-white outline-none focus:border-orange-400/50" required><option value="">Select an available food</option>{catalog.foods.filter((food) => food.stock_quantity > 0).map((food) => <option key={food.id} value={food.id}>{food.item_name} · {food.stock_quantity} in stock</option>)}</select></label>
              <div className="mt-4 grid grid-cols-2 gap-3"><label className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Portion<select value={portion} onChange={(event) => setPortion(event.target.value)} className="mt-2 w-full border border-white/10 bg-black/50 p-3 text-xs text-white"><option value="0.5">0.5</option><option value="1">1</option><option value="2">2</option></select></label><label className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Meal type<select value={mealType} onChange={(event) => setMealType(event.target.value)} className="mt-2 w-full border border-white/10 bg-black/50 p-3 text-xs text-white" required>{catalog.meal_types.map((type) => <option key={type} value={type}>{categoryName(type)}</option>)}</select></label></div>
              <label className="mt-4 block font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Water consumed with meal (ml)<input type="number" min="0" max="5000" step="50" value={water} onChange={(event) => setWater(event.target.value)} className="mt-2 w-full border border-white/10 bg-black/50 p-3 text-xs text-white" /></label>
              <button type="submit" disabled={busy || !selectedFood || !catalog.meal_types.length} className="mt-5 flex w-full items-center justify-center gap-2 bg-orange-500 px-4 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-black transition hover:bg-orange-400 disabled:opacity-50"><Plus className="h-4 w-4" /> Add to today’s journal</button>
              <p className="mt-3 text-[9px] leading-4 text-slate-600">Stock is reserved transactionally when this entry is saved. A half portion uses one inventory pack.</p>
            </form>
            <div><div className="mb-4 flex items-center justify-between"><div><h2 className="font-hud text-xl font-semibold uppercase text-white">Today’s meals</h2><p className="mt-1 text-xs text-slate-500">{summary?.meals?.length || 0} logged</p></div></div>
              {!summary?.meals?.length ? <div className="border border-white/10 bg-[#090b0c]/70 px-5 py-12 text-center"><Clock3 className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">No meals logged today</p></div> : <div className="space-y-2">{summary.meals.map((meal) => <article key={meal.id} className="flex flex-wrap items-center justify-between gap-4 border border-white/[0.08] bg-[#090b0c]/75 p-4"><div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-orange-400/20 text-orange-300"><Utensils className="h-3.5 w-3.5" /></div><div className="min-w-0"><p className="truncate text-xs font-medium text-white">{meal.food_name}</p><p className="mt-1 font-mono text-[8px] uppercase text-slate-500">{categoryName(meal.meal_type)} · {number(meal.portion_size, 1)} portion · {new Date(meal.logged_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {number(meal.calories_kcal)} kcal</p></div></div><button onClick={() => cancelLoggedMeal(meal)} disabled={busy} className="inline-flex items-center gap-1.5 border border-white/10 px-3 py-2 font-mono text-[8px] uppercase tracking-wider text-slate-400 transition hover:border-rose-400/40 hover:text-rose-200 disabled:opacity-50"><Trash2 className="h-3 w-3" /> Cancel</button></article>)}</div>}
            </div>
          </section>}

          {tab === 'Catalog' && <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-hud text-xl font-semibold uppercase text-white">Available food inventory</h2><p className="mt-1 text-xs text-slate-500">Nutritional information per serving.</p></div><label className="flex items-center gap-2 border border-white/10 bg-black/30 px-3"><Search className="h-3.5 w-3.5 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search foods" className="w-40 bg-transparent py-2.5 text-xs text-white outline-none placeholder:text-slate-600 sm:w-56" /></label></div>
            <div className="mb-4 flex flex-wrap gap-2"><button onClick={() => setCategory('ALL')} className={`border px-3 py-2 font-mono text-[8px] uppercase tracking-wider ${category === 'ALL' ? 'border-orange-400 bg-orange-500 text-black' : 'border-white/10 text-slate-400'}`}>All</button>{catalog.categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`border px-3 py-2 font-mono text-[8px] uppercase tracking-wider ${category === item ? 'border-orange-400 bg-orange-500 text-black' : 'border-white/10 text-slate-400'}`}>{categoryName(item)}</button>)}</div>
            {!foodsFiltered.length ? <div className="border border-white/10 bg-[#090b0c]/70 px-5 py-12 text-center text-xs text-slate-500">No food items match this category or search.</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{foodsFiltered.map((food) => <FoodCard key={food.id} food={food} onAdd={addFood} busy={busy} />)}</div>}
          </section>}

          {tab === 'Recommendations' && <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-orange-300">Personalized from remaining daily targets</p><h2 className="mt-2 font-hud text-xl font-semibold uppercase text-white">Recommended meals</h2></div><button onClick={loadRecommendations} disabled={busy} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-300 hover:border-orange-400/40"><RefreshCw className="h-3.5 w-3.5" /> Recalculate</button></div>
            {recommendations?.objectives_reached ? <div className="border border-emerald-500/25 bg-emerald-950/15 p-6 text-sm text-emerald-200">Today’s nutrition objectives have been reached.</div> : !recommendations?.items?.length ? <div className="border border-white/10 bg-[#090b0c]/70 p-6 text-xs text-slate-400">{recommendations?.message || 'No suitable food is currently available in stock.'}</div> : <><div className="mb-4 border border-white/[0.08] bg-[#090b0c]/70 p-4 font-mono text-[9px] text-slate-400">Remaining today: {number(summary?.remaining?.calories_kcal)} kcal · {number(summary?.remaining?.protein_g, 1)} g protein · {number(summary?.remaining?.calcium_mg, 1)} mg calcium · {number(summary?.remaining?.vitamin_d_iu, 1)} IU vitamin D · {number(summary?.remaining?.water_ml)} ml water</div><div className="grid gap-3 lg:grid-cols-3">{recommendations.items.map((food) => <div key={food.id}><FoodCard food={food} onAdd={addFood} busy={busy} /><p className="border-x border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[10px] leading-5 text-slate-400">{food.explanation}</p></div>)}</div></>}
          </section>}
        </>
      )}

      {analysisState !== 'closed' && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 px-3 py-5 backdrop-blur-md sm:px-6 sm:py-8" role="dialog" aria-modal="true" aria-labelledby="day-analysis-title">
        <div className="relative mx-auto w-full max-w-6xl border border-white/15 bg-[#080a0b] shadow-[0_30px_120px_rgba(0,0,0,.75)]">
          <div className="h-px bg-gradient-to-r from-orange-400 via-orange-500/40 to-transparent" />
          <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <div><p className="font-mono text-[8px] uppercase tracking-[0.2em] text-orange-300">Crew nutrition / end-of-day report</p><h2 id="day-analysis-title" className="mt-1 font-hud text-lg font-semibold uppercase text-white sm:text-xl">Daily nutrition analysis</h2></div>
            <button onClick={closeAnalysis} aria-label="Close analysis" className="flex h-9 w-9 items-center justify-center border border-white/10 text-slate-400 transition hover:border-orange-400/40 hover:text-white"><X className="h-4 w-4" /></button>
          </header>

          {analysisState === 'loading' ? <div className="mx-auto max-w-xl px-5 py-16 text-center sm:py-24" aria-live="polite">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-orange-400/30 bg-orange-500/[0.06] text-orange-300"><Activity className="h-6 w-6" /></div>
            <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.2em] text-orange-300">Analysis in progress / {analysisProgress}%</p>
            <h3 className="mt-3 font-hud text-2xl font-semibold text-white">Reviewing your day</h3>
            <div className="mt-7 h-1.5 bg-white/10"><div className="h-full bg-orange-400 motion-reduce:transition-none" style={{ width: `${analysisProgress}%`, transition: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'width 700ms ease' }} /></div>
            <div className="mt-6 space-y-2 text-left">{ANALYSIS_STEPS.map((step, index) => <p key={step} className={`flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.08em] ${index === analysisStep ? 'text-white' : index < analysisStep ? 'text-orange-300/70' : 'text-slate-700'}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${index === analysisStep ? 'bg-orange-400 motion-safe:animate-pulse motion-reduce:animate-none' : index < analysisStep ? 'bg-orange-400/60' : 'bg-white/10'}`} />{step}</p>)}</div>
          </div> : analysisState === 'error' ? <div className="px-5 py-12 sm:px-7">
            <div role="alert" className="border border-rose-500/25 bg-rose-950/20 p-4 text-sm text-rose-200">{analysisError}</div>
            <button onClick={closeAnalysis} className="mt-5 border border-white/15 px-4 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-300 hover:border-orange-400/40">Close</button>
          </div> : analysisData && <div className="px-4 py-5 sm:px-7 sm:py-7">
            {reviewNotice && <p role="status" className="mb-4 border border-emerald-500/25 bg-emerald-950/20 p-3 text-xs text-emerald-200">{reviewNotice}</p>}
            {analysisError && <p role="alert" className="mb-4 border border-rose-500/25 bg-rose-950/20 p-3 text-xs text-rose-200">{analysisError}</p>}
            <div className="mb-6 grid gap-5 border border-white/10 bg-white/[0.02] p-5 sm:grid-cols-[1fr_220px] sm:items-center sm:p-7">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-orange-300">Overall assessment / {analysisData.overall_level}</p><h3 className="mt-2 font-hud text-2xl font-semibold leading-tight text-white sm:text-3xl">{analysisData.verdict}</h3>
                {analysisData.is_eva_day && <p className="mt-3 inline-flex border border-orange-400/35 bg-orange-500/10 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-orange-200">EVA day · stricter thresholds applied</p>}
                {!analysisData.biometrics_available && <p className="mt-3 text-xs text-amber-200">No biometric data available. This report uses nutrition data only.</p>}
              </div>
              <div><div className="flex items-end justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500"><span>Daily coverage score</span><span className="text-lg text-white">{analysisData.score}%</span></div><div className="mt-3 h-2 bg-white/10"><div className="h-full bg-gradient-to-r from-orange-600 to-orange-300" style={{ width: `${analysisData.score}%` }} /></div><p className="mt-2 font-mono text-[8px] text-slate-600">Based on calories, protein, calcium, vitamin D, and water</p></div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {analysisData.domains.map((domain) => {
                const Icon = RISK_ICONS[domain.id] || AlertTriangle;
                const canRequestReview = analysisData.reviews_available && domain.level !== 'Low';
                return <article key={domain.id} className="border border-white/10 bg-[#090b0c]/85">
                  <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-4 sm:p-5"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-orange-400/20 bg-orange-500/[0.05] text-orange-300"><Icon className="h-5 w-5" /></div><div><h4 className="font-hud text-base font-semibold uppercase text-white">{domain.title}</h4><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">{domain.id === 'muscle' ? 'Nutrition-only estimate' : 'Potential nutrition-related risk'}</p></div></div><span className={`shrink-0 border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] ${RISK_STYLES[domain.level]}`}>{domain.level}</span></div>
                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-wrap gap-2">{domain.metrics.map((metric) => <span key={metric.label} className="border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.07em] text-slate-400">{metric.label}: <strong className="text-white">{number(metric.percent, 1)}%</strong></span>)}</div>
                    <p className="text-xs leading-5 text-slate-300">{domain.explanation}</p>
                    <div className="border-l border-orange-400/40 pl-3 text-[10px] leading-5 text-slate-400">{domain.long_term}</div>
                    {domain.biometric_notes.map((note) => <p key={note} className="font-mono text-[9px] leading-5 text-sky-200/80">{note}</p>)}
                    <div><p className="mb-2 font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-orange-300">To improve tomorrow</p>{domain.recommendations.length ? <div className="space-y-2">{domain.recommendations.map((food) => <div key={food.id} className="border border-white/[0.07] bg-black/20 px-3 py-2"><div className="flex flex-wrap justify-between gap-2"><span className="text-[10px] text-white">{food.item_name}</span><span className="font-mono text-[8px] text-emerald-300">{food.stock_quantity} in stock</span></div><p className="mt-1 text-[9px] leading-4 text-slate-500">{food.explanation}</p></div>)}</div> : <p className="text-[10px] text-slate-500">No suitable food is currently available in stock.</p>}</div>
                    {domain.level !== 'Low' && (canRequestReview
                      ? <button onClick={() => handleDomainReview(domain)} disabled={Boolean(reviewBusy)} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 font-mono text-[8px] uppercase tracking-wider text-slate-300 transition hover:border-orange-400/40 hover:text-white disabled:opacity-50"><Send className="h-3 w-3" />{reviewBusy === domain.id ? 'Sending request…' : 'Request a review'}</button>
                      : <p className="font-mono text-[8px] leading-4 text-slate-600">Review requests are unavailable until the optional nutrition_reviews table is installed.</p>)}
                  </div>
                </article>;
              })}
            </div>

            {analysisData.additional_information.map((item) => <p key={item.nutrient} className="mt-4 border border-sky-500/20 bg-sky-950/10 p-3 text-[10px] leading-5 text-sky-100/80">{item.message}</p>)}
            <details className="mt-5 border border-white/10 bg-white/[0.02]">
              <summary className="cursor-pointer px-4 py-3 font-mono text-[8px] uppercase tracking-[0.14em] text-slate-400">Daily nutrient totals</summary>
              <div className="overflow-x-auto border-t border-white/[0.08]"><table className="w-full min-w-[540px] text-left font-mono text-[9px]"><thead className="text-slate-600"><tr><th className="p-3">Nutrient</th><th className="p-3">Consumed</th><th className="p-3">Goal / max</th><th className="p-3">Coverage</th></tr></thead><tbody>{Object.entries(analysisData.macros).map(([key, metric]) => <tr key={key} className="border-t border-white/[0.06] text-slate-300"><td className="p-3">{metric.label}</td><td className="p-3">{number(metric.consumed, 1)} {metric.unit}</td><td className="p-3">{metric.target == null ? 'Informational only' : `${number(metric.target, 1)} ${metric.unit}`}</td><td className="p-3">{metric.percent == null ? '—' : `${number(metric.percent, 1)}%`}</td></tr>)}</tbody></table></div>
            </details>
            <div className="mt-5 border-t border-white/10 pt-4 text-[9px] leading-5 text-slate-500"><p>{analysisData.hrp_context}</p></div>
            <div className="mt-6 flex justify-end"><button onClick={closeAnalysis} className="inline-flex items-center gap-2 bg-orange-500 px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-black transition hover:bg-orange-400"><X className="h-3.5 w-3.5" /> Close / return to summary</button></div>
          </div>}
        </div>
      </div>}
    </div>
  );
}
