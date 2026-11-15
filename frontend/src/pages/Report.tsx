import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Header } from '../components/Header';
import { useAllDays, useTopRecommendations, addNextDay, weekOf } from '../db/queries';
import type { DailyCheckin } from '../db/db';
import { STATUS_COLORS, statusFromScore } from '../lib/scoring';
import { BASELINE } from '../lib/scoring';
import type { Status } from '../types';

const DOMAINS = [
  { key: 'scoreBone', label: 'BONE & MUSCLE' },
  { key: 'scoreHeart', label: 'HEART & FLUIDS' },
  { key: 'scoreImmune', label: 'IMMUNE & RADIATION' },
  { key: 'scoreMind', label: 'MIND & BEHAVIOR' },
] as const;
type DomainKey = typeof DOMAINS[number]['key'];
const statusLabel: Record<Status, string> = { green: 'NOMINAL', yellow: 'WATCH', orange: 'ELEVATED', red: 'CRITICAL' };
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const chartAxis = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fill: 'var(--muted)' };
const selectStyle: React.CSSProperties = { ...mono, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', padding: '7px 8px', borderRadius: 0 };
const tableHead: React.CSSProperties = { textAlign: 'left', color: 'var(--muted)', fontWeight: 400, padding: '9px 8px', borderBottom: '1px solid var(--border)' };

export const Report: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rows = useAllDays();
  const days = useMemo(() => [...(rows ?? [])].sort((a, b) => a.day - b.day), [rows]);
  const weeks = useMemo(() => [...new Set(days.map(day => weekOf(day.day)))].sort((a, b) => a - b), [days]);
  const [week, setWeek] = useState<number | null>(() => {
    const requested = Number(searchParams.get('week'));
    return searchParams.has('week') && Number.isInteger(requested) ? requested : null;
  });
  const selectedWeek = week != null && weeks.includes(week) ? week : (weeks.at(-1) ?? 0);
  const current = days.filter(day => weekOf(day.day) === selectedWeek);
  const previous = days.filter(day => weekOf(day.day) === selectedWeek - 1);
  const average = (arr: DailyCheckin[], key: 'scoreOverall' | DomainKey) => arr.length ? arr.reduce((sum, row) => sum + row[key], 0) / arr.length : 0;
  const overall = average(current, 'scoreOverall');
  const previousOverall = average(previous, 'scoreOverall');
  const delta = selectedWeek === 0 || !previous.length ? null : overall - previousOverall;
  const status = statusFromScore(overall);
  const recommendations = useTopRecommendations(selectedWeek, 3);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);
  const weekA = compareA != null && weeks.includes(compareA) ? compareA : Math.max(0, selectedWeek - 1);
  const weekB = compareB != null && weeks.includes(compareB) ? compareB : selectedWeek;
  const [comparisonView, setComparisonView] = useState<'BARS' | 'RADAR' | 'TREND'>('BARS');
  const [visibleDomains, setVisibleDomains] = useState<Set<DomainKey>>(() => new Set(DOMAINS.map(domain => domain.key)));
  const [detailDomain, setDetailDomain] = useState<DomainKey | null>(null);
  const [metric, setMetric] = useState<'HR'|'HRV'|'SLEEP H'|'MOOD'>('HR');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [addToast, setAddToast] = useState<string | null>(null);
  const compareRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const sections = root.querySelectorAll<HTMLElement>('.report-entrance');
      if (reducedMotion) {
        gsap.set(sections, { opacity: 1, y: 0 });
        if (scoreRef.current) scoreRef.current.textContent = String(Math.round(overall));
        return;
      }
      gsap.fromTo(sections, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' });
      if (scoreRef.current) {
        const counter = { value: 0 };
        gsap.to(counter, { value: overall, duration: 0.8, ease: 'power2.out', onUpdate: () => { if (scoreRef.current) scoreRef.current.textContent = String(Math.round(counter.value)); } });
      }
    }, root);
    return () => ctx.revert();
  }, [selectedWeek, overall, reducedMotion]);

  useEffect(() => {
    const root = compareRef.current;
    if (!root || reducedMotion) return;
    const context = gsap.context(() => gsap.fromTo(root.querySelectorAll('tbody tr'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.05 }), root);
    return () => context.revert();
  }, [weekA, weekB, comparisonView, detailDomain, reducedMotion]);

  if (!rows) return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}><Header /></div>;
  if (!days.length) return <Shell><Header /><main style={{ maxWidth: 1280, width: '100%', margin: 'auto', padding: 32 }}><h1>Weekly Report</h1><p>No check-in data is available yet.</p><Link to="/checkin">Go to Daily Check-in</Link></main></Shell>;

  const start = current[0];
  const end = current[current.length - 1];
  const chartData = days.map(row => ({ day: row.day, score: row.scoreOverall, status: row.status }));
  const compareDaysA = days.filter(day => weekOf(day.day) === weekA);
  const compareDaysB = days.filter(day => weekOf(day.day) === weekB);
  const compareData = DOMAINS.map(domain => ({ label: domain.label.split(' ')[0], domain: domain.key, A: average(compareDaysA, domain.key), B: average(compareDaysB, domain.key) }));
  const worst = [...DOMAINS].map(domain => ({ label: domain.label, score: average(current, domain.key), why: current.map(row => row.reasons[domain.key.slice(5).toLowerCase() as 'bone'|'heart'|'immune'|'mind']?.why).find(Boolean) ?? 'Within your baseline' })).sort((a, b) => a.score - b.score)[0];
  const dateRange = start && end ? `${start.date} – ${end.date}` : '';
  const metricBaseline = { HR: BASELINE.hr, HRV: BASELINE.hrv, 'SLEEP H': BASELINE.sleepHours, MOOD: BASELINE.mood }[metric];
  const metricData = days.map(row => ({ day: row.day, weekIndex: weekOf(row.day), value: metric === 'HR' ? row.sensors.hr : metric === 'HRV' ? row.sensors.hrv : metric === 'SLEEP H' ? row.sensors.sleepHours : row.answers.mood }));
  const alerts = current.filter(row => row.status === 'orange' || row.status === 'red');
  const selectedDayRow = selectedDay == null ? null : days.find(row => row.day === selectedDay) ?? null;

  return <Shell><Header /><main ref={rootRef} style={{ maxWidth: 1280, width: '100%', margin: '0 auto', padding: '32px 32px 60px' }}>
    <header className="report-entrance" style={{ marginBottom: 28 }}>
      <h1 style={{ margin: 0, fontSize: 'clamp(2.5rem,5vw,4.5rem)', letterSpacing: '-0.04em', lineHeight: .98 }}><span style={{ color: 'var(--muted)', display: 'block' }}>Weekly</span><strong style={{ display: 'block', fontWeight: 650 }}>Report</strong></h1>
      <div style={{ ...mono, color: 'var(--muted)', fontSize: 11, letterSpacing: '.1em', marginTop: 16 }}>W{selectedWeek + 1} · DAY {current[0]?.day ?? 0}-{current[current.length - 1]?.day ?? 0} · {dateRange}</div>
    </header>

    <WeekSelector weeks={weeks} days={days} selected={selectedWeek} onSelect={setWeek} />

    <section className="report-entrance" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '30px 0', borderBottom: '1px solid var(--border)' }}>
      <ScoreHero scoreRef={scoreRef} score={overall} status={status} delta={delta} previousWeek={selectedWeek} />
      <div style={{ alignSelf: 'center' }}><SmallLabel>WHY THIS WEEK</SmallLabel><p style={{ lineHeight: 1.5 }}>{worst?.why ?? 'Within your baseline'}</p><SmallLabel>RECOMMENDED FOCUS</SmallLabel><p>{recommendations[0]?.action ?? 'Keep current routine'}</p></div>
    </section>

    <section className="report-entrance" style={{ margin: '28px 0 40px' }}>{DOMAINS.map(domain => <DomainRow key={domain.key} domain={domain} days={current} previous={previous} average={average} />)}</section>

    <section className="report-entrance" style={{ marginBottom: 44 }}><SmallLabel>DAILY OVERALL SCORE</SmallLabel><div style={{ width: '100%', height: 300, marginTop: 12 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 15, right: 18, bottom: 4, left: 0 }}><CartesianGrid vertical={false} stroke="var(--muted)" strokeOpacity={0.12} /><XAxis dataKey="day" tick={chartAxis} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={chartAxis} axisLine={false} tickLine={false} /><Tooltip content={<ReportTooltip />} /><ReferenceLine y={80} stroke={STATUS_COLORS.green} strokeDasharray="3 5" label={{ value: 'GREEN', fill: 'var(--muted)', fontSize: 9 }} /><ReferenceLine y={65} stroke={STATUS_COLORS.yellow} strokeDasharray="3 5" label={{ value: 'YELLOW', fill: 'var(--muted)', fontSize: 9 }} /><ReferenceLine y={50} stroke={STATUS_COLORS.orange} strokeDasharray="3 5" label={{ value: 'ORANGE', fill: 'var(--muted)', fontSize: 9 }} />{weeks.slice(1).map(w => <ReferenceLine key={w} x={w * 7} stroke="var(--muted)" strokeDasharray="5 5" label={{ value: `W${w + 1}`, fill: 'var(--muted)', fontSize: 10 }} />)}<Line type="monotone" dataKey="score" stroke="var(--orange)" strokeWidth={1.5} dot={(props: { cx?: number; cy?: number; payload?: { status: Status } }) => props.cx == null || props.cy == null ? <g /> : <circle cx={props.cx} cy={props.cy} r={3} fill={props.payload?.status === 'orange' || props.payload?.status === 'red' ? 'var(--orange)' : 'var(--fg)'} />} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div></section>

    <section ref={compareRef} className="report-entrance" style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <SmallLabel>DOMAIN COMPARISON</SmallLabel>
        <label style={{ ...mono, fontSize: 10 }}>COMPARE <select value={weekA} onChange={event => setCompareA(Number(event.target.value))} style={selectStyle}>{weeks.map(w => <option key={w} value={w}>W{w + 1}</option>)}</select> VS <select value={weekB} onChange={event => setCompareB(Number(event.target.value))} style={selectStyle}>{weeks.map(w => <option key={w} value={w}>W{w + 1}</option>)}</select></label>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>{(['BARS','RADAR','TREND'] as const).map(v => <button key={v} onClick={() => setComparisonView(v)} style={{ ...mono, fontSize: 10, padding: '8px 10px', border: `1px solid ${comparisonView === v ? 'var(--orange)' : 'var(--border)'}`, color: comparisonView === v ? 'var(--orange)' : 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>{v}</button>)}</div>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          {comparisonView === 'BARS' ? <BarChart data={compareData} margin={{ top: 20, right: 15, bottom: 20, left: 0 }}><CartesianGrid vertical={false} stroke="var(--muted)" strokeOpacity={0.12} /><XAxis dataKey="label" tick={chartAxis} axisLine={false} tickLine={false} /><YAxis domain={[0,100]} tick={chartAxis} axisLine={false} tickLine={false} /><Tooltip content={<ReportTooltip />} /><ReferenceLine y={90} stroke="var(--muted)" strokeDasharray="4 4" label={{ value:'BASELINE', fill:'var(--muted)', fontSize:9 }} /><Bar dataKey="A" name={`W${weekA+1}`} fill="transparent" stroke="var(--muted)" strokeWidth={1.5} radius={0} /><Bar dataKey="B" name={`W${weekB+1}`} fill="var(--fg)" radius={0} /></BarChart>
          : comparisonView === 'RADAR' ? <RadarChart data={compareData} outerRadius="72%"><PolarGrid polarRadius={[25,50,65,80,100]} stroke="var(--muted)" strokeOpacity={0.4} /><PolarAngleAxis dataKey="label" tick={chartAxis} /><PolarRadiusAxis domain={[0,100]} tick={chartAxis} /><Radar name={`W${weekA+1}`} dataKey="A" stroke="var(--muted)" fill="transparent" fillOpacity={0} /><Radar name={`W${weekB+1}`} dataKey="B" stroke="var(--orange)" fill="var(--orange)" fillOpacity={0.15} /></RadarChart>
          : <LineChart data={Array.from({length:7},(_,index)=>({day:index+1,...Object.fromEntries(DOMAINS.flatMap(domain=>[[`${domain.key}A`,compareDaysA.find(row=>row.day%7===index)?.[domain.key] ?? null],[`${domain.key}B`,compareDaysB.find(row=>row.day%7===index)?.[domain.key] ?? null]]))}))} margin={{top:12,right:12,bottom:8,left:0}}><CartesianGrid vertical={false} stroke="var(--muted)" strokeOpacity={0.12}/><XAxis dataKey="day" tickFormatter={value=>`D${value}`} tick={chartAxis} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={chartAxis} axisLine={false} tickLine={false}/><Tooltip content={<ReportTooltip/>}/>{DOMAINS.filter(domain=>visibleDomains.has(domain.key)).flatMap(domain=>[<Line key={`${domain.key}A`} dataKey={`${domain.key}A`} name={`${domain.label} A`} stroke="var(--muted)" strokeDasharray="5 4" strokeWidth={1.5} connectNulls dot={false}/>,<Line key={`${domain.key}B`} dataKey={`${domain.key}B`} name={`${domain.label} B`} stroke="var(--orange)" strokeWidth={1.5} connectNulls dot={false}/>])}</LineChart>}
        </ResponsiveContainer>
      </div>
      {comparisonView === 'TREND' && <div style={{display:'flex',flexWrap:'wrap',gap:8,margin:'4px 0 18px'}}>{DOMAINS.map(domain=><button key={domain.key} onClick={()=>setVisibleDomains(prev=>{const next=new Set(prev);next.has(domain.key)?next.delete(domain.key):next.add(domain.key);return next;})} style={{...mono,fontSize:10,padding:'6px 9px',border:`1px solid ${visibleDomains.has(domain.key)?'var(--orange)':'var(--border)'}`,color:visibleDomains.has(domain.key)?'var(--orange)':'var(--muted)',background:'transparent'}}>{domain.label}</button>)}</div>}
      <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:760,borderCollapse:'collapse',...mono,fontSize:10}}><thead><tr>{['DOMAIN',`A · W${weekA+1}`,`B · W${weekB+1}`,'DELTA','TREND','MAIN DRIVER'].map(col=><th key={col} style={tableHead}>{col}</th>)}</tr></thead><tbody>{DOMAINS.map(domain=>{const a=average(compareDaysA,domain.key),b=average(compareDaysB,domain.key),d=b-a;const driver=mostFrequentWhy(compareDaysB,domain.key);return <React.Fragment key={domain.key}><tr onClick={()=>setDetailDomain(detailDomain===domain.key?null:domain.key)} style={{borderBottom:'1px solid var(--border)',cursor:'pointer'}}>{[domain.label,Math.round(a),Math.round(b),`${d>0?'+':''}${Math.round(d)}`,d>2?'↑':d< -2?'↓':'→',driver].map((value,index)=><td key={index} style={{padding:'12px 8px',color:index===3&&d< -2?'var(--orange)':index===5?'var(--muted)':'var(--fg)'}}>{value}</td>)}</tr>{detailDomain===domain.key&&<tr><td colSpan={6} style={{padding:'12px 8px',borderBottom:'1px solid var(--border)'}}><DomainDetail domain={domain} weekA={compareDaysA} weekB={compareDaysB}/></td></tr>}</React.Fragment>;})}</tbody></table></div>
    </section>
    <MetricChart metric={metric} setMetric={setMetric} data={metricData} baseline={metricBaseline} selectedWeek={selectedWeek} weeks={weeks} />
    <StatusHeatmap days={days} selectedWeek={selectedWeek} selectedDay={selectedDay} onSelect={setSelectedDay} />
    {selectedDayRow && <DayDetail row={selectedDayRow} onClose={() => setSelectedDay(null)} />}
    <AlertsList rows={alerts} />
    <Recommendations rows={recommendations} />
    <ExportButton week={selectedWeek} />
  </main><footer style={{ padding: '16px 32px 24px', ...mono, fontSize: 10, color: 'var(--muted)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}><span>Decision support, not a medical diagnosis.</span><button onClick={async()=>{try{const day=await addNextDay();setWeek(Math.floor(day/7));setAddToast(`Day ${day} added · W${Math.floor(day/7)+1}`);}catch(error){setAddToast(`Add failed: ${String(error)}`);}}} style={{...mono,fontSize:10,color:'var(--orange)',background:'transparent',border:'1px solid var(--orange)',padding:'10px 12px',borderRadius:0,cursor:'pointer'}}>⌜ + ADD NEXT DAY ⌟</button>{addToast&&<span role="status" style={{...mono,fontSize:10}}>{addToast}</span>}</footer></Shell>;
};

function Shell({ children }: { children: React.ReactNode }) { return <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--fg)', fontFamily: "'Inter Tight', sans-serif" }}>{children}<style>{`@media(max-width:760px){.report-entrance[style*="grid-template-columns"]{grid-template-columns:1fr!important}}@media print{body{--bg:#fff!important;--fg:#000!important;--muted:#555!important;background:#fff!important;color:#000!important}.no-print,header:not(.print-report-header),button,select{display:none!important}.report-entrance{break-inside:avoid}.recharts-responsive-container{width:100%!important}.print-report-header{display:block!important}}`}</style><div className="print-report-header" style={{display:'none',padding:24,...mono}}>ASTROGUARD · WEEKLY REPORT · CREW CDR-001 · generated {new Date().toLocaleDateString()}<div>Decision support, not a medical diagnosis.</div></div></div>; }
function SmallLabel({ children }: { children: React.ReactNode }) { return <span style={{ ...mono, fontSize: 10, color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{children}</span>; }

export function WeekSelector({ weeks, days, selected, onSelect }: { weeks: number[]; days: DailyCheckin[]; selected: number; onSelect: (week: number) => void }) { const latest=weeks.at(-1)??0; const count=days.filter(day=>weekOf(day.day)===latest).length; return <nav aria-label="Report week" className="report-entrance" style={{ display: 'flex', gap: 6, margin: '22px 0 4px', flexWrap:'wrap', alignItems:'center' }}>{weeks.map(w => <button key={w} onClick={() => onSelect(w)} aria-pressed={selected === w} style={{ ...mono, minWidth: 54, padding: '10px 14px', border: `1px solid ${selected === w ? 'var(--orange)' : 'var(--border)'}`, color: selected === w ? 'var(--orange)' : 'var(--muted)', background: 'transparent', cursor: 'pointer', borderRadius: 0 }}>W{w + 1}</button>)}{count<7&&<span style={{...mono,fontSize:10,color:'var(--muted)',marginLeft:8}}>PARTIAL · {count}/7 DAYS</span>}</nav>; }
export function ScoreHero({ scoreRef, score, status, delta, previousWeek }: { scoreRef: React.Ref<HTMLSpanElement>; score: number; status: Status; delta: number | null; previousWeek: number }) { return <div><div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}><span ref={scoreRef} style={{ ...mono, fontSize: 'clamp(5rem,12vw,8.5rem)', lineHeight: 1, letterSpacing: '-.08em' }}>{Math.round(score)}</span><span style={{ ...mono, color: 'var(--muted)' }}>/ 100</span></div><div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}><i style={{ width: 9, height: 9, background: STATUS_COLORS[status], borderRadius: '50%' }} /><b style={{ ...mono, fontSize: 12 }}>{statusLabel[status]}</b><span style={{ ...mono, fontSize: 11, color: delta != null && delta < 0 ? 'var(--orange)' : 'var(--muted)', marginLeft: 8 }}>{delta == null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta)} vs W${previousWeek}`}</span></div></div>; }
export function DomainRow({ domain, days, previous, average }: { domain: typeof DOMAINS[number]; days: DailyCheckin[]; previous: DailyCheckin[]; average: (days: DailyCheckin[], key: 'scoreOverall' | DomainKey) => number }) { const score = average(days, domain.key); const prior = previous.length ? average(previous, domain.key) : null; const delta = prior == null ? null : score - prior; const status = statusFromScore(score); const values = days.map(d => d[domain.key]); const points = values.map((v, i) => `${i * 100 / Math.max(1, values.length - 1)},${30 - v * .28}`).join(' '); return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) 55px 30px minmax(100px,2fr) 72px', gap: 12, alignItems: 'center', padding: '15px 0', borderBottom: '1px solid var(--border)' }}><span style={{ ...mono, fontSize: 11 }}>{domain.label}</span><b style={{ ...mono }}>{Math.round(score)}</b><span style={{ ...mono, color: delta != null && delta < 0 ? 'var(--orange)' : 'var(--muted)' }}>{delta == null ? '—' : delta < 0 ? '↓' : delta > 0 ? '↑' : '→'}</span><div style={{ height: 2, background: 'var(--border)' }}><div style={{ height: 2, width: `${score}%`, background: STATUS_COLORS[status] }} /></div><svg viewBox="0 0 100 32" width="72" height="24" aria-label={`${domain.label} weekly trend`}><polyline points={points} fill="none" stroke="var(--fg)" strokeWidth="1.5" /></svg></div>; }
function ReportTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number }>; label?: string | number }) { if (!active || !payload?.length) return null; return <div style={{ ...mono, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', padding: '8px 10px', fontSize: 11 }}>{label != null && <div>DAY {label}</div>}{payload.map((item, i) => <div key={`${item.name}-${i}`}>{item.name}: {Math.round(item.value ?? 0)}</div>)}</div>; }

export function MetricChart({metric,setMetric,data,baseline,selectedWeek,weeks}:{metric:'HR'|'HRV'|'SLEEP H'|'MOOD';setMetric:(m:'HR'|'HRV'|'SLEEP H'|'MOOD')=>void;data:Array<{day:number;weekIndex:number;value:number}>;baseline:number;selectedWeek:number;weeks:number[]}){const ref=useRef<HTMLElement>(null);useEffect(()=>{const el=ref.current;if(!el)return;const ctx=gsap.context(()=>gsap.fromTo(el.querySelector('.metric-chart'),{opacity:.35,y:8},{opacity:1,y:0,duration:.3}),el);return()=>ctx.revert()},[metric,selectedWeek,weeks.length]);return <section ref={ref} className="report-entrance" style={{marginBottom:40}}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><SmallLabel>MISSION METRIC</SmallLabel><div style={{...mono,fontSize:10,color:'var(--muted)',marginTop:5}}>Daily value vs your baseline</div></div><div>{(['HR','HRV','SLEEP H','MOOD'] as const).map(m=><button key={m} onClick={()=>setMetric(m)} style={{...mono,fontSize:10,padding:'8px 10px',border:`1px solid ${m===metric?'var(--orange)':'var(--border)'}`,color:m===metric?'var(--orange)':'var(--muted)',background:'transparent'}}>{m}</button>)}</div></div><div className="metric-chart" style={{height:270,marginTop:10}}><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid vertical={false} stroke="var(--muted)" strokeOpacity={.12}/><XAxis dataKey="day" tick={chartAxis} axisLine={false} tickLine={false}/><YAxis tick={chartAxis} axisLine={false} tickLine={false}/><Tooltip content={<MetricTooltip baseline={baseline} metric={metric}/>}/><ReferenceLine y={baseline} stroke="var(--muted)" strokeDasharray="4 4" label={{value:`BASELINE ${baseline}`,fill:'var(--muted)',fontSize:9}}/>{weeks.filter(w=>w>0).map(w=><ReferenceLine key={w} x={w*7} stroke="var(--muted)" strokeDasharray="4 4" label={{value:`W${w+1}`,fill:'var(--muted)',fontSize:9}}/>)}<Line dataKey="value" name={metric} stroke="var(--orange)" strokeWidth={1.5} dot={(p:{cx?:number;cy?:number;payload?:{weekIndex:number}})=><circle cx={p.cx} cy={p.cy} r={p.payload?.weekIndex===selectedWeek?3:2} fill="var(--orange)" opacity={p.payload?.weekIndex===selectedWeek?1:.35}/>} /></LineChart></ResponsiveContainer></div></section>}
function MetricTooltip({active,payload,label,baseline,metric}:{active?:boolean;payload?:Array<{value?:number}>;label?:number|string;baseline:number;metric:string}){if(!active||!payload?.length)return null;const value=payload[0].value??0;return <div style={{...mono,background:'var(--bg)',border:'1px solid var(--border)',padding:8,fontSize:10}}>DAY {label} · {metric} {value} · {value-baseline>0?'+':''}{(value-baseline).toFixed(1)} VS BASELINE</div>}
export function StatusHeatmap({days,selectedWeek,selectedDay,onSelect}:{days:DailyCheckin[];selectedWeek:number;selectedDay:number|null;onSelect:(d:number)=>void}){const ordered=[...days].sort((a,b)=>a.day-b.day);const weeks=[...new Set(ordered.map(d=>weekOf(d.day)))].sort((a,b)=>a-b);return <section className="report-entrance" style={{marginBottom:36}}><div><SmallLabel>MISSION DAYS</SmallLabel><div style={{...mono,fontSize:10,color:'var(--muted)',marginTop:5}}>One square per day, colored by status; click for details</div></div><div style={{display:'grid',gap:8,marginTop:12}}>{weeks.map(w=><div key={w} style={{display:'flex',alignItems:'center',gap:12,padding:6,border:w===selectedWeek?'1px solid var(--orange)':'1px solid transparent',flexWrap:'wrap'}}><span style={{...mono,width:34,fontSize:10,color:'var(--muted)'}}>W{w+1}</span>{ordered.filter(d=>weekOf(d.day)===w).map(d=><button key={d.day} onClick={()=>onSelect(d.day)} title={`${d.date} · ${d.status}`} style={{...mono,width:38,height:38,padding:0,border:selectedDay===d.day?'1px solid var(--fg)':'1px solid var(--border)',background:STATUS_COLORS[d.status],color:'#fff',fontSize:10,borderRadius:0}}>{d.day}</button>)}</div>)}</div></section>}
export function DayDetail({row,onClose}:{row:DailyCheckin;onClose:()=>void}){const domainNames={bone:'BONE',heart:'HEART',immune:'IMMUNE',mind:'MIND'} as const;return <section className="report-entrance" style={{padding:18,border:'1px solid var(--border)',marginBottom:32}}><div style={{display:'flex',justifyContent:'space-between'}}><SmallLabel>DAY {row.day} · {row.date} · {row.scoreOverall}/100</SmallLabel><button className="no-print" onClick={onClose} style={{...mono,color:'var(--muted)',border:0,background:'none'}}>CLOSE</button></div><p style={{...mono,color:STATUS_COLORS[row.status],fontSize:11}}>{row.status.toUpperCase()}</p><div style={{display:'flex',gap:18,flexWrap:'wrap',...mono,fontSize:11}}>{(['bone','heart','immune','mind'] as const).map(d=><span key={d}>{domainNames[d]} {row[`score${d[0].toUpperCase()}${d.slice(1)}` as 'scoreBone'|'scoreHeart'|'scoreImmune'|'scoreMind']}</span>)}</div>{(['bone','heart','immune','mind'] as const).filter(d=>row.reasons[d].why!=='Within your baseline').map(d=><p key={d} style={{fontSize:12}}><b>{domainNames[d]}</b> · {row.reasons[d].why} — {row.reasons[d].action}</p>)}<p style={{...mono,fontSize:11,color:'var(--muted)'}}>HR {row.sensors.hr} bpm · HRV {row.sensors.hrv} ms · SpO₂ {row.sensors.spo2}% · SLEEP {row.sensors.sleepHours} h · TEMP {row.sensors.temperature}°C</p><Link className="no-print" to={`/checkin?day=${row.day}`} style={{...mono,color:'var(--orange)',fontSize:11}}>Open in Daily Check-in →</Link></section>}
export function AlertsList({rows}:{rows:DailyCheckin[]}){
  const groups: DailyCheckin[][] = [];
  [...rows].sort((a,b)=>a.day-b.day).forEach(row=>{const previous=groups[groups.length-1];if(previous&&previous[previous.length-1].day===row.day-1)previous.push(row);else groups.push([row]);});
  return <section className="report-entrance" style={{marginBottom:34}}><div><SmallLabel>ALERTS THIS WEEK</SmallLabel><div style={{...mono,fontSize:10,color:'var(--muted)',marginTop:5}}>Days that need action</div></div>{groups.length?groups.map(group=>{const first=group[0],last=group[group.length-1],worstStatus=group.some(row=>row.status==='red')?'red':group.some(row=>row.status==='orange')?'orange':group[0].status;const domains=['bone','heart','immune','mind'] as const;return <article key={first.day} style={{padding:'12px 0',borderBottom:'1px solid var(--border)'}}><div style={{...mono,fontSize:11,color:STATUS_COLORS[worstStatus]}}>{group.length>1?`DAYS ${first.day}-${last.day}`:`DAY ${first.day} · ${first.date}`} · {worstStatus.toUpperCase()}</div>{domains.map(domain=>{const affected=group.filter(row=>row.reasons[domain].why!=='Within your baseline');if(!affected.length)return null;const whyCounts=new Map<string,number>();affected.forEach(row=>whyCounts.set(row.reasons[domain].why,(whyCounts.get(row.reasons[domain].why)??0)+1));const main=[...whyCounts].sort((a,b)=>b[1]-a[1])[0];const action=affected[0].reasons[domain].action;return <p key={domain} style={{fontSize:12,margin:'6px 0'}}>{domain.toUpperCase()} · {main[0]}{group.length>1?` · ${main[1]} days`:''}<br/><span style={{color:'var(--muted)'}}>RECOMMENDED ACTION · {action}</span></p>;})}{group.some(row=>row.answers.blurredVision==='yes')&&<p style={{color:'var(--orange)',fontSize:12}}>SANS WARNING: report vision changes and follow the mission medical protocol.</p>}</article>;}):<p style={{...mono,fontSize:11}}><i style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:STATUS_COLORS.green,marginRight:8}}/>No alerts this week</p>}</section>}
export function Recommendations({rows}:{rows:Array<{action:string;days:number}>}){return <section className="report-entrance" style={{marginBottom:34}}><div><SmallLabel>TOP 3 RECOMMENDATIONS</SmallLabel><div style={{...mono,fontSize:10,color:'var(--muted)',marginTop:5}}>Most frequent actions this week</div></div>{rows.length?rows.map((r,i)=><div key={r.action} style={{display:'grid',gridTemplateColumns:'48px 1fr auto',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)',alignItems:'center'}}><b style={{...mono,color:'var(--orange)'}}>{String(i+1).padStart(2,'0')}</b><span>{r.action}</span><span style={{...mono,color:'var(--muted)',fontSize:10}}>{r.days} days</span></div>):<p style={{color:'var(--muted)'}}>Keep current routine.</p>}</section>}
export function ExportButton({week}:{week:number}){return <button aria-label={`Export week ${week+1} for Earth`} className="no-print" onClick={()=>window.print()} style={{...mono,color:'var(--orange)',background:'transparent',border:'1px solid var(--orange)',borderRadius:0,padding:'16px 22px',minHeight:56}}>⌜ EXPORT FOR EARTH ⌟</button>}

function mostFrequentWhy(days: DailyCheckin[], key: DomainKey): string {
  const reasonKey = key === 'scoreBone' ? 'bone' : key === 'scoreHeart' ? 'heart' : key === 'scoreImmune' ? 'immune' : 'mind';
  const frequency = new Map<string, number>();
  days.forEach(day => { const why = day.reasons[reasonKey].why; if (why !== 'Within your baseline') frequency.set(why, (frequency.get(why) ?? 0) + 1); });
  return [...frequency].sort((a,b)=>b[1]-a[1])[0]?.[0].split(';')[0] ?? 'Within your baseline';
}

function DomainDetail({ domain, weekA, weekB }: { domain: typeof DOMAINS[number]; weekA: DailyCheckin[]; weekB: DailyCheckin[] }) {
  const reasonKey = domain.key === 'scoreBone' ? 'bone' : domain.key === 'scoreHeart' ? 'heart' : domain.key === 'scoreImmune' ? 'immune' : 'mind';
  const worst = [...weekB].sort((a,b)=>a[domain.key]-b[domain.key])[0];
  const values = (list:DailyCheckin[]) => list.map(row=>row[domain.key]);
  const points = (list:DailyCheckin[]) => values(list).map((v,i)=>`${i*100/Math.max(1,list.length-1)},${28-v*.25}`).join(' ');
  return <div style={{display:'grid',gridTemplateColumns:'140px 1fr 1fr 2fr',gap:14,alignItems:'center'}}><span style={mono}>WEEK A <svg viewBox="0 0 100 32" width="100" height="32"><polyline points={points(weekA)} fill="none" stroke="var(--muted)" strokeWidth="1.5"/></svg></span><span style={mono}>WEEK B <svg viewBox="0 0 100 32" width="100" height="32"><polyline points={points(weekB)} fill="none" stroke="var(--orange)" strokeWidth="1.5"/></svg></span><div style={{fontSize:12}}><div>{worst?.reasons[reasonKey].why ?? 'Within your baseline'}</div><div style={{color:'var(--muted)',marginTop:5}}>Action: {worst?.reasons[reasonKey].action ?? 'Keep current routine'}</div></div><Link to={`/checkin?day=${worst?.day ?? weekB[0]?.day ?? 0}`} style={{...mono,color:'var(--orange)',fontSize:10}}>Open day in Daily Check-in →</Link></div>;
}

export default Report;
