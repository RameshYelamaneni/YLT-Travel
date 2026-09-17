import { useMemo } from 'react';
import { Fuel, Wrench, Receipt, TrendingUp, Car, Download, FileJson } from 'lucide-react';
import { useOperatorStore } from '../../store/operatorStore';
import { useExpenseStore } from '../../store/expenseStore';
import { formatINR } from '../../lib/format';

export default function CarExpenseLedger() {
  const { cars } = useOperatorStore();
  const expenseStore = useExpenseStore();

  const carExpenses = useMemo(() => cars.map((c) => {
    const entries = expenseStore.entries.filter((e) => e.car_id === c.id);
    const fuel = entries.filter((e) => e.category === 'fuel').reduce((s, e) => s + e.amount, 0);
    const maintenance = entries.filter((e) => e.category === 'maintenance').reduce((s, e) => s + e.amount, 0);
    const toll = entries.filter((e) => e.category === 'toll').reduce((s, e) => s + e.amount, 0);
    const total = fuel + maintenance + toll;
    const estRevenue = c.rate_per_km * c.odometer_km * 0.6 + c.base_fare * 100;
    const margin = estRevenue > 0 ? ((estRevenue - total) / estRevenue) * 100 : 0;
    return { id: c.id, model: c.model, registration: c.registration, fuel, maintenance, toll, total, estRevenue, margin };
  }), [cars, expenseStore.entries]);

  const grandTotal = carExpenses.reduce((s, e) => s + e.total, 0);

  function downloadCsv() {
    const csv = expenseStore.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'car-expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    const json = expenseStore.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'car-expenses.json'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Car Expense Ledger</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Fuel, maintenance, toll logs & profitability per car.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCsv} className="btn-ghost text-xs"><Download className="h-4 w-4" /> Export CSV</button>
          <button onClick={downloadJson} className="btn-ghost text-xs"><FileJson className="h-4 w-4" /> Export JSON</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card icon={Fuel} label="Fuel" value={formatINR(carExpenses.reduce((s, e) => s + e.fuel, 0))} color="text-amber-600" />
        <Card icon={Wrench} label="Maintenance" value={formatINR(carExpenses.reduce((s, e) => s + e.maintenance, 0))} color="text-red-500" />
        <Card icon={Receipt} label="Toll" value={formatINR(carExpenses.reduce((s, e) => s + e.toll, 0))} color="text-blue-500" />
        <Card icon={TrendingUp} label="Total Expenses" value={formatINR(grandTotal)} color="text-crimson-600" />
      </div>

      <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Per-Car Profitability</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="pb-3 pr-4 font-medium">Car</th>
                <th className="pb-3 pr-4 text-right font-medium">Fuel</th>
                <th className="pb-3 pr-4 text-right font-medium">Maint.</th>
                <th className="pb-3 pr-4 text-right font-medium">Toll</th>
                <th className="pb-3 pr-4 text-right font-medium">Total</th>
                <th className="pb-3 pr-4 text-right font-medium">Est. Rev.</th>
                <th className="pb-3 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {carExpenses.map((e) => (
                <tr key={e.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 pr-4"><div className="flex items-center gap-2"><Car className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /><div><p style={{ color: 'var(--text-primary)' }}>{e.model}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.id} · {e.registration}</p></div></div></td>
                  <td className="py-3 pr-4 text-right text-amber-600">{formatINR(e.fuel)}</td>
                  <td className="py-3 pr-4 text-right text-red-500">{formatINR(e.maintenance)}</td>
                  <td className="py-3 pr-4 text-right text-blue-500">{formatINR(e.toll)}</td>
                  <td className="py-3 pr-4 text-right" style={{ color: 'var(--text-primary)' }}>{formatINR(e.total)}</td>
                  <td className="py-3 pr-4 text-right text-emerald-600">{formatINR(e.estRevenue)}</td>
                  <td className={`py-3 text-right font-semibold ${e.margin > 60 ? 'text-emerald-600' : e.margin > 40 ? 'text-amber-600' : 'text-red-500'}`}>{e.margin.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Expense Log Entries</h3>
        <div className="mt-4 space-y-2">
          {expenseStore.entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border bg-[var(--bg-raised)] px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${e.category === 'fuel' ? 'bg-amber-500/15 text-amber-600' : e.category === 'maintenance' ? 'bg-red-500/15 text-red-500' : 'bg-blue-500/15 text-blue-500'}`}>{e.category}</span>
                <span style={{ color: 'var(--text-primary)' }}>{e.note}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.car_id} · {e.date}</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-primary)' }}>{formatINR(e.amount)}</span>
                <button onClick={() => expenseStore.remove(e.id)} className="hover:text-red-500" style={{ color: 'var(--text-muted)' }}><Receipt className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return <div className="rounded-2xl border bg-[var(--bg-surface)] p-4" style={{ borderColor: 'var(--border)' }}><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span></div><p className={`mt-2 text-lg font-bold ${color}`}>{value}</p></div>;
}
