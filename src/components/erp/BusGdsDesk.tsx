import { useEffect, useState } from 'react';
import {
  Bus, Users, Briefcase, Calculator, Ticket, UserCircle, FileText, ChevronLeft, ChevronRight,
  Headphones, MapPin, Search, Printer, Calendar, Percent, BarChart3, Megaphone, Wallet,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { todayIso, addDaysIso } from '../../lib/pmsMetrics';
import { fmtINR } from '../../store/partnerHotelStore';

type Mix = { office: number; agent: number; api: number; website: number };
type Snap = {
  date: string;
  booked: number;
  blocked: number;
  quota: number;
  revenue: number;
  mix: Mix;
  recent: { pnr: string; from_city: string; to_city: string; status: string; created_at: string; channel?: string }[];
};

const emptyMix: Mix = { office: 0, agent: 0, api: 0, website: 0 };

export default function BusGdsDesk({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [date, setDate] = useState(todayIso());
  const [snap, setSnap] = useState<Snap | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/ops.php?resource=inventory&date=${encodeURIComponent(date)}`);
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok || data.ok === false) {
          setErr(data.error || 'Could not load inventory.');
          setSnap(null);
          return;
        }
        setErr(null);
        setSnap({
          date: data.date || date,
          booked: Number(data.booked || 0),
          blocked: Number(data.blocked || 0),
          quota: Number(data.quota || 0),
          revenue: Number(data.revenue || 0),
          mix: { ...emptyMix, ...(data.mix || {}) },
          recent: Array.isArray(data.recent) ? data.recent : [],
        });
      } catch {
        if (alive) setErr('Could not load inventory.');
      }
    })();
    return () => { alive = false; };
  }, [date]);

  const mix = snap?.mix || emptyMix;
  const tiles: { label: string; icon: React.ComponentType<{ className?: string }>; target: string; tone: string }[] = [
    { label: 'Bus configuration', icon: Bus, target: 'bus_config', tone: 'bg-sky-600' },
    { label: 'Direct agents', icon: Users, target: 'bus_customers', tone: 'bg-teal-600' },
    { label: 'Employee management', icon: UserCircle, target: 'bus_crew', tone: 'bg-slate-700' },
    { label: 'Accounting', icon: Calculator, target: 'bus_expenses', tone: 'bg-amber-500' },
    { label: 'Other bookings', icon: Ticket, target: 'bus_bookings', tone: 'bg-blue-700' },
    { label: 'My account', icon: Briefcase, target: 'partner_profile', tone: 'bg-cyan-700' },
    { label: 'Reports', icon: FileText, target: 'bus_analytics', tone: 'bg-violet-600' },
  ];

  const weekday = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Bus ERP</p>
        <h1 className="font-display text-2xl font-bold">Operations desk</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Live seat mix from YLT MySQL — office, agent, API, and website. No third-party CRS.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border bg-gradient-to-r from-amber-50 to-orange-50 p-5 text-left" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <Headphones className="h-8 w-8 text-amber-600" />
            <div>
              <p className="font-display text-lg font-bold">YLT Care</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>24/7 support for travellers and partners. Open the public Help hub, or email care@ylttravels.com.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="btn-ghost px-2" onClick={() => setDate(addDaysIso(date, -1))}><ChevronLeft className="h-4 w-4" /></button>
            <p className="font-semibold">{weekday}</p>
            <button type="button" className="btn-ghost px-2" onClick={() => setDate(addDaysIso(date, 1))}><ChevronRight className="h-4 w-4" /></button>
          </div>
          {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span><b className="text-emerald-700">Booked {snap?.booked ?? 0}</b> · ₹{fmtINR(snap?.revenue || 0)}</span>
            <span className="text-red-600">Blocked {snap?.blocked ?? 0}</span>
            <span>Quota {snap?.quota ?? 0}</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            {(['office', 'agent', 'api', 'website'] as const).map((k) => (
              <div key={k} className="rounded-lg bg-[var(--bg-raised)] py-2">
                <p className="uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{k}</p>
                <p className="font-display text-lg font-bold">{mix[k]}</p>
              </div>
            ))}
          </div>
          {snap?.recent?.[0] && (
            <p className="mt-3 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Recent · {snap.recent[0].pnr} · {snap.recent[0].from_city} → {snap.recent[0].to_city} · {snap.recent[0].channel || 'website'}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {tiles.map((t) => (
          <button key={t.label} type="button" onClick={() => onNavigate(t.target)} className={`${t.tone} flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-xl p-4 text-white shadow-sm`}>
            <t.icon className="h-8 w-8" />
            <span className="text-center text-sm font-semibold">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'bus_search', label: 'Search services', icon: Search },
          { id: 'bus_print', label: 'Print ticket', icon: Printer },
          { id: 'bus_cities', label: 'Cities', icon: MapPin },
          { id: 'bus_trips', label: 'Schedule', icon: Calendar },
          { id: 'bus_cancel', label: 'Cancellation', icon: Percent },
          { id: 'bus_analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'bus_campaigns', label: 'Campaigns', icon: Megaphone },
          { id: 'bus_deposits', label: 'Deposits', icon: Wallet },
        ].map((l) => (
          <button key={l.id} type="button" className="btn-ghost text-sm" onClick={() => onNavigate(l.id)}>
            <l.icon className="h-4 w-4" /> {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
