import { useState } from 'react';
import {
  Menu, X, User, Shield, Briefcase, LogOut, Settings,
} from 'lucide-react';
import { useNav, type View } from '../store/nav';
import { useAuth } from '../lib/auth';
import { YltLogo } from './BrandLogo';

const publicItems: { label: string; view: View }[] = [
  { label: 'Buses', view: { name: 'routes' } },
  { label: 'Hotels', view: { name: 'hotels' } },
  { label: 'Bookings', view: { name: 'bookings' } },
  { label: 'Help', view: { name: 'help' } },
  { label: 'Careers', view: { name: 'careers' } },
];

interface Props { onLoginClick: () => void; }

export default function Header({ onLoginClick }: Props) {
  const { view, go } = useNav();
  const { user, signOut, isAgent, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigate(v: View) {
    go(v);
    setMobileOpen(false);
  }

  function handleSignOut() {
    signOut();
    go({ name: 'home' });
  }

  const isOperator = isAdmin && (user?.role === 'operator' || user?.role === 'manager');

  const staffItem: { label: string; view: View } | null = isOperator
    ? { label: 'Operator ERP', view: { name: 'operator' } }
    : isAdmin
      ? { label: 'Admin Panel', view: { name: 'admin' } }
      : isAgent
        ? { label: user?.partner_kind === 'agent' ? 'Agent portal' : 'Partner ERP', view: { name: 'partner' } }
        : null;

  const navItems = staffItem ? [staffItem, ...publicItems] : publicItems;

  return (
    <header className="app-header">
      <div className="container-fluid flex h-16 items-center justify-between gap-3">
        <button onClick={() => navigate({ name: 'home' })} className="flex shrink-0 items-center gap-2">
          <YltLogo size={36} />
          <span className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>YLT <span className="text-gold-600">Travels</span></span>
        </button>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 md:flex">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.view)}
              className={`nav-item shrink-0 px-2.5 ${view.name === item.view.name ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onLoginClick} className={user ? 'flex items-center gap-2 rounded-xl border bg-[var(--bg-raised)] px-3 py-2 text-sm font-medium transition hover:border-gold-500/50' : 'btn-primary text-sm'} style={user ? { borderColor: 'var(--border)', color: 'var(--text-primary)' } : undefined}>
            {user ? (
              <>
                <div className="grid h-7 w-7 place-items-center rounded-full bg-navy-800 text-xs font-bold text-gold-300">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-[120px] truncate text-xs sm:block">
                  {user.name || user.email}
                </span>
              </>
            ) : (
              <><User className="h-4 w-4" /> Login</>
            )}
          </button>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--bg-raised)] md:hidden"
            style={{ color: 'var(--text-primary)' }}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-drawer md:hidden">
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
            {user && (
              <>
                <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                {isAgent && (
                  <button onClick={() => navigate({ name: 'partner' })} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-secondary)' }}>
                    <Briefcase className="h-4 w-4 text-[var(--text-muted)]" /> {user?.partner_kind === 'agent' ? 'Agent portal' : 'Partner ERP'}
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
