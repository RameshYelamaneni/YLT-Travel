import { useState, useRef, useEffect } from 'react';
import {
  Menu, X, Navigation, Car, Users, Ticket, HelpCircle, Bed,
  ChevronDown, User, Shield, Briefcase, LogOut, Settings,
} from 'lucide-react';
import { useNav, type View } from '../store/nav';
import { useAuth } from '../lib/auth';

const customerItems: { label: string; view: View }[] = [
  { label: 'Home', view: { name: 'home' } },
  { label: 'Bus Bookings', view: { name: 'routes' } },
  { label: 'Car Bookings', view: { name: 'cars' } },
  { label: 'Hotels', view: { name: 'hotels' } },
  { label: 'About', view: { name: 'about' } },
];

interface Props { onLoginClick: () => void; }

export default function Header({ onLoginClick }: Props) {
  const { view, go } = useNav();
  const { user, signOut, isAgent, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function navigate(v: View) {
    go(v);
    setDropOpen(false);
    setMobileOpen(false);
  }

  function handleSignOut() {
    signOut();
    setDropOpen(false);
    go({ name: 'home' });
  }

  const isOperator = isAdmin && (user?.role === 'operator' || user?.role === 'manager');

  // Role-based nav: customers see consumer items; agents/partners see ERP only;
  // operators see operator ERP only; admins see admin only.
  const navItems: { label: string; view: View }[] = isOperator
    ? [{ label: 'Operator ERP', view: { name: 'operator' } }]
    : isAdmin
      ? [{ label: 'Admin Panel', view: { name: 'admin' } }]
      : isAgent
        ? [{ label: 'Partner ERP', view: { name: 'partner' } }]
        : customerItems;

  const showHelp = !isAdmin && !isAgent;

  return (
    <header className="app-header">
      <div className="container-fluid flex h-16 items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-crimson-500 to-crimson-700 font-display font-bold text-white">Y</div>
          <span className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>YLT <span className="text-crimson-500">Transit</span></span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.view)}
              className={`nav-item ${view.name === item.view.name ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
          {showHelp && (
            <button onClick={() => navigate({ name: 'bookings' })} className={`nav-item ${view.name === 'bookings' ? 'active' : ''}`}>
              <Ticket className="h-3.5 w-3.5" /> Bookings
            </button>
          )}
          {showHelp && (
            <button onClick={() => navigate({ name: 'help' })} className={`nav-item ${view.name === 'help' ? 'active' : ''}`}>
              <HelpCircle className="h-3.5 w-3.5" /> Help
            </button>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border bg-[var(--bg-raised)] px-3 py-2 text-sm font-medium transition hover:border-crimson-500/40"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-crimson-600 text-xs font-bold text-white">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-[120px] truncate sm:block text-xs">
                  {user.name || user.email}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
              </button>

              {dropOpen && (
                <div
                  className="absolute right-0 top-full z-[90] mt-2 w-56 rounded-xl border bg-[var(--bg-surface)] py-1.5 shadow-xl"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="border-b px-4 pb-2.5 pt-2" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name || 'Account'}</p>
                    <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                    {(isAdmin || isAgent) && (
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'bg-crimson-500/15 text-crimson-600' : 'bg-blue-500/15 text-blue-600'}`}>
                        {isAdmin ? (user.role ?? 'admin') : 'partner'}
                      </span>
                    )}
                  </div>

                  {/* Customer links */}
                  {!isAdmin && !isAgent && (
                    <DropItem icon={<Ticket className="h-4 w-4" />} label="My Bookings" onClick={() => navigate({ name: 'bookings' })} />
                  )}

                  {/* Partner / Agent */}
                  {isAgent && (
                    <DropItem icon={<Briefcase className="h-4 w-4" />} label="Partner ERP" onClick={() => navigate({ name: 'partner' })} />
                  )}

                  {/* Operator */}
                  {isOperator && (
                    <DropItem icon={<Settings className="h-4 w-4" />} label="Operator ERP" onClick={() => navigate({ name: 'operator' })} />
                  )}

                  {/* Admin */}
                  {isAdmin && !isOperator && (
                    <DropItem icon={<Shield className="h-4 w-4" />} label="Admin Panel" onClick={() => navigate({ name: 'admin' })} />
                  )}

                  <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />

                  <DropItem icon={<LogOut className="h-4 w-4" />} label="Sign Out" onClick={handleSignOut} danger />
                </div>
              )}
            </div>
          ) : (
            <button onClick={onLoginClick} className="btn-primary text-sm">
              <User className="h-4 w-4" /> Sign In
            </button>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--bg-raised)] lg:hidden"
            style={{ color: 'var(--text-primary)' }}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-drawer lg:hidden">
          <div className="container-fluid flex flex-col gap-1 py-3">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.view)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-raised)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.label}
              </button>
            ))}
            {showHelp && (
              <button
                onClick={() => navigate({ name: 'help' })}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-raised)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <HelpCircle className="h-4 w-4 text-[var(--text-muted)]" /> Help
              </button>
            )}
            {user && (
              <>
                <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                {!isAdmin && !isAgent && (
                  <button onClick={() => navigate({ name: 'bookings' })} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-secondary)' }}>
                    <Ticket className="h-4 w-4 text-[var(--text-muted)]" /> My Bookings
                  </button>
                )}
                {isAgent && (
                  <button onClick={() => navigate({ name: 'partner' })} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-secondary)' }}>
                    <Briefcase className="h-4 w-4 text-[var(--text-muted)]" /> Partner ERP
                  </button>
                )}
                {isOperator && (
                  <button onClick={() => navigate({ name: 'operator' })} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-secondary)' }}>
                    <Settings className="h-4 w-4 text-[var(--text-muted)]" /> Operator ERP
                  </button>
                )}
                {isAdmin && !isOperator && (
                  <button onClick={() => navigate({ name: 'admin' })} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-secondary)' }}>
                    <Shield className="h-4 w-4 text-[var(--text-muted)]" /> Admin Panel
                  </button>
                )}
                <button onClick={handleSignOut} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function DropItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition ${danger ? 'text-red-500 hover:bg-red-500/10' : 'hover:bg-[var(--bg-raised)]'}`}
      style={danger ? undefined : { color: 'var(--text-secondary)' }}
    >
      {icon} {label}
    </button>
  );
}
