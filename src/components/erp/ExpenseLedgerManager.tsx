import { useState } from 'react';
import { Fuel, Users, Car, Wrench, TrendingUp, Plus, Trash2, Download, FileText } from 'lucide-react';
import { useErpStore, fmtINR, totalExpenses, expensesByCategory } from '../../store/erpStore';
import { Card, StatCard, Badge, Modal, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

const today = new Date().toISOString().slice(0, 10);
const CATEGORIES = ['Fuel', 'Driver Allowances', 'Toll', 'Parking', 'Maintenance', 'Misc'];

export default function ExpenseLedgerManager() {
  const { expenses, buses, crew, channelSales, insert, remove, logAction, loading } = useErpStore();
  const [tab, setTab] = useState<'ledger' | 'categories' | 'pl'>('ledger');
  const [adding, setAdding] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  if (loading && !expenses.length) return <ErpLoader label="Loading expenses…" />;

  const total = totalExpenses(expenses);
  const byCat = expensesByCategory(expenses);
  const totalRevenue = channelSales.reduce((s, c) => s + c.net_amount, 0);
  const netProfit = totalRevenue - total;
  const margin = totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const filtered = filterCat === 'all' ? expenses : expenses.filter((e) => e.category === filterCat);

  function exportCsv() {
    const rows = [['Date', 'Category', 'Amount', 'Description', 'GST'], ...filtered.map((e) => [e.date, e.category, String(e.amount), e.description ?? '', String(e.gst_amount)])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click(); URL.revokeObjectURL(url);
  }

  const catIcons: Record<string, React.ComponentType<{ className?: string }>> = { Fuel, 'Driver Allowances': Users, Toll: Car, Parking: Car, Maintenance: Wrench, Misc: FileText };

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={["People & Finance", "Expense & Ledger Manager"]}
        title="Expense & Ledger Manager"
        description="Fuel, allowances, tolls, maintenance costs, and profit & loss reports."
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Total Expenses" value={`₹${fmtINR(total)}`} icon={FileText} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Fuel Costs" value={`₹${fmtINR(byCat.find((c) => c.category === 'Fuel')?.total ?? 0)}`} icon={Fuel} tone="amber" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Driver Allowances" value={`₹${fmtINR(byCat.find((c) => c.category === 'Driver Allowances')?.total ?? 0)}`} icon={Users} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Net Profit" value={`₹${fmtINR(netProfit)}`} sub={`${margin}% margin`} icon={TrendingUp} tone="green" /></div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['ledger', 'categories', 'pl'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'ledger' ? 'Expense Ledger' : t === 'categories' ? 'Category Breakdown' : 'P/L Reports'}</button>
        ))}
      </div>

      {tab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterCat('all')} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filterCat === 'all' ? 'bg-crimson-600 text-white' : 'bg-[var(--bg-raised)]'}`} style={filterCat === 'all' ? undefined : { color: 'var(--text-secondary)' }}>All</button>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setFilterCat(c)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filterCat === c ? 'bg-crimson-600 text-white' : 'bg-[var(--bg-raised)]'}`} style={filterCat === c ? undefined : { color: 'var(--text-secondary)' }}>{c}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <RippleButton variant="ghost" className="text-sm" onClick={exportCsv}><Download className="h-4 w-4" /> Export</RippleButton>
              <RippleButton className="text-sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add Expense</RippleButton>
            </div>
          </div>
          <Card>
            {filtered.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>{['Date', 'Category', 'Amount', 'Description', 'GST', ''].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.slice(0, 50).map((e) => {
                      const bus = buses.find((b) => b.id === e.bus_id);
                      const Icon = catIcons[e.category] ?? FileText;
                      return (
                        <tr key={e.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{e.date}</td>
                          <td className="px-3 py-2.5"><div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-crimson-500" /><span style={{ color: 'var(--text-primary)' }}>{e.category}</span></div></td>
                          <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(e.amount)}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{e.description ?? '—'}{bus ? ` · ${bus.name}` : ''}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{e.gst_amount > 0 ? `₹${fmtINR(e.gst_amount)}` : '—'}</td>
                          <td className="px-3 py-2.5"><button onClick={() => { remove('erp_expenses', e.id); logAction('delete_expense', 'erp_expenses', e.id); }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <EmptyStateCard icon={FileText} title="No expenses recorded" description="Track fuel, allowances, tolls, and maintenance costs here." ctaLabel="Add Expense" onCta={() => setAdding(true)} />}
          </Card>
          {adding && <ExpenseModal buses={buses} crew={crew} onClose={() => setAdding(false)} onSave={async (d) => { await insert('erp_expenses', d); await logAction('add_expense', 'erp_expenses', '', d); setAdding(false); }} />}
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {byCat.map((c) => {
            const Icon = catIcons[c.category] ?? FileText;
            const pct = total ? Math.round((c.total / total) * 100) : 0;
            return (
              <Card key={c.category}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-crimson-500/10"><Icon className="h-5 w-5 text-crimson-600" /></div>
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.category}</p>
                    <p className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(c.total)}</p>
                  </div>
                  <Badge tone="gray">{pct}%</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-raised)]"><div className="h-full bg-crimson-500" style={{ width: `${pct}%` }} /></div>
              </Card>
            );
          })}
          {!byCat.length && <EmptyStateCard icon={FileText} title="No expense categories" description="Record expenses to see category breakdowns and trends." />}
        </div>
      )}

      {tab === 'pl' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Profit & Loss Report</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Revenue (Net)</span>
              <span className="font-display text-xl font-bold text-emerald-600">₹{fmtINR(totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Expenses</span>
              <span className="font-display text-xl font-bold text-red-500">₹{fmtINR(total)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border-2 p-4" style={{ borderColor: netProfit >= 0 ? '#059669' : '#ef4444' }}>
              <span className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Net Profit / Loss</span>
              <span className={`font-display text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>₹{fmtINR(netProfit)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-raised)] p-4">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Profit Margin</span>
              <span className={`font-display text-lg font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{margin}%</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ExpenseModal({ buses, crew, onClose, onSave }: { buses: any[]; crew: any[]; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ date: today, category: 'Fuel', sub_category: '', amount: 0, bus_id: '', crew_id: '', description: '', gst_applicable: false, gst_amount: 0 });
  return (
    <Modal open onClose={onClose} title="Add Expense">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Category"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="Amount (₹)"><input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bus (optional)"><select className={inputCls} value={f.bus_id} onChange={(e) => setF({ ...f, bus_id: e.target.value })}><option value="">None</option>{buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Crew (optional)"><select className={inputCls} value={f.crew_id} onChange={(e) => setF({ ...f, crew_id: e.target.value })}><option value="">None</option>{crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        </div>
        <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={f.gst_applicable} onChange={(e) => setF({ ...f, gst_applicable: e.target.checked, gst_amount: e.target.checked ? Math.round(f.amount * 0.05) : 0 })} />
          GST Applicable (5%)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave(f)}>Save</RippleButton>
        </div>
      </div>
    </Modal>
  );
}
