import { useState } from 'react';
import { Fuel, Wrench, Receipt, Users, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useOperatorStore } from '../../store/operatorStore';
import { formatINR } from '../../lib/format';
import type { ExpenseEntry } from '../../types-operator';

const CAT_ICON: Record<ExpenseEntry['category'], React.ComponentType<{ className?: string }>> = {
  fuel: Fuel,
  maintenance: Wrench,
  toll: Receipt,
  salary: Users,
};

export default function BusExpenseLedger() {
  const { fleet, expenses, addExpense } = useOperatorStore();
  const [draft, setDraft] = useState<Partial<ExpenseEntry>>({ category: 'fuel', date: new Date().toISOString().slice(0, 10) });

  function save() {
    if (!draft.bus_id || !draft.amount) return;
    addExpense({ ...draft, id: 'EX-' + Date.now() } as ExpenseEntry);
    setDraft({ category: 'fuel', date: new Date().toISOString().slice(0, 10) });
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byBus = fleet.map((b) => {
    const busExpenses = expenses.filter((e) => e.bus_id === b.id);
    const sum = busExpenses.reduce((s, e) => s + e.amount, 0);
    return { bus: b, count: busExpenses.length, sum };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Bus Expense Ledger</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Log fuel, maintenance, tolls and salaries per bus.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card icon={Receipt} label="Total expenses" value={formatINR(total)} color="text-crimson-600" />
        <Card icon={Fuel} label="Entries" value={String(expenses.length)} color="text-blue-500" />
        <Card icon={TrendingDown} label="Buses tracked" value={String(fleet.length)} color="text-amber-600" />
      </div>

      {/* New entry */}
      <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>New Expense</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <label className="block"><span className="label-text">Bus</span>
            <select value={draft.bus_id ?? ''} onChange={(e) => setDraft({ ...draft, bus_id: e.target.value })} className="input-field mt-1.5 text-sm">
              <option value="">Select bus</option>
              {fleet.map((b) => <option key={b.id} value={b.id}>{b.id} ({b.model})</option>)}
            </select>
          </label>
          <label className="block"><span className="label-text">Category</span>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseEntry['category'] })} className="input-field mt-1.5 text-sm">
              <option value="fuel">Fuel</option><option value="maintenance">Maintenance</option><option value="toll">Toll</option><option value="salary">Salary</option>
            </select>
          </label>
          <label className="block"><span className="label-text">Amount (₹)</span><input type="number" value={draft.amount ?? ''} onChange={(e) => setDraft({ ...draft, amount: +e.target.value })} className="input-field mt-1.5 text-sm" /></label>
          <label className="block"><span className="label-text">Date</span><input type="date" value={draft.date ?? ''} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="input-field mt-1.5 text-sm" /></label>
          <label className="block"><span className="label-text">Note</span><input value={draft.note ?? ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className="input-field mt-1.5 text-sm" /></label>
        </div>
        <button onClick={save} disabled={!draft.bus_id || !draft.amount} className="btn-primary mt-4 text-sm disabled:opacity-40"><Plus className="h-4 w-4" /> Add Expense</button>
      </div>

      {/* Per-bus summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {byBus.map(({ bus, count, sum }) => (
          <div key={bus.id} className="rounded-xl border bg-[var(--bg-surface)] p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.id}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bus.model}</p>
            <p className="mt-2 text-lg font-bold text-crimson-600">{formatINR(sum)}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{count} entries</p>
          </div>
        ))}
      </div>

      {/* Entries table */}
      <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>All Entries</h3>
        {expenses.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>No expenses logged yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="pb-3 pr-4 font-medium">Bus</th><th className="pb-3 pr-4 font-medium">Category</th><th className="pb-3 pr-4 font-medium">Amount</th><th className="pb-3 pr-4 font-medium">Date</th><th className="pb-3 font-medium">Note</th>
              </tr></thead>
              <tbody>
                {expenses.map((e) => {
                  const Icon = CAT_ICON[e.category];
                  return (
                    <tr key={e.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-primary)' }}>{e.bus_id}</td>
                      <td className="py-3 pr-4"><span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Icon className="h-3.5 w-3.5" /> {e.category}</span></td>
                      <td className="py-3 pr-4 font-semibold text-crimson-600">{formatINR(e.amount)}</td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{e.date}</td>
                      <td className="py-3" style={{ color: 'var(--text-muted)' }}>{e.note ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return <div className="rounded-2xl border bg-[var(--bg-surface)] p-4" style={{ borderColor: 'var(--border)' }}><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span></div><p className={`mt-2 text-lg font-bold ${color}`}>{value}</p></div>;
}
