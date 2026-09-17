import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Bus, Car, Users, Ticket, Wallet, Sparkles, Brain,
  Menu, X, Briefcase, AlertTriangle, Gauge, Home,
  Plus, Trash2, Download, TrendingUp, Fuel, Wrench, ShieldCheck, Hotel,
  LogOut, ArrowLeft, MapPin, Clock, Calendar, Phone, UserCircle, Route,
  BedDouble, Star, ChevronRight, Activity, DollarSign, Percent,
  Shield, Key, FileText, Package, Navigation, Receipt, BarChart3,
} from 'lucide-react';
import {
  usePartnerStore, partnerEarnings, dailyEarnings, slaCompliance, fmtINR,
  type BusAsset, type CarAsset, type Driver,
} from '../../store/partnerStore';
import { usePartnerHotelStore, hotelSlaCompliance, avgOccupancy } from '../../store/partnerHotelStore';
import { useErpStore, fleetHealthScore, crewSlaAverage, totalEarnings, totalExpenses } from '../../store/erpStore';
import { useAuth } from '../../lib/auth';
import { useNav } from '../../store/nav';
import HotelERP from './HotelERP';
import PartnerConsoleHeader from '../operator/PartnerConsoleHeader';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';
import { StatCard, SectionCard, DataTable, Drawer, Sparkline, BarChart } from '../erp/ui';
import BusOperationsSuite from '../erp/BusOperationsSuite';
import CrewWorkforceHub from '../erp/CrewWorkforceHub';
import SeatInventoryEngine from '../erp/SeatInventoryEngine';
import TripSchedulePlanner from '../erp/TripSchedulePlanner';
import EarningsPayoutCenter from '../erp/EarningsPayoutCenter';
import MaintenanceComplianceDesk from '../erp/MaintenanceComplianceDesk';
import IntelligenceInsights from '../erp/IntelligenceInsights';
import ExpenseLedgerManager from '../erp/ExpenseLedgerManager';
import PartnerProfileBranding from '../erp/PartnerProfileBranding';
import AccessSecurity from '../erp/AccessSecurity';

type Module = 'dashboard' | 'cars' | 'hotels' | 'ai'
  | 'bus_ops' | 'crew' | 'seat_inv' | 'trip_plan' | 'earnings_center' | 'maint_desk' | 'intel' | 'expense_ledger' | 'partner_profile' | 'access_sec';

const NAV: { heading: string; items: { id: Module; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  { heading: '', items: [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  ] },
  { heading: 'Operations', items: [
    { id: 'seat_inv', label: 'Seat Inventory & Booking Engine', icon: Ticket },
    { id: 'trip_plan', label: 'Trip & Schedule Planner', icon: Route },
  ] },
  { heading: 'Assets', items: [
    { id: 'bus_ops', label: 'Bus Operations OS', icon: Bus },
    { id: 'cars', label: 'Car Fleet OS', icon: Car },
    { id: 'hotels', label: 'Hotel ERP OS', icon: Hotel },
  ] },
  { heading: 'People & Finance', items: [
    { id: 'crew', label: 'Crew & Workforce Hub', icon: Users },
    { id: 'earnings_center', label: 'Earnings & Payout Center', icon: Wallet },
    { id: 'expense_ledger', label: 'Expense & Ledger Manager', icon: Receipt },
  ] },
  { heading: 'Reliability', items: [
    { id: 'maint_desk', label: 'Maintenance & Compliance Desk', icon: Wrench },
  ] },
  { heading: 'Intelligence', items: [
    { id: 'intel', label: 'Intelligence & Insights', icon: Sparkles },
    { id: 'ai', label: 'AI Assistant', icon: Brain },
  ] },
  { heading: 'Account', items: [
    { id: 'partner_profile', label: 'Agency Profile', icon: Briefcase },
    { id: 'access_sec', label: 'Access & Security', icon: Shield },
  ] },
];

export default function PartnerPortalPage() {
  const [module, setModule] = useState<Module>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, signOut } = useAuth();
  const { go } = useNav();
  const erpStore = useErpStore();

  useEffect(() => { erpStore.loadAll(); }, []);

  function switchModule(m: Module) {
    if (m === module) return;
    setLoading(true);
    setTimeout(() => { setModule(m); setLoading(false); setSidebarOpen(false); }, 180);
  }

  function handleSignOut() { signOut(); go({ name: 'home' }); }

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)]">
      {/* Sidebar — Hostinger-style icon rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[72px] flex-col border-r bg-[var(--bg-surface)] transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Logo / brand */}
        <div className="flex h-16 shrink-0 flex-col items-center justify-center border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="font-display text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>YLT</span>
          <span className="text-[8px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>ERP</span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto py-3 pb-20">
          {/* Back to Home */}
          <button
            onClick={() => { go({ name: 'home' }); setSidebarOpen(false); }}
            className="group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition hover:bg-[var(--bg-raised)]"
            title="Back to Home"
          >
            <Home className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-center text-[9px] font-semibold leading-tight" style={{ color: 'var(--text-muted)' }}>Home</span>
          </button>

          {/* Divider */}
          <div className="my-1 h-px w-10 rounded" style={{ background: 'var(--border)' }} />

          {NAV.map((section) =>
            section.items.map((item) => {
              const active = module === item.id;
              const shortLabel = item.label
                .replace('& ', '')
                .replace('Booking Engine', 'Bookings')
                .replace('Schedule Planner', 'Planner')
                .replace('Operations', 'Ops')
                .replace('Workforce', 'Crew')
                .replace('Compliance', 'Comply')
                .replace('Intelligence', 'Insights')
                .replace('Branding', '')
                .replace('Assistant', 'AI')
                .replace('Profile ', '')
                .trim()
                .split(' ')
                .slice(0, 2)
                .join(' ');
              return (
                <button
                  key={item.id}
                  onClick={() => switchModule(item.id)}
                  title={item.label}
                  className={`group relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-all duration-150 ${
                    active
                      ? 'bg-crimson-600/15'
                      : 'hover:bg-[var(--bg-raised)]'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-crimson-600" />
                  )}
                  <item.icon className={`h-5 w-5 transition-transform ${active ? 'text-crimson-600' : 'group-hover:scale-110'}`} />
                  <span
                    className={`text-center text-[9px] font-semibold leading-tight ${
                      active ? 'text-crimson-600' : ''
                    }`}
                    style={active ? undefined : { color: 'var(--text-muted)' }}
                  >
                    {shortLabel}
                  </span>
                </button>
              );
            })
          )}
        </nav>

        {/* Sign out at bottom */}
        <div className="shrink-0 border-t pb-3 pt-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleSignOut}
            className="flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition hover:bg-red-500/10"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5 text-red-500" />
            <span className="text-[9px] font-semibold text-red-500">Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:ml-0">
        {/* Topbar */}
        <div className="flex h-16 items-center justify-between border-b bg-[var(--bg-surface)] px-4 lg:px-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ color: 'var(--text-secondary)' }}><Menu className="h-5 w-5" /></button>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>YLT Partner ERP · Manage your fleet, bookings &amp; earnings</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border bg-[var(--bg-raised)] px-3 py-1.5 sm:flex" style={{ borderColor: 'var(--border)' }}>
              <div className="grid h-6 w-6 place-items-center rounded-full bg-crimson-600 text-[10px] font-bold text-white">
                {(user?.name || user?.email || 'P').charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name || user?.email}</span>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600">Partner</span>
            </div>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-xl border bg-[var(--bg-raised)] px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10" style={{ borderColor: 'var(--border)' }}>
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Content with page transition */}
        <div className="container-fluid py-6">
          {loading ? (
            <ErpLoader label="Loading module…" />
          ) : (
            <div key={module} className="erp-page-enter">
              {module === 'dashboard' && <Dashboard onNavigate={switchModule} />}
              {module === 'bus_ops' && <BusOperationsSuite />}
              {module === 'crew' && <CrewWorkforceHub />}
              {module === 'seat_inv' && <SeatInventoryEngine />}
              {module === 'trip_plan' && <TripSchedulePlanner />}
              {module === 'earnings_center' && <EarningsPayoutCenter />}
              {module === 'maint_desk' && <MaintenanceComplianceDesk />}
              {module === 'intel' && <IntelligenceInsights />}
              {module === 'expense_ledger' && <ExpenseLedgerManager />}
              {module === 'partner_profile' && <PartnerProfileBranding />}
              {module === 'access_sec' && <AccessSecurity />}
              {module === 'cars' && <CarFleet />}
              {module === 'hotels' && <HotelERP />}
              {module === 'ai' && <AiAssistant />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Shared UI ----

function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border bg-[var(--bg-surface)] p-5 transition-all duration-150 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : ''} ${className}`}
      style={{ borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, tone = 'crimson', onClick }: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; tone?: 'crimson' | 'blue' | 'green' | 'amber'; onClick?: () => void }) {
  const tones: Record<string, string> = { crimson: 'text-crimson-600 bg-crimson-500/10', blue: 'text-blue-600 bg-blue-500/10', green: 'text-emerald-600 bg-emerald-500/10', amber: 'text-amber-600 bg-amber-500/10' };
  return (
    <Card onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="mt-1 font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}

function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'blue' | 'gray'; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    green: 'bg-emerald-500/15 text-emerald-600', amber: 'bg-amber-500/15 text-amber-600',
    red: 'bg-red-500/15 text-red-600', blue: 'bg-blue-500/15 text-blue-600', gray: 'bg-gray-500/15 text-gray-500',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="erp-overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`erp-modal-enter max-h-[90vh] w-full overflow-y-auto rounded-2xl border bg-[var(--bg-surface)] p-6 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        style={{ borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border bg-[var(--bg-raised)] px-3 py-2 text-sm outline-none focus:border-crimson-500';
const todayStr = new Date().toISOString().slice(0, 10);

// ---- Unified Dashboard ----

function Dashboard({ onNavigate }: { onNavigate: (m: Module) => void }) {
  const { buses, cars, drivers, bookings, alerts, commissionRate } = usePartnerStore();
  const { hotels } = usePartnerHotelStore();
  const earnings = partnerEarnings(bookings, commissionRate);
  const sla = slaCompliance(buses, cars, [], drivers);
  const hotelSla = hotelSlaCompliance(hotels);
  const occ = avgOccupancy(hotels);
  const hotelRev = hotels.reduce((s, h) => s + h.monthlyRevenue, 0);
  const fleetHealth = Math.round(((buses.filter((b) => b.status === 'active').length + cars.filter((c) => c.status === 'active').length) / Math.max(1, buses.length + cars.length)) * 100);
  const upcomingMaint = [...buses, ...cars].filter((v: any) => v.nextMaintenance <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).length;
  const permitExpiring = buses.filter((b) => b.permitExpiry <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).length;

  // Revenue trend (last 7 days from bookings)
  const days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const val = bookings.filter((b) => b.date === d && b.status !== 'cancelled').reduce((s, b) => s + b.amount, 0);
    days.push({ label: new Date(d).toLocaleDateString('en-IN', { weekday: 'short' }), value: val });
  }
  const revTrend = days.map((d) => d.value);
  const revLabels = days.map((d) => d.label);

  // Live operations feed
  const liveFeed: { id: string; icon: React.ComponentType<{ className?: string }>; text: string; sub: string; tone: 'green' | 'red' | 'gray' | 'blue' | 'amber' }[] = [
    ...bookings.slice(0, 4).map((b) => ({ id: b.id, icon: b.type === 'bus' ? Bus : b.type === 'car' ? Car : Ticket, text: `${b.pnr} · ${b.route}`, sub: `${b.status} · ₹${fmtINR(b.amount)} · ${b.date}`, tone: (b.status === 'confirmed' ? 'green' : b.status === 'cancelled' ? 'red' : 'gray') as 'green' | 'red' | 'gray' })),
    ...buses.filter((b) => b.status === 'maintenance').slice(0, 2).map((b) => ({ id: b.id, icon: Wrench, text: `${b.name} in maintenance`, sub: `Next service: ${b.nextMaintenance}`, tone: 'amber' as const })),
    ...hotels.slice(0, 1).map((h) => ({ id: h.id, icon: Hotel, text: `${h.name} · ${h.occupancyPct}% occ`, sub: `₹${fmtINR(h.monthlyRevenue)} / mo`, tone: 'blue' as const })),
  ].slice(0, 6);

  const quickActions: { label: string; icon: React.ComponentType<{ className?: string }>; target: Module }[] = [
    { label: 'New Trip', icon: Route, target: 'trip_plan' },
    { label: 'Add Bus', icon: Bus, target: 'bus_ops' },
    { label: 'Add Crew', icon: Users, target: 'crew' },
    { label: 'Record Expense', icon: Receipt, target: 'expense_ledger' },
  ];

  return (
    <div className="space-y-6">
      <PartnerConsoleHeader />

      {/* Row 1: 4 KPI cards (12-col grid, each spans 3) */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Total Bookings" value={String(bookings.length)} sub={`${bookings.filter((b) => b.status === 'confirmed').length} confirmed`} icon={Ticket} tone="crimson" trend={{ value: '+12% vs last week', up: true }} onClick={() => onNavigate('seat_inv')} /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Net Earnings" value={`₹${fmtINR(earnings.partner)}`} sub={`of ₹${fmtINR(earnings.total)} gross`} icon={Wallet} tone="green" trend={{ value: '+8% MoM', up: true }} onClick={() => onNavigate('earnings_center')} /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Fleet Health" value={`${fleetHealth}%`} sub={`${buses.length + cars.length} vehicles`} icon={Gauge} tone="blue" onClick={() => onNavigate('maint_desk')} /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="SLA Compliance" value={`${Math.round((sla + hotelSla) / 2)}%`} sub={`Transport ${sla}% · Hotel ${hotelSla}%`} icon={ShieldCheck} tone={sla >= 90 ? 'green' : 'amber'} onClick={() => onNavigate('intel')} /></div>
      </div>

      {/* Row 2: Quick actions */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quickActions.map((qa) => (
          <button key={qa.label} onClick={() => onNavigate(qa.target)} className="flex items-center gap-3 rounded-xl border bg-[var(--bg-surface)] p-4 text-left transition hover:-translate-y-0.5 hover:border-crimson-500/40 hover:shadow-md" style={{ borderColor: 'var(--border)' }}>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-crimson-500/10 text-crimson-600"><qa.icon className="h-5 w-5" /></div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Row 3: 2-column layout (8 + 4) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Live operations feed (col-span 8) */}
        <div className="col-span-12 lg:col-span-8">
          <SectionCard title="Live Operations Feed" subtitle="Real-time bookings, fleet status & activity" span={8}>
            <div className="space-y-2">
              {liveFeed.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3 transition hover:translate-x-0.5 hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }}>
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--bg-raised)]"><a.icon className="h-4 w-4 text-crimson-500" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.text}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.sub}</p>
                  </div>
                  <Badge tone={a.tone}>{a.tone === 'green' ? 'confirmed' : a.tone === 'red' ? 'cancelled' : a.tone === 'amber' ? 'maintenance' : a.tone === 'blue' ? 'hotel' : 'done'}</Badge>
                </div>
              ))}
              {!liveFeed.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No live activity.</p>}
            </div>
          </SectionCard>
        </div>

        {/* Right: Alerts + Revenue chart (col-span 4) */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <SectionCard title="Alerts" subtitle={`${alerts.filter((a) => a.severity !== 'info').length} active`} action={<Badge tone={fleetHealth >= 80 ? 'green' : 'amber'}>{fleetHealth}% healthy</Badge>}>
            <div className="space-y-2">
              {alerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 rounded-lg border p-2.5" style={{ borderColor: 'var(--border)' }}>
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${a.severity === 'critical' ? 'text-red-500' : a.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.message}</span>
                </div>
              ))}
              {!alerts.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No alerts. All systems nominal.</p>}
            </div>
          </SectionCard>

          <SectionCard title="Revenue Trend" subtitle="Last 7 days · gross bookings">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(revTrend.reduce((a, b) => a + b, 0))}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>7-day total</span>
              </div>
              <Sparkline data={revTrend} color="#cd2c40" height={56} />
              <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {revLabels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Row 4: Secondary KPIs (12-col) */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Total Buses" value={String(buses.length)} sub={`${buses.filter((b) => b.status === 'active').length} active`} icon={Bus} tone="crimson" onClick={() => onNavigate('bus_ops')} /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Total Cars" value={String(cars.length)} sub={`${cars.filter((c) => c.status === 'active').length} active`} icon={Car} tone="blue" onClick={() => onNavigate('cars')} /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Hotels" value={String(hotels.length)} sub={`${occ}% avg occ`} icon={Hotel} tone="green" onClick={() => onNavigate('hotels')} /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Hotel Revenue" value={`₹${fmtINR(hotelRev)}`} sub="Monthly" icon={DollarSign} tone="teal" onClick={() => onNavigate('hotels')} /></div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

// ---- Car Fleet (list + detail + drivers + trips) ----

function CarFleet() {
  const { cars, drivers, addCar, updateCar, removeCar } = usePartnerStore();
  const [editing, setEditing] = useState<CarAsset | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<CarAsset | null>(null);

  if (selected) return <CarDetail car={selected} onBack={() => setSelected(null)} drivers={drivers} onUpdate={updateCar} />;

  return (
    <div className="space-y-5">
      <Header title="Car Fleet" subtitle="Manage cars, drivers, city & outstation trips with clear pricing" action={<RippleButton className="text-sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add Car</RippleButton>} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cars.map((c) => {
          const driver = drivers.find((d) => d.id === c.driverId);
          return (
            <Card key={c.id} onClick={() => setSelected(c)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.type} · {c.pricingModel.replace('_', ' ')}</p>
                </div>
                <Badge tone={c.status === 'active' ? 'green' : c.status === 'maintenance' ? 'amber' : 'gray'}>{c.status}</Badge>
              </div>
              <p className="mt-2 font-display text-xl font-bold text-crimson-600">₹{c.rate}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}> /{c.pricingModel === 'per_km' ? 'km' : c.pricingModel === 'hourly' ? 'hr' : c.pricingModel === 'daily' ? 'day' : 'trip'}</span></p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Mini label="Fuel" value={`${c.fuelPct}%`} icon={Fuel} tone={c.fuelPct < 30 ? 'red' : 'green'} />
                <Mini label="Maint" value={c.nextMaintenance} icon={Wrench} tone={c.nextMaintenance <= todayStr ? 'red' : 'gray'} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Driver: {driver?.name ?? 'Unassigned'}</span>
                <ChevronRight className="h-4 w-4 text-crimson-500" />
              </div>
            </Card>
          );
        })}
      </div>
      {(adding || editing) && (
        <CarForm car={editing} drivers={drivers} onClose={() => { setAdding(false); setEditing(null); }} onSave={(d) => { if (editing) updateCar(editing.id, d); else addCar(d as Omit<CarAsset, 'id'>); setAdding(false); setEditing(null); }} />
      )}
    </div>
  );
}

function CarDetail({ car, onBack, drivers, onUpdate }: { car: CarAsset; onBack: () => void; drivers: Driver[]; onUpdate: (id: string, patch: Partial<CarAsset>) => void }) {
  const [tab, setTab] = useState<'info' | 'trips' | 'driver'>('info');
  const driver = drivers.find((d) => d.id === car.driverId);
  const [trips, setTrips] = useState<{ id: string; type: 'city' | 'outstation'; from: string; to: string; date: string; dist: number; fare: number }[]>([
    { id: 'ct1', type: 'city', from: 'Tirupati', to: 'Airport', date: todayStr, dist: 18, fare: 480 },
    { id: 'ct2', type: 'outstation', from: 'Tirupati', to: 'Chennai', date: todayStr, dist: 130, fare: 1820 },
  ]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ type: 'city' as 'city' | 'outstation', from: '', to: '', date: todayStr, dist: 0, fare: 0 });

  function addTrip() {
    if (!f.from || !f.to) return;
    setTrips([...trips, { id: `ct${Date.now()}`, ...f }]);
    setAdding(false);
    setF({ type: 'city', from: '', to: '', date: todayStr, dist: 0, fare: 0 });
  }

  const unit = car.pricingModel === 'per_km' ? 'km' : car.pricingModel === 'hourly' ? 'hr' : car.pricingModel === 'daily' ? 'day' : 'trip';

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-crimson-600 transition hover:gap-2.5">
        <ArrowLeft className="h-4 w-4" /> Back to Fleet
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{car.name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{car.type} · ₹{car.rate}/{unit}</p>
        </div>
        <Badge tone={car.status === 'active' ? 'green' : car.status === 'maintenance' ? 'amber' : 'gray'}>{car.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={Fuel} label="Fuel" value={`${car.fuelPct}%`} tone={car.fuelPct < 30 ? 'red' : 'green'} />
        <MiniStat icon={Wrench} label="Next Maint" value={car.nextMaintenance} tone={car.nextMaintenance <= todayStr ? 'red' : 'gray'} />
        <MiniStat icon={DollarSign} label="Rate" value={`₹${car.rate}/${unit}`} tone="green" />
        <MiniStat icon={Activity} label="Trips" value={String(trips.length)} tone="blue" />
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['info', 'trips', 'driver'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'info' ? 'Info' : t}</button>
        ))}
      </div>

      {tab === 'info' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Vehicle Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label="Type" value={car.type} />
            <Row label="Pricing Model" value={car.pricingModel.replace('_', ' ')} />
            <Row label="Rate" value={`₹${car.rate} / ${unit}`} />
            <Row label="Fuel" value={`${car.fuelPct}%`} />
            <Row label="Next Maintenance" value={car.nextMaintenance} />
            <Row label="Status" value={car.status} />
          </div>
        </Card>
      )}

      {tab === 'trips' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Trips</h3>
            <RippleButton variant="ghost" className="text-xs" onClick={() => setAdding(!adding)}><Plus className="h-3.5 w-3.5" /> Trip</RippleButton>
          </div>
          {adding && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border p-3 md:grid-cols-6" style={{ borderColor: 'var(--border)' }}>
              <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as any })}><option value="city">City</option><option value="outstation">Outstation</option></select>
              <input className={inputCls} placeholder="From" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
              <input className={inputCls} placeholder="To" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
              <input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
              <input type="number" className={inputCls} placeholder="Km" value={f.dist} onChange={(e) => setF({ ...f, dist: +e.target.value })} />
              <input type="number" className={inputCls} placeholder="Fare" value={f.fare} onChange={(e) => setF({ ...f, fare: +e.target.value })} />
              <RippleButton className="col-span-2 text-xs md:col-span-6" onClick={addTrip}>Add Trip</RippleButton>
            </div>
          )}
          <div className="space-y-2">
            {trips.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }}>
                <Badge tone={t.type === 'city' ? 'blue' : 'red'}>{t.type}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.from} → {t.to}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.date} · {t.dist} km</p>
                </div>
                <span className="font-bold text-crimson-600">₹{fmtINR(t.fare)}</span>
                <button onClick={() => setTrips(trips.filter((x) => x.id !== t.id))} className="text-red-500 transition hover:scale-110"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'driver' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Assigned Driver</h3>
          {driver ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-crimson-600 text-lg font-bold text-white">{driver.name.charAt(0)}</div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{driver.name}</p>
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><Phone className="h-3 w-3" />{driver.phone}</p>
                </div>
                <Badge tone={driver.status === 'active' ? 'green' : 'gray'}>{driver.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Row label="License Expiry" value={driver.licenseExpiry} />
                <Row label="Assigned To" value={car.name} />
              </div>
              <RippleButton variant="ghost" className="text-sm" onClick={() => onUpdate(car.id, { driverId: null })}>Unassign Driver</RippleButton>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>No driver assigned.</p>
              <div className="space-y-2">
                {drivers.map((d) => (
                  <button key={d.id} onClick={() => onUpdate(car.id, { driverId: d.id })}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }}>
                    <UserCircle className="h-5 w-5 text-crimson-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.phone}</p>
                    </div>
                    <Badge tone={d.status === 'active' ? 'green' : 'gray'}>{d.status}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function CarForm({ car, drivers, onClose, onSave }: { car: CarAsset | null; drivers: Driver[]; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({
    name: car?.name ?? '', type: car?.type ?? 'Sedan', pricingModel: car?.pricingModel ?? 'per_km', rate: car?.rate ?? 0,
    driverId: car?.driverId ?? null, status: car?.status ?? 'active', fuelPct: car?.fuelPct ?? 100, nextMaintenance: car?.nextMaintenance ?? '',
  });
  return (
    <Modal open onClose={onClose} title={car ? 'Edit Car' : 'Add Car'}>
      <div className="space-y-3">
        <Field label="Car Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as any })}><option>Sedan</option><option>SUV</option><option>Hatchback</option><option>Luxury</option></select></Field>
          <Field label="Pricing Model"><select className={inputCls} value={f.pricingModel} onChange={(e) => setF({ ...f, pricingModel: e.target.value as any })}><option value="per_km">Per KM</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="subscription">Subscription</option><option value="airport">Airport Fixed</option></select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rate (₹)"><input type="number" className={inputCls} value={f.rate} onChange={(e) => setF({ ...f, rate: +e.target.value })} /></Field>
          <Field label="Fuel %"><input type="number" className={inputCls} value={f.fuelPct} onChange={(e) => setF({ ...f, fuelPct: +e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Next Maintenance"><input type="date" className={inputCls} value={f.nextMaintenance} onChange={(e) => setF({ ...f, nextMaintenance: e.target.value })} /></Field>
          <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="idle">Idle</option></select></Field>
        </div>
        <Field label="Driver"><select className={inputCls} value={f.driverId ?? ''} onChange={(e) => setF({ ...f, driverId: e.target.value || null })}><option value="">Unassigned</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave(f)}>Save</RippleButton>
        </div>
      </div>
    </Modal>
  );
}

// ---- AI Assistant ----

// ---- AI Assistant ----

const AI_QUICK = [
  'Show my earnings today',
  'Which buses need SLA verification?',
  'Which cars are most profitable?',
  'Show my active drivers',
  'Predict demand for tonight',
  'Which routes are losing money?',
  'Generate maintenance schedule',
  'Show vehicles with low fuel',
  'Show upcoming permit expiries',
];

function AiAssistant() {
  const store = usePartnerStore();
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  function answer(q: string): string {
    const s = store;
    const earnings = partnerEarnings(s.bookings, s.commissionRate);
    const today = new Date().toISOString().slice(0, 10);
    const l = q.toLowerCase();
    if (l.includes('earning') && l.includes('today')) {
      const t = s.bookings.filter((b) => b.date === today && b.status !== 'cancelled').reduce((x, b) => x + b.amount, 0);
      return `Today's gross bookings: ₹${fmtINR(t)}. Your share (${(100 - s.commissionRate * 100).toFixed(0)}%): ₹${fmtINR(Math.round(t * (1 - s.commissionRate)))}.`;
    }
    if (l.includes('sla')) {
      const buses = s.buses.filter((b) => b.nextMaintenance <= today || b.permitExpiry <= today || b.status === 'maintenance');
      return buses.length ? `${buses.length} bus(es) need SLA verification: ${buses.map((b) => b.name).join(', ')}.` : 'All buses are SLA-compliant.';
    }
    if (l.includes('profit') && l.includes('car')) {
      const byCar = s.cars.map((c) => ({ c, n: s.bookings.filter((b) => b.type === 'car' && b.status !== 'cancelled').length }));
      byCar.sort((a, b) => b.n - a.n);
      return `Most profitable cars: ${byCar.slice(0, 3).map((x) => `${x.c.name} (${x.n} bookings)`).join(', ')}.`;
    }
    if (l.includes('active') && l.includes('driver')) {
      const active = s.drivers.filter((d) => d.status === 'active');
      return `${active.length} active drivers: ${active.map((d) => d.name).join(', ')}.`;
    }
    if (l.includes('demand')) {
      return `Predicted demand for tonight: ${s.buses.filter((b) => b.status === 'active').length} buses online. Expect ${Math.round(s.bookings.length / 7)} bookings based on weekly trend.`;
    }
    if (l.includes('losing') || l.includes('route') && l.includes('money')) {
      const cancelled = s.bookings.filter((b) => b.status === 'cancelled');
      return cancelled.length ? `${cancelled.length} cancelled bookings lost revenue: ${cancelled.map((b) => b.route).join(', ')}.` : 'No routes are losing money currently.';
    }
    if (l.includes('maintenance') && l.includes('schedule')) {
      const due = [...s.buses, ...s.cars].filter((v: any) => v.nextMaintenance <= new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
      return due.length ? `Maintenance schedule (next 14 days): ${due.map((v: any) => `${v.name} on ${v.nextMaintenance}`).join(', ')}.` : 'No maintenance due in the next 2 weeks.';
    }
    if (l.includes('low') && l.includes('fuel')) {
      const low = [...s.buses, ...s.cars].filter((v: any) => v.fuelPct < 30);
      return low.length ? `Low fuel vehicles: ${low.map((v: any) => `${v.name} (${v.fuelPct}%)`).join(', ')}.` : 'All vehicles have adequate fuel.';
    }
    if (l.includes('permit')) {
      const exp = s.buses.filter((b) => b.permitExpiry <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      return exp.length ? `Permits expiring (30 days): ${exp.map((b) => `${b.name} on ${b.permitExpiry}`).join(', ')}.` : 'No permits expiring soon.';
    }
    return `I can help with earnings, SLA, profitability, drivers, demand, maintenance, fuel, and permits. Try one of the quick actions. Total earnings so far: ₹${fmtINR(earnings.partner)}.`;
  }

  function ask(q: string) {
    setInput(q);
    setBusy(true);
    setReply('');
    setTimeout(() => { setReply(answer(q)); setBusy(false); }, 400);
  }

  return (
    <div className="space-y-5">
      <Header title="AI Assistant" />
      <Card>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ask me anything about your fleet, bookings, earnings, SLA, or maintenance. I read your live partner data.</p>
        <div className="mt-3 flex gap-2">
          <input className={inputCls} placeholder="Ask about your operations…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(input)} />
          <RippleButton className="text-sm" onClick={() => ask(input)} disabled={busy || !input}><Sparkles className="h-4 w-4" /> Ask</RippleButton>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {AI_QUICK.map((q) => (
            <button key={q} onClick={() => ask(q)} className="rounded-full border px-3 py-1.5 text-xs transition hover:border-crimson-500" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{q}</button>
          ))}
        </div>
        {(busy || reply) && (
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-crimson-500" />
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{busy ? 'Analyzing your data…' : reply}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---- Helpers ----

function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Mini({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: 'green' | 'red' | 'gray' }) {
  const tones = { green: 'text-emerald-600', red: 'text-red-500', gray: 'text-[var(--text-muted)]' };
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-raised)] px-2 py-1.5">
      <Icon className={`h-3.5 w-3.5 ${tones[tone]}`} />
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: 'green' | 'red' | 'gray' | 'blue' }) {
  const tones: Record<string, string> = { green: 'text-emerald-600 bg-emerald-500/10', red: 'text-red-500 bg-red-500/10', gray: 'text-[var(--text-muted)] bg-[var(--bg-raised)]', blue: 'text-blue-600 bg-blue-500/10' };
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
