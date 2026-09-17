import { useState } from 'react';
import { Ticket, Plus, Lock, XCircle, CheckCircle, BarChart3, Trash2, Download } from 'lucide-react';
import { useErpStore, fmtINR, type ErpSeatInventory, type ErpChannelSale } from '../../store/erpStore';
import { Card, StatCard, Badge, Modal, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

const today = new Date().toISOString().slice(0, 10);

export default function SeatInventoryEngine() {
  const { buses, seatInventory, seatLocks, channelSales, insert, update, logAction, loading } = useErpStore();
  const [tab, setTab] = useState<'inventory' | 'locks' | 'bookings' | 'channels'>('inventory');
  const [selBus, setSelBus] = useState<string>('');
  const [selDate, setSelDate] = useState(today);
  const [addingSale, setAddingSale] = useState(false);

  if (loading && !buses.length) return <ErpLoader label="Loading seat inventory…" />;

  const inv = seatInventory.filter((s) => (!selBus || s.bus_id === selBus) && (!selDate || s.travel_date === selDate));
  const available = inv.filter((s) => s.status === 'available').length;
  const booked = inv.filter((s) => s.status === 'booked').length;
  const locked = inv.filter((s) => s.status === 'locked').length;
  const activeLocks = seatLocks.filter((l) => l.status === 'active');
  const channels = ['YLT', 'RedBus', 'AbhiBus'];
  const channelStats = channels.map((ch) => {
    const sales = channelSales.filter((s) => s.channel === ch);
    return { channel: ch, count: sales.length, revenue: sales.reduce((s, x) => s + x.net_amount, 0) };
  });

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={["Operations", "Seat Inventory & Booking Engine"]}
        title="Seat Inventory & Booking Engine"
        description="Centralized inventory, seat locks, bookings & multi-channel sales."
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Available Seats" value={String(available)} icon={Ticket} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Booked" value={String(booked)} icon={CheckCircle} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Locked" value={String(locked)} icon={Lock} tone="amber" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Active Locks" value={String(activeLocks.length)} icon={Lock} tone="blue" /></div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['inventory', 'locks', 'bookings', 'channels'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'inventory' ? 'Centralized Inventory' : t === 'locks' ? 'Seat Lock Engine' : t === 'bookings' ? 'Booking Confirmation' : 'Channel-wise Sales'}</button>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select className={inputCls + ' max-w-xs'} value={selBus} onChange={(e) => setSelBus(e.target.value)}>
              <option value="">All Buses</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="date" className={inputCls + ' max-w-xs'} value={selDate} onChange={(e) => setSelDate(e.target.value)} />
            <RippleButton className="text-sm" onClick={async () => {
              if (!selBus) return;
              const bus = buses.find((b) => b.id === selBus);
              if (!bus) return;
              const seats = Array.from({ length: bus.total_seats }, (_, i) => ({
                bus_id: selBus, travel_date: selDate, seat_number: `${i + 1}`, status: 'available',
              }));
              await Promise.all(seats.map((s) => insert('erp_seat_inventory', s)));
              await logAction('init_inventory', 'erp_seat_inventory', selBus, { bus: bus.name, date: selDate });
            }}><Plus className="h-4 w-4" /> Init Seats for Bus</RippleButton>
          </div>
          {inv.length ? (
            <Card>
              <div className="grid gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10">
                {inv.map((s) => (
                  <div key={s.id} className={`grid h-10 place-items-center rounded-md text-xs font-medium transition hover:scale-105 ${
                    s.status === 'available' ? 'bg-crimson-500/30 text-crimson-600' :
                    s.status === 'booked' ? 'bg-gray-400/40 text-gray-300' :
                    'bg-amber-500/30 text-amber-600'
                  }`}>{s.seat_number}</div>
                ))}
              </div>
              <div className="mt-4 flex gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-crimson-500/30" /> Available</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500/30" /> Locked</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-400/40" /> Booked</span>
              </div>
            </Card>
          ) : <EmptyStateCard icon={Ticket} title="No seat inventory" description="Initialize seats for a bus to start managing inventory and bookings." ctaLabel="Init Seats" onCta={() => { if (selBus) { /* trigger init */ } }} />}
        </div>
      )}

      {tab === 'locks' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Seat Lock Engine</h3>
          {activeLocks.length ? (
            <div className="space-y-2">
              {activeLocks.map((l) => {
                const bus = buses.find((b) => b.id === l.bus_id);
                const expired = new Date(l.expires_at) < new Date();
                return (
                  <div key={l.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    <Lock className={`h-4 w-4 ${expired ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bus?.name ?? l.bus_id} · {l.travel_date}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Seats: {(l.seat_numbers as string[]).join(', ')} · Expires: {new Date(l.expires_at).toLocaleTimeString()}</p>
                    </div>
                    <Badge tone={expired ? 'red' : 'amber'}>{expired ? 'Expired' : 'Active'}</Badge>
                    <button onClick={async () => { await update('erp_seat_locks', l.id, { status: 'released' }); await logAction('release_lock', 'erp_seat_locks', l.id); }} className="text-xs font-medium text-crimson-600">Release</button>
                  </div>
                );
              })}
            </div>
          ) : <EmptyStateCard icon={Lock} title="No active seat locks" description="Seat locks will appear here when customers are in the booking flow." />}
        </Card>
      )}

      {tab === 'bookings' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Booking Confirmation & Cancellation</h3>
          {inv.filter((s) => s.status === 'booked' || s.status === 'cancelled').length ? (
            <div className="space-y-2">
              {inv.filter((s) => s.status === 'booked' || s.status === 'cancelled').slice(0, 30).map((s) => {
                const bus = buses.find((b) => b.id === s.bus_id);
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    {s.status === 'booked' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Seat {s.seat_number} — {bus?.name ?? 'Unknown'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PNR: {s.booking_pnr ?? '—'} · {s.passenger_name ?? '—'} · {s.travel_date}</p>
                    </div>
                    <Badge tone={s.status === 'booked' ? 'green' : 'red'}>{s.status}</Badge>
                    {s.status === 'booked' && <button onClick={async () => { await update('erp_seat_inventory', s.id, { status: 'cancelled' }); await logAction('cancel_booking', 'erp_seat_inventory', s.id); }} className="text-xs font-medium text-red-500">Cancel</button>}
                  </div>
                );
              })}
            </div>
          ) : <EmptyStateCard icon={Ticket} title="No bookings yet" description="Confirmed and cancelled bookings will be tracked here." />}
        </Card>
      )}

      {tab === 'channels' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <RippleButton className="text-sm" onClick={() => setAddingSale(true)}><Plus className="h-4 w-4" /> Add Sale</RippleButton>
          </div>
          <div className="grid grid-cols-12 gap-4">
            {channelStats.map((cs) => (
              <div className="col-span-12 sm:col-span-6 lg:col-span-4"><Card key={cs.channel}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cs.channel}</p>
                    <p className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(cs.revenue)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cs.count} bookings</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-crimson-500/30" />
                </div>
              </Card></div>
            ))}
          </div>
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Channel-wise Sales Records</h3>
            {channelSales.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>{['PNR', 'Channel', 'Route', 'Date', 'Seats', 'Gross', 'Commission', 'Net'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {channelSales.slice(0, 30).map((s) => (
                      <tr key={s.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-crimson-600">{s.booking_pnr}</td>
                        <td className="px-3 py-2.5"><Badge tone={s.channel === 'YLT' ? 'green' : s.channel === 'RedBus' ? 'blue' : 'amber'}>{s.channel}</Badge></td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>{s.route ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{s.travel_date}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{s.seats_sold}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(s.gross_amount)}</td>
                        <td className="px-3 py-2.5 text-red-500">₹{fmtINR(s.commission_amount)}</td>
                        <td className="px-3 py-2.5 font-bold text-emerald-600">₹{fmtINR(s.net_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyStateCard icon={BarChart3} title="No channel sales recorded" description="Record sales from YLT, RedBus, and AbhiBus channels to track revenue." ctaLabel="Add Sale" onCta={() => setAddingSale(true)} />}
          </Card>
          {addingSale && <SaleModal onClose={() => setAddingSale(false)} onSave={async (d) => { await insert('erp_channel_sales', d); await logAction('add_sale', 'erp_channel_sales', '', d); setAddingSale(false); }} />}
        </div>
      )}
    </div>
  );
}

function SaleModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ booking_pnr: `YLTS${Math.random().toString(36).slice(2, 6).toUpperCase()}`, channel: 'YLT', route: '', travel_date: today, seats_sold: 1, gross_amount: 0, commission_pct: 8 });
  const commission = Math.round(f.gross_amount * f.commission_pct / 100);
  const net = f.gross_amount - commission;
  return (
    <Modal open onClose={onClose} title="Add Channel Sale">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="PNR"><input className={inputCls} value={f.booking_pnr} onChange={(e) => setF({ ...f, booking_pnr: e.target.value })} /></Field>
          <Field label="Channel"><select className={inputCls} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}><option>YLT</option><option>RedBus</option><option>AbhiBus</option></select></Field>
        </div>
        <Field label="Route"><input className={inputCls} value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Travel Date"><input type="date" className={inputCls} value={f.travel_date} onChange={(e) => setF({ ...f, travel_date: e.target.value })} /></Field>
          <Field label="Seats Sold"><input type="number" className={inputCls} value={f.seats_sold} onChange={(e) => setF({ ...f, seats_sold: +e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gross Amount"><input type="number" className={inputCls} value={f.gross_amount} onChange={(e) => setF({ ...f, gross_amount: +e.target.value })} /></Field>
          <Field label="Commission %"><input type="number" className={inputCls} value={f.commission_pct} onChange={(e) => setF({ ...f, commission_pct: +e.target.value })} /></Field>
        </div>
        <div className="rounded-lg bg-[var(--bg-raised)] p-3 text-sm">
          <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Commission:</span><span className="text-red-500">₹{fmtINR(commission)}</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Net Amount:</span><span className="font-bold text-emerald-600">₹{fmtINR(net)}</span></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave({ ...f, commission_amount: commission, net_amount: net, status: 'confirmed' })}>Save</RippleButton>
        </div>
      </div>
    </Modal>
  );
}
