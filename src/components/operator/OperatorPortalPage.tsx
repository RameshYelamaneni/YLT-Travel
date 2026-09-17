import { useState } from 'react';
import {
  LayoutDashboard, Bus, Users, Fuel, Sparkles, Car, Menu, X, CalendarClock, Briefcase, Route as RouteIcon, Receipt, Ticket,
  LogOut,
} from 'lucide-react';
import { useNav } from '../../store/nav';
import { useAuth } from '../../lib/auth';
import OperatorDashboard from './OperatorDashboard';
import BusFleetManager from './BusFleetManager';
import BusExpenseLedger from './BusExpenseLedger';
import BusDriverRoster from './BusDriverRoster';
import CarFleetManager from './CarFleetManager';
import CarExpenseLedger from './CarExpenseLedger';
import CarDriverRoster from './CarDriverRoster';
import AiDispatchAssistant from './AiDispatchAssistant';
import OperatorBookings from './OperatorBookings';
import PartnerConsoleHeader from './PartnerConsoleHeader';

type Module = 'dashboard' | 'bookings' | 'buses' | 'bus-expenses' | 'bus-roster' | 'cars' | 'car-expenses' | 'car-roster' | 'routes' | 'ai';

const NAV_SECTIONS: { heading: string; items: { id: Module; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    heading: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'bookings', label: 'Bookings', icon: Ticket },
    ],
  },
  {
    heading: 'Bus Operations',
    items: [
      { id: 'buses', label: 'Bus Fleet', icon: Bus },
      { id: 'bus-expenses', label: 'Bus Expenses', icon: Fuel },
      { id: 'bus-roster', label: 'Bus Drivers', icon: Users },
    ],
  },
  {
    heading: 'Car Operations',
    items: [
      { id: 'cars', label: 'Car Fleet', icon: Car },
      { id: 'car-expenses', label: 'Car Expenses', icon: Receipt },
      { id: 'car-roster', label: 'Car Drivers', icon: CalendarClock },
    ],
  },
  {
    heading: 'Intelligence',
    items: [{ id: 'ai', label: 'AI Dispatch', icon: Sparkles }],
  },
];

export default function OperatorPortalPage() {
  const { go } = useNav();
  const { user, signOut } = useAuth();
  const [module, setModule] = useState<Module>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSignOut() {
    signOut();
    go({ name: 'home' });
  }

  if (!user) {
    return (
      <div className="container-fluid py-20 text-center">
        <Briefcase className="mx-auto h-12 w-12 text-crimson-600" />
        <h1 className="mt-4 font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Agent Partner Portal</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Please sign in via the Agent Partner tab to access the ERP.</p>
        <button onClick={() => go({ name: 'home' })} className="btn-ghost mt-6 text-sm">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)]">
      {/* Sidebar — Hostinger-style icon rail */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[72px] flex-col border-r bg-[var(--bg-surface)] transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ borderColor: 'var(--border)' }}>
        <div className="flex h-16 shrink-0 flex-col items-center justify-center border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="font-display text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>YLT</span>
          <span className="text-[8px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>ERP</span>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto py-3 pb-20">
          {NAV_SECTIONS.flatMap((section) => section.items).map((item) => {
            const active = module === item.id;
            const shortLabel = item.label
              .replace('Bus ', '')
              .replace('Car ', '')
              .replace('Fleet', 'Fleet')
              .replace('Expenses', 'Exp.')
              .replace('Drivers', 'Crew')
              .replace('Dispatch', 'AI')
              .replace('Dashboard', 'Home')
              .trim()
              .split(' ')
              .slice(0, 2)
              .join(' ');
            return (
              <button key={item.id} onClick={() => { setModule(item.id); setSidebarOpen(false); }} title={item.label}
                className={`group relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-all duration-150 ${active ? 'bg-crimson-600/15' : 'hover:bg-[var(--bg-raised)]'}`}>
                {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-crimson-600" />}
                <item.icon className={`h-5 w-5 transition-transform ${active ? 'text-crimson-600' : 'group-hover:scale-110'}`} />
                <span className={`text-center text-[9px] font-semibold leading-tight ${active ? 'text-crimson-600' : ''}`} style={active ? undefined : { color: 'var(--text-muted)' }}>{shortLabel}</span>
              </button>
            );
          })}
        </nav>
        <div className="shrink-0 border-t pb-3 pt-2" style={{ borderColor: 'var(--border)' }}>
          <button onClick={handleSignOut} title="Sign Out" className="flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition hover:bg-red-500/10">
            <LogOut className="h-5 w-5 text-red-500" />
            <span className="text-[9px] font-semibold text-red-500">Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:ml-0">
        <div className="flex h-16 items-center justify-between border-b bg-[var(--bg-surface)] px-4 lg:px-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ color: 'var(--text-secondary)' }}><Menu className="h-5 w-5" /></button>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>YLT Transit Operator ERP</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border bg-[var(--bg-raised)] px-3 py-1.5 sm:flex" style={{ borderColor: 'var(--border)' }}>
              <div className="grid h-6 w-6 place-items-center rounded-full bg-crimson-600 text-[10px] font-bold text-white">
                {(user?.name || user?.email || 'O').charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name || user?.email}</span>
              <span className="rounded-full bg-crimson-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-crimson-600">{user?.role ?? 'operator'}</span>
            </div>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-xl border bg-[var(--bg-raised)] px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10" style={{ borderColor: 'var(--border)' }}>
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
        <div className="container-fluid py-6">
          <div className="mb-6">
            <PartnerConsoleHeader />
          </div>
          {module === 'dashboard' && <OperatorDashboard />}
          {module === 'bookings' && <OperatorBookings />}
          {module === 'buses' && <BusFleetManager />}
          {module === 'bus-expenses' && <BusExpenseLedger />}
          {module === 'bus-roster' && <BusDriverRoster />}
          {module === 'cars' && <CarFleetManager />}
          {module === 'car-expenses' && <CarExpenseLedger />}
          {module === 'car-roster' && <CarDriverRoster />}
          {module === 'ai' && <AiDispatchAssistant />}
        </div>
      </div>
    </div>
  );
}
