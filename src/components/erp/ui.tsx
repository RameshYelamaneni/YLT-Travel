import type React from 'react';
import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Search, ChevronRight } from 'lucide-react';

export const inputCls = 'w-full rounded-lg border bg-[var(--bg-raised)] px-3 py-2 text-sm outline-none focus:border-crimson-500';

// ============================================================
// Card — base surface
// ============================================================

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
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

// ============================================================
// StatCard — KPI card with icon, value, sub, trend, click action
// ============================================================

export function StatCard({
  label, value, sub, icon: Icon, tone = 'crimson', trend, onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'crimson' | 'blue' | 'green' | 'amber' | 'teal';
  trend?: { value: string; up: boolean };
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    crimson: 'text-crimson-600 bg-crimson-500/10',
    blue: 'text-blue-600 bg-blue-500/10',
    green: 'text-emerald-600 bg-emerald-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
    teal: 'text-teal-600 bg-teal-500/10',
  };
  return (
    <Card onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="mt-1 font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
          {trend && (
            <p className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {trend.value}
            </p>
          )}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

// Backward-compatible alias
export const Stat = StatCard;

// ============================================================
// SectionCard — titled section with optional action
// ============================================================

export function SectionCard({
  title, subtitle, action, children, className = '', span,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  span?: number;
}) {
  const colSpan = span ? `lg:col-span-${span}` : '';
  return (
    <Card className={colSpan + ' ' + className}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>}
            {subtitle && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

// ============================================================
// DataTable — sortable, searchable table
// ============================================================

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns, rows, searchable = false, searchKeys, emptyMessage = 'No records found.',
}: {
  columns: Column<T>[];
  rows: T[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [query, setQuery] = useState('');

  let data = rows;
  if (query && searchKeys) {
    const q = query.toLowerCase();
    data = data.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }
  if (sortKey) {
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sortValue) {
      data = [...data].sort((a, b) => {
        const av = col.sortValue!(a);
        const bv = col.sortValue!(b);
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
          <input
            className={inputCls + ' pl-9'}
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left text-xs font-semibold ${col.sortable ? 'cursor-pointer select-none' : ''} ${col.className ?? ''}`}
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b transition hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }}>
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 ${col.className ?? ''}`}>
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Drawer — slide-in panel from right
// ============================================================

export function Drawer({
  open, onClose, title, children, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="erp-overlay-enter fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className={`erp-modal-enter flex h-full w-full flex-col border-l bg-[var(--bg-surface)] ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        style={{ borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-5" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// Badge
// ============================================================

export function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'teal'; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    green: 'bg-emerald-500/15 text-emerald-600',
    amber: 'bg-amber-500/15 text-amber-600',
    red: 'bg-red-500/15 text-red-600',
    blue: 'bg-blue-500/15 text-blue-600',
    gray: 'bg-gray-500/15 text-gray-500',
    teal: 'bg-teal-500/15 text-teal-600',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

// ============================================================
// Modal
// ============================================================

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
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

// ============================================================
// Field, Header, Row, EmptyState — helpers
// ============================================================

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}

export function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
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

// ============================================================
// ModuleHeader — SaaS-style header with breadcrumb, title,
// description, and right-aligned action buttons.
// ============================================================

export function ModuleHeader({
  breadcrumb, title, description, actions,
}: {
  breadcrumb: string[];
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <nav className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
            <span className={i === breadcrumb.length - 1 ? 'text-[var(--text-secondary)]' : ''}>{crumb}</span>
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <Icon className="h-8 w-8 opacity-50" />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}

// ============================================================
// EmptyStateCard — structured empty state with icon, title,
// description, and CTA button. Left-aligned, not centered.
// ============================================================

export function EmptyStateCard({
  icon: Icon, title, description, ctaLabel, onCta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-crimson-500/10 text-crimson-600">
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
        {ctaLabel && onCta && (
          <button
            onClick={onCta}
            className="shrink-0 rounded-lg bg-crimson-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-600"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// Sparkline — mini inline revenue/trend chart
// ============================================================

export function Sparkline({ data, color = '#cd2c40', height = 48 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const path = `M ${points.join(' L ')}`;
  const area = `${path} L ${w},${height} L 0,${height} Z`;
  const gid = `spark-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ============================================================
// BarChart — horizontal bar list for category breakdowns
// ============================================================

export function BarChart({ items, color = 'bg-crimson-500' }: { items: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Math.round(item.value).toLocaleString('en-IN')}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-raised)' }}>
            <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {!items.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data.</p>}
    </div>
  );
}
