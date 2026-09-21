import { ArrowRight, Bus, Check, Hotel, MapPin, Mountain, X } from 'lucide-react';
import { packageBySlug, TIRUMALA_PACKAGES, type TirumalaPackage } from '../data/tirumalaPackages';
import { formatINR } from '../lib/format';
import { useNav } from '../store/nav';

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function PackagesPage({ slug }: { slug?: string }) {
  const selected = packageBySlug(slug);
  const { go } = useNav();

  if (selected) return <PackageDetail pkg={selected} />;

  return (
    <div>
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="absolute -left-16 top-0 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-crimson-600/10 blur-3xl" />
        <div className="container-fluid relative py-14 sm:py-20 text-center">
          <span className="chip chip-crimson"><Mountain className="h-3.5 w-3.5" /> Tirumala packages</span>
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl" style={{ color: 'var(--text-primary)' }}>
            Darshan packages from HYD, Bengaluru &amp; Chennai
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            Bus + Tirupati hotel + local transfer. Regular darshan is subject to TTD queues — special-entry tickets are not bundled.
          </p>
        </div>
      </section>

      <section className="container-fluid py-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {TIRUMALA_PACKAGES.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Prices shown are starting fares per person for a twin-share hotel. Final quote depends on travel date and occupancy.
        </p>
      </section>
    </div>
  );
}

function PackageCard({ pkg }: { pkg: TirumalaPackage }) {
  const { go } = useNav();
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="bg-gradient-to-br from-navy-900 to-navy-700 px-5 py-6 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">{pkg.originCode} → Tirumala</p>
        <h2 className="mt-2 font-display text-xl font-bold">{pkg.origin} to Tirumala</h2>
        <p className="mt-1 text-sm text-white/80">{pkg.days}D / {pkg.nights}N · {pkg.distanceHint}</p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm text-slate-600">{pkg.summary}</p>
        <p className="mt-4 font-display text-2xl font-bold text-navy-950">
          {formatINR(pkg.priceFrom)} <span className="text-sm font-medium text-slate-500">onwards</span>
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {pkg.includes.slice(0, 3).map((line) => (
            <li key={line} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {line}</li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <button type="button" onClick={() => go({ name: 'packages', slug: pkg.slug })} className="btn-ghost text-sm">
            Itinerary
          </button>
          <button
            type="button"
            onClick={() => go({ name: 'results', from: pkg.origin, to: 'Tirupati', date: tomorrowIso() })}
            className="btn-primary text-sm"
          >
            Search buses <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function PackageDetail({ pkg }: { pkg: TirumalaPackage }) {
  const { go } = useNav();
  return (
    <div className="container-fluid py-10">
      <button type="button" onClick={() => go({ name: 'packages' })} className="text-sm font-semibold text-crimson-700 hover:underline">
        ← All Tirumala packages
      </button>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">{pkg.originCode} → Tirumala</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>{pkg.title}</h1>
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>{pkg.summary}</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{pkg.days} days / {pkg.nights} night · {pkg.durationHint} · {pkg.distanceHint}</p>

          <h2 className="mt-8 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Itinerary</h2>
          <ol className="mt-3 space-y-3">
            {pkg.itinerary.map((step) => (
              <li key={step.day} className="rounded-2xl border bg-white p-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-bold uppercase tracking-wide text-gold-700">{step.day}</p>
                <p className="mt-1 font-semibold text-navy-950">{step.title}</p>
                <p className="mt-1 text-sm text-slate-600">{step.detail}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="font-display font-bold text-navy-950">Included</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {pkg.includes.map((line) => (
                  <li key={line} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {line}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="font-display font-bold text-navy-950">Not included</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {pkg.excludes.map((line) => (
                  <li key={line} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-crimson-600" /> {line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-3xl border bg-white p-6 shadow-sm lg:sticky lg:top-24" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm text-slate-500">From {pkg.origin}</p>
          <p className="mt-1 font-display text-3xl font-bold text-navy-950">{formatINR(pkg.priceFrom)}</p>
          <p className="text-xs text-slate-500">per person, twin share · starting fare</p>
          <button
            type="button"
            onClick={() => go({ name: 'results', from: pkg.origin, to: 'Tirupati', date: tomorrowIso() })}
            className="btn-primary mt-6 w-full"
          >
            <Bus className="h-4 w-4" /> Search {pkg.origin} → Tirupati buses
          </button>
          <button
            type="button"
            onClick={() => go({ name: 'hotels' })}
            className="btn-ghost mt-2 w-full"
          >
            <Hotel className="h-4 w-4" /> Tirupati hotels
          </button>
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Darshan timing and Laddu counters are run by TTD. YLT books the ride and stay; temple access follows TTD rules that day.
          </p>
        </aside>
      </div>
    </div>
  );
}
