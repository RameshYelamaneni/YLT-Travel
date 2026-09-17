import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Trash2 } from 'lucide-react';
import { useOperatorStore } from '../../store/operatorStore';
import { useCarStore } from '../../store/carStore';
import { useLastMileStore } from '../../store/lastMileStore';
import { useExpenseStore } from '../../store/expenseStore';
import { mockCarRentals } from '../../data/mockCars';
import { commissionFor, surgeMultiplier, currentPricingContext } from '../../lib/business';
import type { FleetBus, Driver, OperatorRoute, ExpenseEntry, FleetCar } from '../../types-operator';

interface Msg { role: 'user' | 'ai'; content: string; }
interface AiCtx {
  fleet: FleetBus[]; drivers: Driver[]; routes: OperatorRoute[]; expenses: ExpenseEntry[]; cars: FleetCar[];
  carStore: ReturnType<typeof useCarStore.getState>;
  lastMileStore: ReturnType<typeof useLastMileStore.getState>;
  expenseStore: ReturnType<typeof useExpenseStore.getState>;
}

const QUICK_PROMPTS = [
  'Fleet status for tonight',
  'Which buses need fuel?',
  'Driver roster summary',
  'Route profitability',
  'Optimize car fleet availability',
  'Predict last-mile demand tonight',
  'Which cars are most profitable?',
  'Generate car driver roster plan',
  'Show SLA issues for cars',
];

export default function AiDispatchAssistant() {
  const { fleet, drivers, routes, expenses, cars } = useOperatorStore();
  const carStore = useCarStore();
  const lastMileStore = useLastMileStore();
  const expenseStore = useExpenseStore();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', content: 'I am the YLT AI Dispatch Assistant. I analyze your bus fleet, car fleet, driver roster, last-mile demand, expenses, and profitability. Try a quick prompt below.' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, typing]);

  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'ai', content: generateReply(text, { fleet, drivers, routes, expenses, cars, carStore, lastMileStore, expenseStore }) }]);
      setTyping(false);
    }, 600 + Math.random() * 400);
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="flex items-center justify-between">
        <div><h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Dispatch Assistant</h2><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Analyze fleet, cars, drivers, routes and profitability.</p></div>
        <button onClick={() => setMessages([{ role: 'ai', content: 'Chat cleared. How can I help?' }])} className="btn-ghost text-xs"><Trash2 className="h-4 w-4" /> Clear</button>
      </div>

      <div ref={scrollRef} className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-[var(--bg-raised)] p-4 scrollbar-thin" style={{ borderColor: 'var(--border)' }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${m.role === 'user' ? 'bg-crimson-600/20 text-crimson-600' : 'bg-emerald-500/15 text-emerald-600'}`}>{m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-crimson-600/20' : 'bg-[var(--bg-surface)]'}`} style={m.role === 'user' ? { color: 'var(--text-primary)' } : { color: 'var(--text-primary)' }}>{m.content}</div>
          </div>
        ))}
        {typing && <div className="flex gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600"><Sparkles className="h-4 w-4 animate-pulse" /></div><div className="rounded-xl bg-[var(--bg-surface)] px-4 py-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing...</div></div>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((p) => <button key={p} onClick={() => send(p)} className="rounded-full border bg-[var(--bg-raised)] px-3 py-1.5 text-xs transition hover:border-crimson-500/40 hover:text-crimson-600" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{p}</button>)}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your fleet, cars, or profitability..." className="input-field flex-1" />
        <button type="submit" className="btn-primary"><Send className="h-4 w-4" /> Send</button>
      </form>
    </div>
  );
}

function generateReply(input: string, ctx: AiCtx): string {
  const q = input.toLowerCase();
  const running = ctx.fleet.filter((b) => b.status === 'running').length;
  const lowFuel = ctx.fleet.filter((b) => b.fuel_pct < 30);
  const surge = surgeMultiplier(currentPricingContext());

  if (/car.*fleet|optimize.*car|car.*avail/i.test(q)) {
    const avail = ctx.cars.filter((c) => c.status === 'available').length;
    const onTrip = ctx.cars.filter((c) => c.status === 'on-trip').length;
    const maint = ctx.cars.length - avail - onTrip;
    const util = ctx.cars.length > 0 ? (onTrip / ctx.cars.length) * 100 : 0;
    return `Car fleet optimization:\n• ${avail} available, ${onTrip} on-trip, ${maint} maintenance\n• Utilization: ${util.toFixed(0)}%\n• Current surge: ${surge.toFixed(1)}x\n${util < 50 ? '→ Low utilization — promote self-drive rentals.' : '→ Healthy utilization.'}\n${maint > 0 ? `→ ${maint} car(s) in maintenance — expedite to capture demand.` : ''}`;
  }
  if (/profitable.*car|car.*profit/i.test(q)) {
    const ranked = ctx.cars.map((c) => {
      const rev = c.rate_per_km * c.odometer_km * 0.6 + c.base_fare * 100;
      const cost = c.odometer_km * 0.9;
      const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
      const comm = commissionFor('car', rev, true);
      return { model: c.model, margin, rev, comm };
    }).sort((a, b) => b.margin - a.margin);
    return `Most profitable cars:\n${ranked.slice(0, 3).map((r, i) => `${i + 1}. ${r.model} — ${r.margin.toFixed(0)}% margin (Rev ₹${Math.round(r.rev)}, Comm ₹${r.comm})`).join('\n')}\n→ Allocate more trips to top performers.`;
  }
  if (/last.?mile|predict.*tonight|pickup demand/i.test(q)) {
    const predicted = Math.round(running * 1.8);
    const avail = ctx.cars.filter((c) => c.status === 'available').length;
    const gap = Math.max(0, predicted - avail);
    const surgeNote = surge > 1.2 ? `Surge ${surge.toFixed(1)}x — last-mile fares boosted.` : 'Normal pricing.';
    return `Last-mile demand prediction:\n• ${running} buses running → ~${predicted} pickups needed\n• ${avail} cars available\n• ${gap > 0 ? `⚠️ Supply gap of ${gap} cars — activate idle fleet or apply surge.` : 'Supply sufficient.'}\n• ${surgeNote}`;
  }
  if (/car.*driver.*roster|assign.*car.*driver|car.*schedul|generate.*roster/i.test(q)) {
    const chauff = ctx.cars.filter((c) => c.mode === 'chauffeured');
    const free = ctx.drivers.filter((d) => d.status !== 'leave');
    const pairs = Math.min(chauff.length, free.length);
    return `Car driver roster plan:\n• ${chauff.length} chauffeured cars\n• ${free.length} available drivers\n• Proposed: ${pairs} assignments across 3 shifts\n${pairs < chauff.length ? `→ ${chauff.length - pairs} car(s) will be idle — recruit more drivers.` : '→ All chauffeured cars can be staffed.'}`;
  }
  if (/sla.*car|car.*sla|sla.*issue/i.test(q)) {
    const issues = ctx.cars.filter((c) => c.mode === 'chauffeured' && c.status === 'maintenance');
    const slaOk = ctx.cars.filter((c) => c.mode === 'chauffeured' && c.status !== 'maintenance').length;
    return `SLA issues for cars:\n• ${slaOk} chauffeured cars SLA-compliant\n• ${issues.length} car(s) in maintenance (SLA breach risk)\n${issues.length > 0 ? issues.map((c) => `→ ${c.model} (${c.id}) — fix to restore SLA badge`).join('\n') : 'No SLA issues detected.'}`;
  }
  if (/fleet.*status|tonight/i.test(q)) {
    return `Fleet status:\n• ${running} buses running, ${ctx.fleet.length - running} idle/maintenance\n• ${lowFuel.length} buses need fuel\n• ${ctx.cars.length} cars (${ctx.cars.filter((c) => c.status === 'available').length} available)\n• Surge: ${surge.toFixed(1)}x`;
  }
  if (/fuel/i.test(q)) {
    return lowFuel.length > 0 ? `Buses needing fuel:\n${lowFuel.map((b) => `• ${b.id} (${b.model}) — ${b.fuel_pct}%`).join('\n')}` : 'All buses have adequate fuel levels.';
  }
  if (/driver.*roster|roster/i.test(q)) {
    const onDuty = ctx.drivers.filter((d) => d.status === 'on-duty');
    return `Driver roster:\n• ${onDuty.length} on-duty, ${ctx.drivers.length - onDuty.length} off-duty/leave\n${onDuty.map((d) => `• ${d.name} → ${d.assigned_bus_id ?? 'unassigned'}`).join('\n')}`;
  }
  if (/route.*profit|profitability/i.test(q)) {
    return `Route profitability:\n${ctx.routes.map((r) => `• ${r.from_city} → ${r.to_city}: ₹${r.base_fare} base, ${r.trips_per_day} trips/day, comm ₹${commissionFor('bus', r.base_fare)}/ticket`).join('\n')}`;
  }
  return `I can help with: fleet status, fuel alerts, driver rosters, route profitability, car fleet optimization, car profitability, last-mile predictions, car driver scheduling, and SLA issues. Try a quick prompt above.`;
}
