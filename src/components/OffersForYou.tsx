import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Ticket } from 'lucide-react';
import type { View } from '../store/nav';
import { fetchOffers, type YltOffer } from '../lib/offers';

type Tab = 'All' | 'Bus' | 'Hotel' | 'Car';

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatTill(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function bucket(tag: string): Tab | 'Other' {
  const t = tag.trim().toLowerCase();
  if (t === 'hotel' || t === 'stay' || t === 'hotels') return 'Hotel';
  if (t === 'car' || t === 'cars' || t === 'cab') return 'Car';
  if (t === 'bus' || t === 'women' || t === 'buses') return 'Bus';
  return 'Other';
}

function dest(tag: string): View {
  const b = bucket(tag);
  if (b === 'Hotel') return { name: 'hotels' };
  if (b === 'Car') return { name: 'cars' };
  return { name: 'routes' };
}

function cardLook(tag: string, i: number) {
  const b = bucket(tag);
  if (b === 'Hotel') return { bg: '#FDE68A', pill: '#92400E' };
  if (b === 'Car') return { bg: '#D1FAE5', pill: '#047857' };
  if (tag.toLowerCase() === 'women') return { bg: '#FBCFE8', pill: '#9D174D' };
  if (tag.toLowerCase() === 'pay') return { bg: '#DBEAFE', pill: '#1E3A8A' };
  const bus = [
    { bg: '#FBE4D8', pill: '#9A3412' },
    { bg: '#FEF3C7', pill: '#B45309' },
    { bg: '#FAD4E0', pill: '#9F1239' },
    { bg: '#F5E6C8', pill: '#78350F' },
  ];
  return bus[i % bus.length];
}

function pillLabel(tag: string) {
  const b = bucket(tag);
  if (b === 'Hotel' || b === 'Car' || b === 'Bus') return b;
  return tag || 'YLT';
}

export default function OffersForYou({
  go,
  variant = 'home',
}: {
  go: (v: View) => void;
  variant?: 'home' | 'page';
}) {
  const [offers, setOffers] = useState<YltOffer[] | null>(null);
  const [tab, setTab] = useState<Tab>('All');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchOffers().then((rows) => {
      if (!alive) return;
      const cut = todayIso();
      setOffers(rows.filter((o) => o.is_active !== false && (!o.expiry_date || o.expiry_date >= cut)));
    });
    return () => { alive = false; };
  }, []);

  const hasCar = (offers || []).some((o) => bucket(o.tag) === 'Car');
  const tabs: Tab[] = hasCar ? ['All', 'Bus', 'Hotel', 'Car'] : ['All', 'Bus', 'Hotel'];

  const visible = useMemo(() => {
    const rows = offers || [];
    if (tab === 'All') return rows;
    return rows.filter((o) => bucket(o.tag) === tab);
  }, [offers, tab]);

  async function copyCode(e: MouseEvent, code: string) {
    e.stopPropagation();
    e.preventDefault();
    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
    setCopied(code);
    window.setTimeout(() => setCopied((cur) => (cur === code ? null : cur)), 1600);
  }

  const emptyAll = offers !== null && offers.length === 0;
  const emptyTab = offers !== null && offers.length > 0 && visible.length === 0;

  return (
    <section className={variant === 'page' ? 'container-fluid py-10' : ''}>
      <div className="ylt-offers-panel rounded-3xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Offers for you</h2>
          {variant === 'home' && (
            <button type="button" onClick={() => go({ name: 'offers' })} className="shrink-0 text-sm font-medium text-crimson-700 hover:underline">
              View more
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Offer categories">
          {tabs.map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${on ? 'bg-[#F4C4B0] text-slate-900' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {offers === null && (
          <p className="mt-6 text-sm text-slate-500">Loading YLT offers…</p>
        )}

        {emptyAll && (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            No published YLT offers right now. Codes appear here when Admin posts them.
          </p>
        )}

        {emptyTab && (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            No YLT {tab.toLowerCase()} offers right now.
          </p>
        )}

        {visible.length > 0 && (
          <div className={`mt-5 ${variant === 'page' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'ylt-offers-row'}`}>
            {visible.map((o, i) => {
              const look = cardLook(o.tag, i);
              const till = formatTill(o.expiry_date);
              const badge = o.discount_value && o.discount_value !== o.promo_code ? o.discount_value : '';
              return (
                <article
                  key={o.id || o.promo_code}
                  className={`ylt-offer-card ${variant === 'home' ? 'w-[240px] shrink-0 sm:w-[260px]' : ''}`}
                  style={{ background: look.bg }}
                >
                  <button type="button" className="w-full text-left" onClick={() => go(dest(o.tag))}>
                    <span className="inline-flex rounded-md border border-black/10 bg-white/80 px-2 py-0.5 text-[11px] font-semibold" style={{ color: look.pill }}>
                      {pillLabel(o.tag)}
                    </span>
                    <p className="mt-3 font-display text-[15px] font-bold leading-snug text-slate-900">{o.title}</p>
                    {till ? <p className="mt-2 text-xs text-slate-500">Valid till {till}</p> : null}
                  </button>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => void copyCode(e, o.promo_code)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-slate-800 shadow-sm"
                      title="Copy code"
                    >
                      <Ticket className="h-3.5 w-3.5 text-slate-500" />
                      {copied === o.promo_code ? 'Copied' : o.promo_code}
                    </button>
                    {badge ? (
                      <span className="max-w-[7.5rem] truncate rounded-md bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-crimson-800">
                        {badge}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
