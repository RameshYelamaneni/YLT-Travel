import { useState } from 'react';
import { Sparkles, TrendingUp, Route, Activity, BarChart3, Brain, Zap, Percent, CalendarRange } from 'lucide-react';
import { useErpStore, fmtINR, fleetHealthScore, crewSlaAverage, routeProfitability, bookingHeatmap, profitForecast } from '../../store/erpStore';
import { Card, StatCard, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';

const AI_QUICK = [
  'Predict 30-day profit and margin',
  'Show 90-day P&L forecast',
  'Show fleet health summary',
  'Which drivers have the best SLA?',
  'Which routes are most profitable?',
  'Show booking trends',
  'Which buses need attention?',
  'Generate maintenance recommendations',
  'Show revenue insights',
  'Identify underperforming routes',
  'Diesel +10% shock on margin',
  'Occupancy +5% upside',
];

export default function IntelligenceInsights() {
  const { buses, crew, slaScores, channelSales, expenses, earnings, insights, insert, logAction } = useErpStore();
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [horizon, setHorizon] = useState<30 | 90>(30);

  const fleetHealth = fleetHealthScore(buses);
  const avgSla = crewSlaAverage(slaScores);
  const profitability = routeProfitability(channelSales, expenses);
  const heatmap = bookingHeatmap(channelSales);
  const totalRevenue = channelSales.reduce((s, c) => s + c.net_amount, 0) + earnings.reduce((s, e) => s + e.net_amount, 0);
  const totalCost = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalCost;
  const marginNow = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;
  const fc = profitForecast(channelSales, expenses, earnings, horizon);

  function answer(q: string): string {
    const l = q.toLowerCase();
    if (l.includes('30-day') || l.includes('predict') && l.includes('profit')) {
      const f = profitForecast(channelSales, expenses, earnings, 30);
      return `30-day AI forecast: revenue ₹${fmtINR(f.predictedRevenue)}, cost ₹${fmtINR(f.predictedCost)}, profit ₹${fmtINR(f.predictedProfit)}, margin ${f.predictedMarginPct.toFixed(1)}% (confidence ${f.confidence}, ${f.sampleDays} sample days).`;
    }
    if (l.includes('90-day') || l.includes('90 day')) {
      const f = profitForecast(channelSales, expenses, earnings, 90);
      return `90-day AI forecast: revenue ₹${fmtINR(f.predictedRevenue)}, profit ₹${fmtINR(f.predictedProfit)}, margin ${f.predictedMarginPct.toFixed(1)}%.`;
    }
    if (l.includes('diesel')) {
      return `Diesel +10% cost shock: 30-day profit falls to ₹${fmtINR(fc.dieselShockProfit)} vs base ₹${fmtINR(fc.predictedProfit)}.`;
    }
    if (l.includes('occupancy')) {
      return `Occupancy +5%: 30-day profit rises to ₹${fmtINR(fc.occupancyUpProfit)} (extra seats at current yield).`;
    }
    if (l.includes('fleet health')) return `Fleet health score: ${fleetHealth}%. ${buses.filter((b) => b.status === 'maintenance').length} buses in maintenance, ${buses.filter((b) => b.fuel_pct < 30).length} with low fuel.`;
    if (l.includes('driver') && l.includes('sla')) {
      const top = [...slaScores].sort((a, b) => b.overall_score - a.overall_score).slice(0, 3);
      return top.length ? `Top drivers by SLA: ${top.map((s) => { const c = crew.find((x) => x.id === s.crew_id); return `${c?.name ?? 'Unknown'} (${Math.round(s.overall_score)}%)`; }).join(', ')}.` : 'No SLA data yet.';
    }
    if (l.includes('profit') && l.includes('route')) {
      return profitability.length ? `Most profitable routes: ${profitability.slice(0, 3).map((r) => `${r.route} (₹${fmtINR(r.profit)})`).join(', ')}.` : 'No route profitability data yet.';
    }
    if (l.includes('booking') && l.includes('trend')) {
      return heatmap.length ? `Booking trends: ${heatmap.length} active dates, peak: ${heatmap.reduce((a, b) => a.count > b.count ? a : b).date} with ${heatmap.reduce((a, b) => a.count > b.count ? a : b).count} seats sold.` : 'No booking data yet.';
    }
    if (l.includes('bus') && l.includes('attention')) {
      const needsAttn = buses.filter((b) => b.status === 'maintenance' || (b.next_maintenance && b.next_maintenance <= new Date().toISOString().slice(0, 10)) || b.fuel_pct < 30);
      return needsAttn.length ? `Buses needing attention: ${needsAttn.map((b) => `${b.name} (${b.status === 'maintenance' ? 'maintenance' : b.fuel_pct < 30 ? 'low fuel' : 'maint due'})`).join(', ')}.` : 'All buses are operating normally.';
    }
    if (l.includes('maintenance') && l.includes('recommend')) {
      const due = buses.filter((b) => b.next_maintenance && b.next_maintenance <= new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
      return due.length ? `Maintenance recommendations: ${due.map((b) => `${b.name} (due ${b.next_maintenance})`).join(', ')}.` : 'No maintenance due in the next 2 weeks.';
    }
    if (l.includes('revenue')) return `Total revenue: ₹${fmtINR(totalRevenue)}, total costs: ₹${fmtINR(totalCost)}, net profit: ₹${fmtINR(netProfit)} (margin: ${marginNow.toFixed(1)}%).`;
    if (l.includes('underperform')) {
      const worst = profitability[profitability.length - 1];
      return worst ? `Underperforming route: ${worst.route} with ₹${fmtINR(worst.profit)} profit.` : 'No route data available.';
    }
    return `Fleet health ${fleetHealth}%, SLA ${avgSla}%, live margin ${marginNow.toFixed(1)}%. ${horizon}-day forecast profit ₹${fmtINR(fc.predictedProfit)} at ${fc.predictedMarginPct.toFixed(1)}% margin.`;
  }

  function ask(q: string) {
    setInput(q); setBusy(true); setReply('');
    setTimeout(() => { setReply(answer(q)); setBusy(false); }, 350);
  }

  async function snapshot() {
    await insert('erp_insights', {
      insight_type: 'profit_forecast',
      entity_name: `${horizon}d`,
      score: Math.round(fc.predictedMarginPct),
      metric_label: 'predicted_profit',
      metric_value: String(Math.round(fc.predictedProfit)),
      trend: fc.predictedProfit >= 0 ? 'up' : 'down',
      recommendation: `${horizon}-day profit ₹${fmtINR(fc.predictedProfit)}, margin ${fc.predictedMarginPct.toFixed(1)}% (${fc.confidence})`,
      severity: fc.predictedMarginPct < 8 ? 'warning' : 'info',
    });
    await logAction('forecast', 'erp_insights', `${horizon}d`, { note: `Saved ${horizon}-day P&L snapshot` });
    setReply(`Saved ${horizon}-day forecast to ERP insights.`);
  }

  return (
    <div className="space-y-6 pb-8">
      <ModuleHeader
        breadcrumb={['Intelligence', 'AI P&L']}
        title="Intelligence, profits & margins"
        description="YLT-side AI on your ERP tables (sales, expenses, earnings). Seat inventory stays in YLT MySQL."
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setHorizon(30)} className={`rounded-full px-4 py-1.5 text-xs font-bold ${horizon === 30 ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}>30-day forecast</button>
        <button type="button" onClick={() => setHorizon(90)} className={`rounded-full px-4 py-1.5 text-xs font-bold ${horizon === 90 ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}>90-day forecast</button>
        <RippleButton className="text-xs" onClick={() => void snapshot()}><CalendarRange className="h-3.5 w-3.5" /> Save snapshot to DB</RippleButton>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 xl:col-span-2"><StatCard label="Live revenue" value={`₹${fmtINR(totalRevenue)}`} icon={TrendingUp} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-2"><StatCard label="Live cost" value={`₹${fmtINR(totalCost)}`} icon={Activity} tone="amber" /></div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-2"><StatCard label="Live profit" value={`₹${fmtINR(netProfit)}`} sub={`${marginNow.toFixed(1)}% margin`} icon={Percent} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-2"><StatCard label={`${horizon}d revenue`} value={`₹${fmtINR(fc.predictedRevenue)}`} sub={`₹${fmtINR(fc.dailyRevenueRun)} / day`} icon={TrendingUp} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-2"><StatCard label={`${horizon}d profit`} value={`₹${fmtINR(fc.predictedProfit)}`} sub={`${fc.predictedMarginPct.toFixed(1)}% pred. margin`} icon={Sparkles} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-2"><StatCard label="Confidence" value={fc.confidence} sub={`${fc.sampleDays} sample days`} icon={Brain} tone={fc.confidence === 'high' ? 'green' : 'amber'} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-2 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Base vs shocks</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Same yield, cost levers operators actually feel.</p>
          <div className="mt-4 space-y-3 text-sm">
            <Row k="Base profit" v={`₹${fmtINR(fc.predictedProfit)}`} />
            <Row k="Diesel +10% (cost)" v={`₹${fmtINR(fc.dieselShockProfit)}`} warn={fc.dieselShockProfit < fc.predictedProfit} />
            <Row k="Occupancy +5%" v={`₹${fmtINR(fc.occupancyUpProfit)}`} />
            <Row k="Break-even daily revenue" v={`₹${fmtINR(fc.dailyCostRun)}`} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Route profit & margin</h3>
          {profitability.length ? (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}><th className="pb-2">Route</th><th>Revenue</th><th>Cost share</th><th>Profit</th><th>Margin</th></tr></thead>
                <tbody>
                  {profitability.map((r) => {
                    const m = r.revenue ? (r.profit / r.revenue) * 100 : 0;
                    return (
                      <tr key={r.route} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{r.route}</td>
                        <td>₹{fmtINR(r.revenue)}</td>
                        <td>₹{fmtINR(r.cost)}</td>
                        <td className={r.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>₹{fmtINR(r.profit)}</td>
                        <td className="font-semibold">{m.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyStateCard icon={Route} title="No profitability data" description="Post channel sales and expenses — forecast uses that run-rate." />}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Booking heatmap</h3>
          {heatmap.length ? (
            <div className="grid grid-cols-7 gap-1.5">
              {heatmap.slice(0, 28).map((h) => {
                const intensity = Math.min(1, h.count / 10);
                return (
                  <div key={h.date} className="group relative aspect-square rounded-md" style={{ backgroundColor: `rgba(11, 31, 58, ${0.15 + intensity * 0.7})` }}>
                    <div className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100">{h.count}</div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyStateCard icon={BarChart3} title="No booking heatmap" description="Trip sales fill this grid." />}
        </Card>
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-5 w-5 text-gold-600" />
            <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>AI assistant</h3>
          </div>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Ask profit, margin, diesel shock…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(input)} />
            <RippleButton className="text-sm whitespace-nowrap" onClick={() => ask(input)} disabled={busy || !input}><Sparkles className="h-4 w-4" /> Ask</RippleButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {AI_QUICK.map((q) => (
              <button key={q} type="button" onClick={() => ask(q)} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{q}</button>
            ))}
          </div>
          {(busy || reply) && (
            <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 text-gold-600" />
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{busy ? 'Running forecast on ERP tables…' : reply}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {insights.length > 0 && (
        <Card>
          <h3 className="mb-3 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Saved ERP insights</h3>
          <ul className="space-y-2 text-sm">
            {insights.slice(0, 8).map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-2 border-b py-2" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{i.recommendation ?? i.insight_type}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{i.severity} · {i.metric_value}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-sm" style={{ borderColor: 'var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
      <span className={`font-semibold ${warn ? 'text-amber-700' : ''}`} style={!warn ? { color: 'var(--text-primary)' } : undefined}>{v}</span>
    </div>
  );
}
