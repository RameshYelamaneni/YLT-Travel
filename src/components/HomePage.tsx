import { useState } from 'react';
import {
  ArrowRight, Star, BadgeCheck, ShieldCheck, Hotel, Bus, QrCode,
  Shield, MapPin, Calendar, Users, Search,
} from 'lucide-react';
import { useNav } from '../store/nav';
import SearchWidget from './SearchWidget';
import OffersForYou from './OffersForYou';
import { useHotelStore, HOTEL_CITIES, defaultStayDates } from '../store/hotelStore';

type Tab = 'bus' | 'hotels';

const TRUST = [
  { label: 'YLT Operators', hint: 'SLA-checked fleets' },
  { label: 'Women-safe', hint: 'Ladies quota seats' },
  { label: 'Instant PNR', hint: 'QR boarding pass' },
  { label: 'Secure pay', hint: 'Razorpay checkout' },
];

export default function HomePage() {
  const { go } = useNav();
  const [tab, setTab] = useState<Tab>('bus');

  return (
    <div style={{ backgroundColor: 'var(--bg-page)' }}>
      <section className="relative isolate overflow-hidden">
        <img
          src="/hero-volvo-multiaxle.jpg"
          alt="Volvo multi-axle sleeper coach on an Indian highway"
          className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/85 via-navy-900/55 to-[var(--bg-page)]" />
        <div className="absolute -right-16 top-10 hidden h-72 w-72 rounded-full bg-gold-400/20 blur-3xl lg:block" />
        <div className="absolute -left-10 bottom-24 hidden h-56 w-56 rounded-full bg-navy-400/20 blur-3xl lg:block" />
        <div className="container-fluid relative pb-28 pt-14 sm:pb-32 sm:pt-20">
          <p className="text-center text-xs font-bold uppercase tracking-[0.28em] text-gold-300">YLT Travels · Buses & hotels</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-center font-display text-4xl font-extrabold leading-[1.08] text-white drop-shadow sm:text-5xl lg:text-6xl">
            Book buses and hotels across India
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-white/85 sm:text-lg">
            Search South India routes, pick women-safe seats, add a hotel by the stand, pay securely.
          </p>
        </div>
      </section>

      <div className="container-fluid relative z-10 -mt-24 pb-6 sm:-mt-28">
        <div className="rounded-[28px] border border-white/80 bg-white/95 p-3 shadow-search backdrop-blur-md sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {([
              { id: 'bus' as const, label: 'Bus tickets', icon: Bus },
              { id: 'hotels' as const, label: 'Hotels', icon: Hotel },
            ]).map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${tab === item.id ? 'bg-navy-800 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </button>
            ))}
          </div>
          {tab === 'bus' ? <SearchWidget hero /> : <HotelHeroSearch />}
        </div>
      </div>

      <div className="container-fluid">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 text-center shadow-sm">
          {TRUST.map((t) => (
            <div key={t.label} className="min-w-[7rem]">
              <p className="font-display text-sm font-bold text-navy-900">{t.label}</p>
              <p className="text-[11px] text-slate-500">{t.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div id="ylt-ai-insights" className="container-fluid py-10">
        <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI travel tools</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Linked insights on every search — price trend, demand heat, women-safe score, and last-mile ETA. Not a third-party chatbot.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: 'Price trends', d: '14-day fare curve on HYD–BLR and more. Book when the line dips.' },
            { t: 'Demand heat', d: 'Festival nights and weekend fill-rate so you pick a bus that still has singles.' },
            { t: 'Women-safe score', d: 'Ladies quota + operator ratings in one badge on the seat map.' },
            { t: 'Last-mile ETA', d: 'Car from drop stand to gate, priced before you pay the bus fare.' },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-bold text-navy-900">{x.t}</p>
              <p className="mt-1 text-xs text-slate-600">{x.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container-fluid py-10">
        <OffersForYou go={go} variant="home" />
      </div>

      <div className="container-fluid pb-6">
        <div className="grid items-center gap-6 rounded-3xl bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-8 text-white sm:grid-cols-[1fr_auto] sm:px-10">
          <div className="flex items-start gap-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-white p-2">
              <QrCode className="h-16 w-16 text-navy-800" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold">YLT Travels on your phone</h3>
              <p className="mt-1 max-w-md text-sm text-white/85">Scan for live tracking, QR tickets, and hotel+bus combos. App Store listing coming soon — this QR is a YLT placeholder.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl border border-gold-400/40 bg-gold-500/15 px-4 py-2 text-sm font-semibold text-gold-200">App Store · soon</span>
            <span className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold">Google Play · soon</span>
          </div>
        </div>
      </div>

      <div className="container-fluid py-14">
        <h2 className="text-center font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Buses and hotels, one ticket flow</h2>
        <p className="mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>No trains, flights, or ferries — just the ride and the stay.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Showcase title="Intercity buses" desc="AC, sleeper, live tracking, and women-safe filters on South India routes." onClick={() => go({ name: 'routes' })} scene="bus" />
          <Showcase title="Verified hotels" desc="Book a stay 200m from the stand with SLA-checked properties." onClick={() => go({ name: 'hotels' })} scene="hotels" />
        </div>
      </div>

      <div className="border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="container-fluid py-14">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Why travellers pick YLT Travels</h2>
              <div className="mt-6 space-y-4">
                <Benefit icon={BadgeCheck} title="SLA verified operators" desc="Fleets checked for safety, punctuality, and service — not a European brand mash-up." />
                <Benefit icon={Shield} title="Women-safe booking" desc="Ladies quota and women-rated buses from search through seat map." />
                <Benefit icon={ShieldCheck} title="Secure Razorpay checkout" desc="Pay with UPI, cards or net banking on Razorpay. Walk in with a PNR and a scannable e-ticket." />
                <Benefit icon={Star} title="Rated by real riders" desc="4.7+ average from travellers on Hyderabad–Bengaluru and beyond." />
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-navy-50 to-white p-8 ring-1 ring-navy-100">
              <h3 className="font-display text-xl font-bold text-navy-950">Ready tonight?</h3>
              <p className="mt-2 text-sm text-slate-600">Today and Tomorrow sit on the date row. Search, pick seats, add a hotel.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => go({ name: 'routes' })} className="btn-search">Search buses</button>
                <button onClick={() => go({ name: 'hotels' })} className="btn-ghost">Find hotels</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HotelHeroSearch() {
  const { go } = useNav();
  const store = useHotelStore();
  const stay = defaultStayDates(store.filters.checkIn, store.filters.checkOut);
  const [city, setCity] = useState(store.filters.city || 'Hyderabad');
  const [checkIn, setCheckIn] = useState(stay.checkIn);
  const [checkOut, setCheckOut] = useState(stay.checkOut);
  const [guests, setGuests] = useState(store.filters.guests || 2);

  function search() {
    const next = defaultStayDates(checkIn, checkOut);
    store.setFilters({ city, checkIn: next.checkIn, checkOut: next.checkOut, guests });
    store.searchHotels({ city, checkIn: next.checkIn, checkOut: next.checkOut, guests });
    go({ name: 'hotelResults' });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr_1fr_auto_auto] lg:items-end lg:gap-0 lg:divide-x lg:divide-slate-200">
        <label className="block min-w-0 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">City</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full border-0 bg-transparent text-sm font-semibold outline-none">
            {(HOTEL_CITIES ?? ['Hyderabad', 'Bengaluru', 'Chennai', 'Tirupati']).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block min-w-0 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Calendar className="mr-1 inline h-3 w-3" /> Check-in</span>
          <input type="date" min={stay.checkIn} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full border-0 bg-transparent text-sm font-semibold outline-none" />
        </label>
        <label className="block min-w-0 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Calendar className="mr-1 inline h-3 w-3" /> Check-out</span>
          <input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full border-0 bg-transparent text-sm font-semibold outline-none" />
        </label>
        <label className="block min-w-[6rem] px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Users className="mr-1 inline h-3 w-3" /> Guests</span>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 w-full border-0 bg-transparent text-sm font-semibold outline-none">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" onClick={search} className="btn-search h-12 lg:h-[4.25rem] lg:rounded-l-none lg:rounded-r-2xl">
          <Search className="h-5 w-5" /> Search
        </button>
      </div>
      <p className="mt-3 px-1 text-xs text-slate-500">SLA-verified stays next to bus stands across South India.</p>
    </div>
  );
}

function Showcase({ title, desc, onClick, scene }: { title: string; desc: string; onClick: () => void; scene: 'bus' | 'hotels' }) {
  return (
    <button onClick={onClick} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-lg">
      <div className="relative h-40 overflow-hidden">
        {scene === 'bus' ? <BusScene /> : <HotelScene />}
        <div className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-xl bg-white/90 text-navy-700 shadow">
          {scene === 'bus' ? <Bus className="h-5 w-5" /> : <Hotel className="h-5 w-5" />}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-bold text-navy-950">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{desc}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 group-hover:gap-2">Explore <ArrowRight className="h-4 w-4" /></span>
      </div>
    </button>
  );
}

function Benefit({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="font-semibold text-navy-950">{title}</p>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function BusScene() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy-950">
      <img src="/hero-volvo-multiaxle.jpg" alt="Volvo multi-axle coach" className="h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-navy-950/25" />
    </div>
  );
}

function HotelScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #071428 0%, #163a62 50%, #f5c14a 100%)' }}>
      <div className="absolute bottom-6 left-1/2 h-28 w-24 -translate-x-1/2 rounded-t-lg bg-slate-200 shadow-lg">
        <div className="absolute left-3 top-3 h-4 w-4 rounded-sm bg-gold-300" />
        <div className="absolute right-3 top-3 h-4 w-4 rounded-sm bg-slate-500" />
        <div className="absolute bottom-0 left-1/2 h-8 w-8 -translate-x-1/2 bg-navy-800" />
      </div>
    </div>
  );
}
