import { useState } from 'react';
import { Wallet, TrendingUp, DollarSign, Receipt, Calendar, Plus, Download, Trash2 } from 'lucide-react';
import { useErpStore, fmtINR, totalEarnings, profitForecast } from '../../store/erpStore';
import { Card, StatCard, Badge, Modal, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

const today = new Date().toISOString().slice(0, 10);

export default function EarningsPayoutCenter() {
  const { earnings, settlements, payouts, channelSales, expenses, insert, update, logAction, loading } = useErpStore();
  const [tab, setTab] = useState<'daily' | 'settlements' | 'gst' | 'payouts'>('daily');
  const [addingPayout, setAddingPayout] = useState(false);

  if (loading && !earnings.length) return <ErpLoader label="Loading earnings…" />;

  const totals = totalEarnings(earnings);
  const pendingPayouts = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const pendingSettlements = settlements.filter((s) => s.status === 'pending').length;

  // Daily breakdown
  const dailyMap = new Map<string, { gross: number; net: number; count: number }>();
  earnings.forEach((e) => {
    const d = dailyMap.get(e.date) ?? { gross: 0, net: 0, count: 0 };
    d.gross += e.gross_amount; d.net += e.net_amount; d.count += e.booking_count;
    dailyMap.set(e.date, d);
  });
  const daily = Array.from(dailyMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);

  // Channel mix from live earnings rows (office / agent / api / website).
  const channels = [...new Set(earnings.map((e) => e.channel || 'website'))];
  const channelData = channels.map((ch) => {
    const items = earnings.filter((e) => e.channel === ch);
    return { channel: ch, gross: items.reduce((s, e) => s + e.gross_amount, 0), net: items.reduce((s, e) => s + e.net_amount, 0), count: items.reduce((s, e) => s + e.booking_count, 0) };
  });

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={["People & Finance", "Earnings & Payout Center"]}
        title="Earnings & Payout Center"
        description="Daily earnings, channel commissions, settlements, GST, and payout requests."
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Gross Earnings" value={`₹${fmtINR(totals.gross)}`} icon={TrendingUp} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Net Earnings" value={`₹${fmtINR(totals.net)}`} sub="After commission" icon={Wallet} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Commission Paid" value={`₹${fmtINR(totals.commission)}`} icon={DollarSign} tone="amber" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="GST Collected" value={`₹${fmtINR(totals.gst)}`} icon={Receipt} tone="blue" /></div>
        {(() => {
          const fc = profitForecast(channelSales, expenses, earnings, 30);
          return (
            <>
              <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="AI 30d profit" value={`₹${fmtINR(fc.predictedProfit)}`} sub={`${fc.predictedMarginPct.toFixed(1)}% margin`} icon={TrendingUp} tone="teal" /></div>
              <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="AI 30d cost" value={`₹${fmtINR(fc.predictedCost)}`} sub={`Occ +5% ₹${fmtINR(fc.occupancyUpProfit)}`} icon={DollarSign} tone="amber" /></div>
            </>
          );
        })()}
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['daily', 'settlements', 'gst', 'payouts'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'daily' ? 'Daily Earnings' : t === 'settlements' ? 'Settlement Ledger' : t === 'gst' ? 'GST & Tax Summary' : 'Payout Calendar'}</button>
        ))}
      </div>

      {tab === 'daily' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Daily Earnings (Net)</h3>
            {daily.length ? <div className="space-y-2">{daily.map(([date, v]) => (
              <div key={date} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>{date}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-raised)]"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (v.net / 10000) * 100)}%` }} /></div>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(v.net)}</span>
                </div>
              </div>
            ))}</div> : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No earnings yet.</p>}
          </Card>
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Channel-wise Commission</h3>
            <div className="space-y-3">
              {channelData.map((c) => (
                <div key={c.channel} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.channel}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.count} bookings · ₹{fmtINR(c.gross)} gross</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">₹{fmtINR(c.net)}</p>
                    <p className="text-xs text-red-500">₹{fmtINR(c.gross - c.net)} commission</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'settlements' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Settlement Ledger</h3>
          {settlements.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>{['Period', 'Channel', 'Gross', 'Commission', 'GST', 'Net Payable', 'Status'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {settlements.map((s) => (
                    <tr key={s.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>{s.period}</td>
                      <td className="px-3 py-2.5"><Badge tone={s.channel === 'YLT' ? 'green' : 'blue'}>{s.channel ?? 'All'}</Badge></td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(s.gross_amount)}</td>
                      <td className="px-3 py-2.5 text-red-500">₹{fmtINR(s.commission_amount)}</td>
                      <td className="px-3 py-2.5 text-amber-500">₹{fmtINR(s.gst_amount)}</td>
                      <td className="px-3 py-2.5 font-bold text-emerald-600">₹{fmtINR(s.net_payable)}</td>
                      <td className="px-3 py-2.5"><Badge tone={s.status === 'paid' ? 'green' : 'amber'}>{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyStateCard icon={Receipt} title="No settlements yet" description="Settlement records will appear here once channel payouts are processed." />}
        </Card>
      )}

      {tab === 'gst' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>GST & Tax Summary</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total GST Collected</p><p className="font-display text-2xl font-bold text-amber-500">₹{fmtINR(totals.gst)}</p></div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Commission</p><p className="font-display text-2xl font-bold text-red-500">₹{fmtINR(totals.commission)}</p></div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Net After Tax</p><p className="font-display text-2xl font-bold text-emerald-600">₹{fmtINR(totals.net)}</p></div>
          </div>
        </Card>
      )}

      {tab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending: <span className="font-bold text-amber-500">₹{fmtINR(pendingPayouts)}</span> · {pendingSettlements} settlements pending</p>
            <RippleButton className="text-sm" onClick={() => setAddingPayout(true)}><Plus className="h-4 w-4" /> Request Payout</RippleButton>
          </div>
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Payout Calendar</h3>
            {payouts.length ? (
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    <Calendar className="h-4 w-4 text-crimson-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.period}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Requested: {new Date(p.requested_at).toLocaleDateString()}{p.utr_number && ` · UTR: ${p.utr_number}`}</p>
                    </div>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(p.amount)}</span>
                    <Badge tone={p.status === 'paid' ? 'green' : 'amber'}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            ) : <EmptyStateCard icon={Wallet} title="No payouts requested" description="Request a payout to withdraw your earnings." ctaLabel="Request Payout" onCta={() => setAddingPayout(true)} />}
          </Card>
          {addingPayout && <PayoutModal onClose={() => setAddingPayout(false)} onSave={async (d) => { await insert('erp_payouts', d); await logAction('request_payout', 'erp_payouts', '', d); setAddingPayout(false); }} />}
        </div>
      )}
    </div>
  );
}

function PayoutModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ period: '', amount: 0, notes: '' });
  return (
    <Modal open onClose={onClose} title="Request Payout">
      <div className="space-y-3">
        <Field label="Period"><input className={inputCls} placeholder="e.g. Week of Jul 14-20" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} /></Field>
        <Field label="Amount (₹)"><input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></Field>
        <Field label="Notes"><input className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave({ ...f, status: 'pending', requested_at: new Date().toISOString() })}>Request</RippleButton>
        </div>
      </div>
    </Modal>
  );
}
