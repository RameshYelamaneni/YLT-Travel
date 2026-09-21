import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Accessibility, BadgeCheck, Bath, Bus as BusIcon, Camera, CheckCircle2, ChevronLeft, ChevronRight, Copy,
  Coffee, DoorOpen, Droplets, HeartPulse, Hotel, Lamp, Layers, MapPin, Moon, Plug, Radio, ShieldCheck,
  Snowflake, Star, Usb, Utensils, Wifi, X, UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Bus } from '../types';
import { formatINR } from '../lib/format';
import { fetchOffers, type YltOffer } from '../lib/offers';
import {
  TRAVEL_POLICY,
  cancellationSlabs,
  isNightService,
  ratingHistogram,
  ratingLabel,
  refundPreview,
  runningDays,
  safetyItems,
  stopDateLabel,
  travellerTags,
  tripAmenities,
  tripOffers,
  weeklyDelaySeries,
  type BusDetailsTab,
} from '../lib/busInsights';
import { tripBundlesFor } from '../data/tripBundles';
import { useNav } from '../store/nav';

export type { BusDetailsTab };

const TABS: { id: BusDetailsTab; label: string }[] = [
  { id: 'insights', label: 'Insights' },
  { id: 'ratings', label: 'Ratings' },
  { id: 'offers', label: 'Offers' },
  { id: 'boarding', label: 'Boarding / Dropping' },
  { id: 'cancellation', label: 'Cancellation' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'policy', label: 'Travel policy' },
];

const AMENITY_ICON: Record<string, LucideIcon> = {
  AC: Snowflake,
  WiFi: Wifi,
  'Charging Point': Plug,
  'Water Bottle': Droplets,
  Blanket: Layers,
  'Reading Light': Lamp,
  CCTV: Camera,
  'USB Port': Usb,
  Toilet: Bath,
  Snacks: Utensils,
  Meals: Utensils,
  Pillow: Layers,
  GPS: Radio,
  'GPS Tracking': Radio,
  'Night crew': Moon,
  'Emergency Exit': DoorOpen,
  'Wheelchair access': Accessibility,
  'First Aid': HeartPulse,
};

function amenityIcon(name: string): LucideIcon {
  return AMENITY_ICON[name] ?? BadgeCheck;
}

export default function BusDetailsSheet({
  bus,
  tab,
  onTab,
  onClose,
}: {
  bus: Bus;
  tab: BusDetailsTab;
  onTab: (t: BusDetailsTab) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [promo, setPromo] = useState<YltOffer[]>([]);
  const [safetyId, setSafetyId] = useState('fitment');
  const [moreDrop, setMoreDrop] = useState(false);
  const [active, setActive] = useState<BusDetailsTab>(tab);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<BusDetailsTab, HTMLElement | null>>>({});
  const chipRefs = useRef<Partial<Record<BusDetailsTab, HTMLButtonElement | null>>>({});
  const lockSpy = useRef(false);
  const jumpedTo = useRef<BusDetailsTab | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let live = true;
    fetchOffers().then((rows) => {
      if (live) setPromo(rows.filter((o) => o.is_active).slice(0, 4));
    });
    return () => { live = false; };
  }, []);

  function sectionOffset(id: BusDetailsTab) {
    const root = scrollerRef.current;
    const el = sectionRefs.current[id];
    if (!root || !el) return 0;
    return el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
  }

  const goTo = useCallback((id: BusDetailsTab, behavior: ScrollBehavior = 'smooth') => {
    lockSpy.current = true;
    jumpedTo.current = id;
    setActive(id);
    onTab(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const move: ScrollBehavior = reduce ? 'auto' : behavior;
    const root = scrollerRef.current;
    if (root) {
      root.scrollTo({ top: Math.max(0, sectionOffset(id) - 6), behavior: move });
    }
    const chip = chipRefs.current[id];
    const nav = navRef.current;
    if (chip && nav) {
      const left = chip.offsetLeft - nav.clientWidth / 2 + chip.offsetWidth / 2;
      nav.scrollTo({ left: Math.max(0, left), behavior: move });
    }
    window.setTimeout(() => { lockSpy.current = false; }, move === 'auto' ? 80 : 520);
  }, [onTab]);

  useEffect(() => {
    if (jumpedTo.current === tab) {
      jumpedTo.current = null;
      return;
    }
    const id = requestAnimationFrame(() => goTo(tab, 'auto'));
    return () => cancelAnimationFrame(id);
  }, [tab, goTo]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const pickActive = () => {
      if (lockSpy.current) return;
      const y = root.scrollTop + 32;
      let current: BusDetailsTab = 'insights';
      for (const t of TABS) {
        const el = sectionRefs.current[t.id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
        if (top <= y) current = t.id;
      }
      setActive(current);
    };

    const io = new IntersectionObserver(() => pickActive(), {
      root,
      threshold: [0, 0.15, 0.4, 0.7, 1],
    });
    for (const t of TABS) {
      const el = sectionRefs.current[t.id];
      if (el) io.observe(el);
    }
    root.addEventListener('scroll', pickActive, { passive: true });
    pickActive();
    return () => {
      io.disconnect();
      root.removeEventListener('scroll', pickActive);
    };
  }, []);

  useEffect(() => {
    const chip = chipRefs.current[active];
    const nav = navRef.current;
    if (!chip || !nav) return;
    const left = chip.offsetLeft - nav.clientWidth / 2 + chip.offsetWidth / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [active]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  const safety = safetyItems(bus);
  const selectedSafety = safety.find((s) => s.id === safetyId) ?? safety[0];
  const days = runningDays(bus);
  const hist = ratingHistogram(bus.rating, bus.reviews);
  const histMax = Math.max(1, ...hist);
  const tags = travellerTags(bus);
  const offers = tripOffers(bus);
  const cancel = cancellationSlabs(bus);
  const amenities = tripAmenities(bus);
  const drops = moreDrop ? bus.dropping_points : bus.dropping_points.slice(0, 3);
  const night = isNightService(bus);
  const preview = refundPreview(bus);
  const rests = bus.rest_stops ?? [];
  const bundles = tripBundlesFor(bus);
  const delayWeek = weeklyDelaySeries(bus);
  const delayPct = delayWeek[0]?.delayPct ?? Math.max(4, 100 - bus.punctuality);
  const { go } = useNav();

  function setSectionEl(id: BusDetailsTab) {
    return (el: HTMLElement | null) => { sectionRefs.current[id] = el; };
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-end sm:items-stretch">
              <button type="button" className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" aria-label="Close bus details" onClick={onClose} />
      <aside className="ylt-bus-details-sheet relative flex h-[min(92dvh,100%)] w-full max-w-md flex-col rounded-t-3xl bg-[var(--bg-surface)] shadow-2xl sm:h-full sm:rounded-none">
        <header className="shrink-0 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Bus details</p>
              <h2 className="mt-1 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{bus.operator}</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{bus.bus_type}</p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Service {bus.service_number}</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="rounded-lg bg-emerald-600 px-2 py-1 text-center text-white">
                <p className="flex items-center gap-1 text-sm font-bold"><Star className="h-3.5 w-3.5 fill-current" /> {bus.rating.toFixed(1)}</p>
                <p className="text-[10px] text-white/80">{bus.reviews} reviews</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border p-1.5" style={{ borderColor: 'var(--border)' }} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {bus.sla_verified && <span className="ylt-result-chip ylt-result-chip--trust"><ShieldCheck className="h-3 w-3" /> Safety check</span>}
            {(bus.sla_verified || bus.women_safety) && <span className="ylt-result-chip ylt-result-chip--trust"><BadgeCheck className="h-3 w-3" /> YLT Safe</span>}
            {bus.rating >= 4.5 && <span className="ylt-result-chip ylt-result-chip--offer"><Star className="h-3 w-3" /> Most trusted</span>}
          </div>
          <button
            type="button"
            onClick={() => goTo('cancellation')}
            className="mt-3 w-full rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-left"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Refund before you pay</p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{preview.headline}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{preview.detail}</p>
          </button>
        </header>

        <div className="relative shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            className="absolute left-0 top-0 z-10 grid h-full w-8 place-items-center bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-surface)] to-transparent"
            aria-label="Scroll sections left"
            onClick={() => navRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
          >
            <ChevronLeft className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
          <div ref={navRef} className="ylt-details-nav overflow-x-auto px-10 py-2" aria-label="Bus details sections">
            <div className="flex min-w-max gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  ref={(el) => { chipRefs.current[t.id] = el; }}
                  aria-current={active === t.id ? 'true' : undefined}
                  onClick={() => goTo(t.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active === t.id ? 'border-crimson-500 bg-crimson-600/10 text-crimson-600' : ''}`}
                  style={active !== t.id ? { borderColor: 'var(--border)', color: 'var(--text-secondary)' } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="absolute right-0 top-0 z-10 grid h-full w-8 place-items-center bg-gradient-to-l from-[var(--bg-surface)] via-[var(--bg-surface)] to-transparent"
            aria-label="Scroll sections right"
            onClick={() => navRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
          >
            <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <div ref={scrollerRef} className="ylt-details-tab min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-8 pb-16">
            <section id="ylt-details-insights" ref={setSectionEl('insights')} className="space-y-5 scroll-mt-2">
              <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-crimson-600/10 via-transparent to-violet-500/10 p-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-crimson-600">Service snapshot</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{bus.operator}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{bus.bus_type}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{bus.punctuality}% on-time · Smart {bus.smart_score}</p>
                  </div>
                  <BusIcon className="h-14 w-14 text-crimson-500/70" />
                </div>
              </section>

              {night && (
                <section className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                    <Moon className="h-3.5 w-3.5" /> Women / night safety
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {bus.night_crew && <li>• Night crew listed on this service (driver + attendant).</li>}
                    {bus.ladies_seats > 0 && <li>• {bus.ladies_seats} ladies-quota seats are marked rose on the seat map.</li>}
                    {(bus.women_safety || bus.sla_verified) && <li>• YLT Safe checks apply to this listing.</li>}
                    <li>• Sit in ladies quota if you prefer. GPS tracking starts after boarding.</li>
                  </ul>
                </section>
              )}

              {(bus.driverName || bus.listing_source === 'catalog') && (
                <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-crimson-600">Duty crew</p>
                  <div className="mt-3 flex items-center gap-3">
                    {bus.driverPhoto ? (
                      <img src={bus.driverPhoto} alt="" className="h-16 w-16 rounded-full border object-cover" style={{ borderColor: 'var(--border)' }} />
                    ) : (
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-crimson-600/10 text-crimson-700">
                        <UserRound className="h-8 w-8" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>{bus.driverName || 'Duty driver'}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {bus.experienceYears ? `${bus.experienceYears} years on this corridor` : 'Assigned for this service'}
                      </p>
                      {bus.conductorName && (
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Conductor · {bus.conductorName}</p>
                      )}
                      {bus.listing_source === 'catalog' && (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Catalog sample crew</p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Bus safety report</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your safety matters to us. Papers appear only after the operator uploads them.</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {safety.filter((s) => s.id !== 'platform').map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSafetyId(s.id)}
                      className={`rounded-xl border px-1 py-3 text-center ${safetyId === s.id ? 'border-crimson-400 bg-crimson-600/10' : ''}`}
                      style={safetyId !== s.id ? { borderColor: 'var(--border)' } : undefined}
                    >
                      <ShieldCheck className={`mx-auto h-5 w-5 ${s.status === 'ready' ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <p className="mt-1 text-[10px] font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-raised)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedSafety.label}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedSafety.detail}</p>
                </div>
                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {bus.sla_verified
                    ? 'This listing passed YLT platform safety checks. Registration, permit and fitment copies are awaiting operator upload.'
                    : 'Vehicle documents for this coach have not been uploaded by the operator yet.'}
                </p>
              </section>

              <section>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last 7 days — running status</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {bus.listing_source === 'catalog' || bus.driverName
                    ? 'Catalog sample assignments for this service (not operator-uploaded papers).'
                    : 'Daily coach assignment is shown only when the operator shares it.'}
                </p>
                <ol className="mt-3 space-y-2">
                  {days.map((d) => (
                    <li key={d.date} className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.label}</span>
                      {d.status === 'listed' ? (
                        <span className="text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {d.note || `Listed service · ${bus.operator}`}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Awaiting operator upload</span>
                      )}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {bus.punctuality}% on-time on this listing · last 7 days delayed about {delayPct}% of trips (catalog sample).
                </p>
              </section>

              {bundles.length > 0 && (
                <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-crimson-600">
                    <Hotel className="h-3.5 w-3.5" /> Bus + stay
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Add a Tirupati / en-route hotel or Tirumala package after the bus.</p>
                  <div className="mt-3 space-y-2">
                    {bundles.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { onClose(); go(b.hrefView); }}
                        className="flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2 text-left"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <span>
                          <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{b.title}</span>
                          <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--text-secondary)' }}>{b.detail}</span>
                        </span>
                        <span className="shrink-0 text-right text-xs font-bold text-crimson-600">{formatINR(b.price)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </section>

            <section id="ylt-details-ratings" ref={setSectionEl('ratings')} className="space-y-4 scroll-mt-2">
              <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Bus service ratings</h3>
                <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-4">
                  <div className="text-center">
                    <p className="font-display text-3xl font-bold text-amber-500">{bus.rating.toFixed(1)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bus.reviews} reviews</p>
                    <span className="mt-1 inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{ratingLabel(bus.rating)}</span>
                  </div>
                  <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = hist[star - 1];
                      return (
                        <div key={star} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          <span className="w-4">{star}★</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-raised)' }}>
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / histMax) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {tags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>What travellers felt</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span key={t} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
              <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Partner ratings</p>
                <p className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>{bus.operator}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--bg-raised)' }}>
                  <div>
                    <p className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{bus.rating.toFixed(1)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{ratingLabel(bus.rating)}</p>
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{bus.reviews.toLocaleString('en-IN')}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total reviews</p>
                  </div>
                </div>
              </section>
            </section>

            <section id="ylt-details-offers" ref={setSectionEl('offers')} className="space-y-3 scroll-mt-2">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Offers</h3>
              {offers.map((o) => (
                <article key={o.id} className="relative overflow-hidden rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  <span className="absolute left-0 top-3 rounded-r-md bg-crimson-600 px-2 py-1 text-[10px] font-bold text-white">{o.badge}</span>
                  <div className="pl-10">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{o.title}</p>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{o.detail}</p>
                      </div>
                      {o.applied && <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Applied</span>}
                    </div>
                    {o.code && (
                      <button type="button" onClick={() => copyCode(o.code!)} className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        <Copy className="h-3 w-3" /> {copied === o.code ? 'Copied' : o.code}
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {promo.map((o) => (
                <article key={o.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-crimson-600">{o.tag}</p>
                  <p className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>{o.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{o.description}</p>
                  <button type="button" onClick={() => copyCode(o.promo_code)} className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <Copy className="h-3 w-3" /> {copied === o.promo_code ? 'Copied' : o.promo_code}
                  </button>
                </article>
              ))}
            </section>

            <section id="ylt-details-boarding" ref={setSectionEl('boarding')} className="space-y-6 scroll-mt-2">
              {rests.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <Coffee className="h-4 w-4 text-crimson-600" /> Rest stops
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Catalog sample halts on this corridor — times can shift with traffic.</p>
                  <ol className="mt-3 space-y-3">
                    {rests.map((stop, i) => (
                      <li key={`${stop.name}-${stop.time}`} className="grid grid-cols-[3.4rem_0.9rem_minmax(0,1fr)] items-start gap-x-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{stop.time}</p>
                          {stop.halt_mins ? <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{stop.halt_mins} min</p> : null}
                        </div>
                        <div className="relative flex h-full justify-center pt-1.5">
                          {i < rests.length - 1 && <span className="absolute top-4 bottom-[-0.85rem] w-px" style={{ backgroundColor: 'var(--border)' }} />}
                          <span className="relative z-10 h-2.5 w-2.5 rounded-full border-2 border-amber-500 bg-[var(--bg-surface)]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stop.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{stop.note || 'Washroom + tea halt'}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              <StopTimeline title="Boarding points" items={bus.boarding_points} bus={bus} kind="boarding" />
              <div>
                <StopTimeline title="Dropping points" items={drops} bus={bus} kind="dropping" />
                {bus.dropping_points.length > 3 && (
                  <button type="button" onClick={() => setMoreDrop((v) => !v)} className="mt-3 w-full rounded-xl bg-crimson-600/10 py-2.5 text-sm font-semibold text-crimson-600">
                    {moreDrop ? 'Show fewer dropping points' : 'View more dropping points'}
                  </button>
                )}
              </div>
            </section>

            <section id="ylt-details-cancellation" ref={setSectionEl('cancellation')} className="scroll-mt-2">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Cancellation policy</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Valid from trip start time · listed fare {formatINR(bus.price)}</p>
              <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-[1fr_auto] gap-2 border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <span>Cancellation time</span>
                  <span>Refund</span>
                </div>
                {cancel.slabs.map((s) => (
                  <div key={s.when} className="grid grid-cols-[1fr_auto] gap-2 border-b px-3 py-2.5 text-sm last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{s.when}</span>
                    <span className="text-right font-medium" style={{ color: 'var(--text-secondary)' }}>{s.refundLabel}</span>
                  </div>
                ))}
              </div>
              <ul className="mt-3 space-y-1 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {cancel.notes.map((n) => <li key={n}>• {n}</li>)}
              </ul>
            </section>

            <section id="ylt-details-amenities" ref={setSectionEl('amenities')} className="scroll-mt-2">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Amenities</h3>
              {amenities.length === 0 ? (
                <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>The operator has not listed amenities for this coach yet.</p>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {amenities.map((name) => {
                    const Icon = amenityIcon(name);
                    return (
                      <div key={name} className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center" style={{ backgroundColor: 'var(--bg-raised)' }}>
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--bg-surface)]">
                          <Icon className="h-6 w-6" style={{ color: 'var(--text-primary)' }} />
                        </span>
                        <p className="text-[11px] font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{name}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {bus.night_crew && <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Night crew verified on this listing.</p>}
            </section>

            <section id="ylt-details-policy" ref={setSectionEl('policy')} className="scroll-mt-2">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Travel policy</h3>
              <div className="mt-3 divide-y" style={{ borderColor: 'var(--border)' }}>
                {TRAVEL_POLICY.map((item) => (
                  <div key={item.q} className="py-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.q}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.a}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Booking tips</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {bus.is_sleeper ? 'Last-row berths may have limited recline on some coaches.' : 'Last-row seats may not recline on some coaches.'}
                  {bus.ladies_seats > 0 ? ` ${bus.ladies_seats} ladies-quota seats are marked on the seat map.` : ''}
                </p>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function StopTimeline({
  title,
  items,
  bus,
  kind,
}: {
  title: string;
  items: Bus['boarding_points'];
  bus: Bus;
  kind: 'boarding' | 'dropping';
}) {
  return (
    <section>
      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>No points listed for this trip.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {items.map((stop, i) => (
            <li key={`${stop.name}-${stop.time}`} className="grid grid-cols-[3.4rem_0.9rem_minmax(0,1fr)] items-start gap-x-2">
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{stop.time}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{stopDateLabel(bus, stop, kind)}</p>
              </div>
              <div className="relative flex h-full justify-center pt-1.5">
                {i < items.length - 1 && <span className="absolute top-4 bottom-[-0.85rem] w-px" style={{ backgroundColor: 'var(--border)' }} />}
                <span className={`relative z-10 h-2.5 w-2.5 rounded-full border-2 bg-[var(--bg-surface)] ${i === 0 ? 'border-crimson-500' : ''}`} style={i !== 0 ? { borderColor: 'var(--border)' } : undefined} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stop.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <MapPin className="mr-0.5 inline h-3 w-3" />
                  {kind === 'boarding' ? bus.from : bus.to}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
