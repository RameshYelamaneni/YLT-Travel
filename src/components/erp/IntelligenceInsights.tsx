import { useState } from 'react';
import { Sparkles, TrendingUp, Star, Route, Activity, BarChart3, Brain, Zap } from 'lucide-react';
import { useErpStore, fmtINR, fleetHealthScore, crewSlaAverage, routeProfitability, bookingHeatmap } from '../../store/erpStore';
import { Card, StatCard, Badge, Header, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';

const AI_QUICK = [
  'Show fleet health summary',
  'Which drivers have the best SLA?',
  'Which routes are most profitable?',
  'Show booking trends',
  'Which buses need attention?',
  'Generate maintenance recommendations',
  'Show revenue insights',
  'Identify underperforming routes',
];

export default function IntelligenceInsights() {
  const { buses, crew, slaScores, channelSales, expenses, insights, insert, logAction } = useErpStore();
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const fleetHealth = fleetHealthScore(buses);
  const avgSla = crewSlaAverage(slaScores);
  const profitability = routeProfitability(channelSales, expenses);
  const heatmap = bookingHeatmap(channelSales);
  const totalRevenue = channelSales.reduce((s, c) => s + c.net_amount, 0);
  const totalCost = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalCost;

  function answer(q: string): string {
    const l = q.toLowerCase();
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
    if (l.includes('revenue')) return `Total revenue: ₹${fmtINR(totalRevenue)}, total costs: ₹${fmtINR(totalCost)}, net profit: ₹${fmtINR(netProfit)} (margin: ${totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : 0}%).`;
    if (l.includes('underperform')) {
      const worst = profitability[profitability.length - 1];
      return worst ? `Underperforming route: ${worst.route} with ₹${fmtINR(worst.profit)} profit.` : 'No route data available.';
    }
    return `I can help with fleet health, driver SLA, route profitability, booking trends, maintenance, and revenue. Fleet health: ${fleetHealth}%, avg SLA: ${avgSla}%, net profit: ₹${fmtINR(netProfit)}.`;
  }

  function ask(q: string) {
    setInput(q); setBusy(true); setReply('');
    setTimeout(() => { setReply(answer(q)); setBusy(false); }, 400);
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={["Intelligence", "Intelligence & Insights"]}
        title="Intelligence & Insights"
        description="Fleet health, SLA scores, route profitability, heatmaps & AI recommendations."
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Fleet Health Score" value={`${fleetHealth}%`} icon={Activity} tone={fleetHealth >= 80 ? 'green' : 'amber'} /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Driver SLA Average" value={`${avgSla}%`} icon={Star} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Net Profit" value={`₹${fmtINR(netProfit)}`} sub={`${totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : 0}% margin`} icon={TrendingUp} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Active Routes" value={String(profitability.length)} icon={Route} tone="blue" /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Route Profitability</h3>
          {profitability.length ? (
            <div className="space-y-2">
              {profitability.slice(0, 10).map((r) => (
                <div key={r.route} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <Route className="h-4 w-4 text-crimson-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.route}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Revenue: ₹{fmtINR(r.revenue)} · Cost: ₹{fmtINR(r.cost)}</p>
                  </div>
                  <span className={`font-bold ${r.profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>₹{fmtINR(r.profit)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyStateCard icon={Route} title="No profitability data" description="Route profitability will appear here once channel sales are recorded." />}
        </Card>

        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Booking Heatmap</h3>
          {heatmap.length ? (
            <div className="grid grid-cols-7 gap-1.5">
              {heatmap.slice(0, 28).map((h) => {
                const intensity = Math.min(1, h.count / 10);
                return (
                  <div key={h.date} className="group relative aspect-square rounded-md transition hover:scale-110" style={{ backgroundColor: `rgba(205, 44, 64, ${0.15 + intensity * 0.7})` }}>
                    <div className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">{h.count}</div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyStateCard icon={BarChart3} title="No booking heatmap" description="Booking trends will be visualized here once trip data is available." />}
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Darker = more bookings. Hover for count.</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-crimson-500" />
          <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>AI Assistant</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ask me anything about your operations. I analyze your live data.</p>
        <div className="mt-3 flex gap-2">
          <input className={inputCls} placeholder="Ask about fleet, SLA, profitability…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(input)} />
          <RippleButton className="text-sm whitespace-nowrap" onClick={() => ask(input)} disabled={busy || !input}><Sparkles className="h-4 w-4" /> Ask</RippleButton>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {AI_QUICK.map((q) => (
            <button key={q} onClick={() => ask(q)} className="rounded-full border px-3 py-1.5 text-xs transition hover:border-crimson-500" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{q}</button>
          ))}
        </div>
        {(busy || reply) && (
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
            <div className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 text-crimson-500" />
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{busy ? 'Analyzing your data…' : reply}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
