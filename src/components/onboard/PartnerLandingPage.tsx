import { useRef, useState, type FormEvent } from 'react';
import {
  Bus, Building2, Hotel, BookOpen, Phone, ArrowRight, Play, MapPin, LayoutGrid, CalendarDays,
} from 'lucide-react';
import { YltLogo } from '../BrandLogo';
import { useNav } from '../../store/nav';
import { apiFetch } from '../../lib/api';
import { onboardPublicHref, offsiteLinkProps, type OnboardKind } from '../../lib/onboardHost';

export default function PartnerLandingPage() {
  const go = useNav((s) => s.go);
  const [callbackOpen, setCallbackOpen] = useState(false);

  function goRegister(type: OnboardKind = 'operator') {
    go({ name: 'onboard', kind: 'operator', screen: 'registration', type });
  }

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <button type="button" className="flex items-center gap-2" onClick={() => go({ name: 'onboard', kind: 'operator', screen: 'landing' })}>
            <YltLogo size={40} />
            <span className="font-display text-lg font-bold text-navy-900">YLT <span className="text-gold-600">Travels</span></span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setCallbackOpen(true)}
              className="rounded-full border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800 sm:px-4 sm:text-sm"
            >
              Get a call back
            </button>
            <button
              type="button"
              onClick={() => go({ name: 'onboard', kind: 'operator', screen: 'signin' })}
              className="rounded-full bg-navy-800 px-4 py-1.5 text-xs font-bold text-white sm:text-sm"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-emerald-900">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 70% 40%, rgba(212,160,23,0.25), transparent 45%)' }} />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-28 pt-12 lg:grid-cols-[1fr_1fr] lg:pt-16">
          <div className="relative z-10 max-w-xl text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">YLT Partner</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">
              Grow your bus business with YLT Travels
            </h1>
            <p className="mt-4 text-sm text-white/80 sm:text-base">
              List your coaches, open seats, and run day-to-day operations from Partner ERP. Built for operators across South India — no inflated claims, just the tools you use after approval.
            </p>
            <button
              type="button"
              onClick={() => goRegister('operator')}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-300"
            >
              Get started with YLT now <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="relative hidden min-h-[220px] lg:block">
            <div className="absolute right-4 top-4 rounded-xl bg-white/95 px-4 py-3 shadow-lg">
              <p className="text-lg font-bold text-navy-900">South India</p>
              <p className="text-xs text-slate-500">TN · KA · KL · AP · TS</p>
            </div>
            <div className="absolute right-28 top-28 rounded-xl bg-white/95 px-4 py-3 shadow-lg">
              <p className="text-lg font-bold text-navy-900">Bus · Agent · Hotel</p>
              <p className="text-xs text-slate-500">One partner desk</p>
            </div>
            <div className="absolute bottom-8 right-10 flex gap-3">
              {['navy-600', 'crimson-600', 'gold-500'].map((tone) => (
                <div key={tone} className={`grid h-24 w-32 place-items-center rounded-2xl bg-${tone} shadow-xl ring-4 ring-white/70`} style={{ background: tone === 'navy-600' ? '#1e4a7a' : tone === 'crimson-600' ? '#c41e3a' : '#d4a017' }}>
                  <Bus className="h-12 w-12 text-white" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto -mb-16 max-w-6xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OptionCard
              icon={<Bus className="h-6 w-6 text-navy-800" />}
              title="Register your bus with YLT"
              body="Start selling seats on ylttravels.com after onboard review."
              cta="Register Now"
              onClick={() => goRegister('operator')}
            />
            <OptionCard
              icon={<BookOpen className="h-6 w-6 text-navy-800" />}
              title="Learn about bus business"
              body="A short guide to Partner ERP, availability, and going live."
              cta="Know more"
              onClick={() => document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth' })}
            />
            <OptionCard
              icon={<Building2 className="h-6 w-6 text-navy-800" />}
              title="Register as travel agent"
              body="Book for your clients and earn commission from the agent desk."
              cta="Go to agent"
              href={onboardPublicHref('agent')}
            />
            <OptionCard
              icon={<Hotel className="h-6 w-6 text-navy-800" />}
              title="Register as hotel partner"
              body="List rooms and manage stays from the same YLT partner desk."
              cta="Explore hotels"
              onClick={() => goRegister('hotel')}
            />
          </div>
        </div>
      </section>

      <section id="learn" className="mx-auto max-w-6xl px-4 pb-8 pt-28">
        <h2 className="text-center font-display text-2xl font-bold text-navy-900">See the product</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">
          After approval you work in YLT Partner ERP — bus operations and seat availability in one place. Screens below are YLT product mockups, not a live competitor demo.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ErpShot
            kicker="Partner ERP · Bus ops"
            title="Services and occupancy"
            rows={[
              ['TPT → CHN', 'Volvo AC', '18:30', 'Open'],
              ['HYD → BLR', 'Sleeper', '21:00', 'Filling'],
              ['VJA → MAA', 'Seater', '22:15', 'Open'],
            ]}
          />
          <ErpShot
            kicker="Partner ERP · Availability"
            title="Seat inventory"
            stats
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
            <WalkthroughVideo />
            <div className="p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold text-navy-900">How partner onboarding works</h3>
              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                <li><strong className="text-navy-900">1. Apply</strong> — company, city, mobile, and GST or PAN.</li>
                <li><strong className="text-navy-900">2. Review</strong> — CoreAdmin or Onboard staff approve or reject with a reason by email.</li>
                <li><strong className="text-navy-900">3. Go live</strong> — Sign in with password or email OTP. Partner ERP stays locked until approval.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl bg-navy-900 px-6 py-10 text-center text-white">
          <h2 className="font-display text-2xl font-bold">Ready to register?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/75">Submit a partner application. You will not get ERP access until YLT approves it.</p>
          <button type="button" onClick={() => goRegister('operator')} className="mt-6 rounded-full bg-gold-500 px-8 py-3 text-sm font-bold text-navy-950">
            Register
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        YLT Travels · Partner onboarding · Tirupati
      </footer>

      {callbackOpen && <CallbackModal onClose={() => setCallbackOpen(false)} />}
    </div>
  );
}

function WalkthroughVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlay, setShowPlay] = useState(true);

  function play() {
    const el = videoRef.current;
    if (!el) return;
    void el.play();
  }

  return (
    <div className="relative min-h-[220px] bg-navy-900">
      <video
        ref={videoRef}
        className="aspect-video w-full bg-navy-950"
        controls
        poster="/videos/ylt-partner-walkthrough.jpg"
        preload="metadata"
        playsInline
        onPlay={() => setShowPlay(false)}
        onPause={(e) => {
          const v = e.currentTarget;
          if (v.ended || v.currentTime < 0.25) setShowPlay(true);
        }}
        onEnded={() => setShowPlay(true)}
      >
        <source src="/videos/ylt-partner-walkthrough.mp4" type="video/mp4" />
      </video>
      {showPlay && (
        <button
          type="button"
          className="absolute inset-0 grid place-items-center bg-navy-950/25"
          onClick={play}
          aria-label="Play YLT product walkthrough"
        >
          <span className="text-center text-white">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/15">
              <Play className="h-7 w-7" />
            </span>
            <span className="mt-3 block font-display text-lg font-bold">Product walkthrough</span>
            <span className="mt-1 block px-6 text-xs text-white/80">
              YLT Travels partner onboarding and Partner ERP — apply, review, go live.
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function OptionCard({
  icon, title, body, cta, onClick, href,
}: {
  icon: React.ReactNode; title: string; body: string; cta: string; onClick?: () => void; href?: string;
}) {
  const inner = (
    <>
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-navy-50">{icon}</div>
      <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-slate-500">{body}</p>
      <span className="mt-5 inline-flex rounded-full bg-crimson-600 px-4 py-2 text-xs font-bold text-white">{cta}</span>
    </>
  );
  const cls = 'flex h-full flex-col rounded-2xl bg-white p-5 text-left shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 transition hover:-translate-y-0.5';
  if (href) {
    return <a {...offsiteLinkProps(href)} className={cls}>{inner}</a>;
  }
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function ErpShot({ kicker, title, rows, stats }: { kicker: string; title: string; rows?: string[][]; stats?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{kicker}</p>
          <p className="font-display font-bold text-navy-900">{title}</p>
        </div>
        <LayoutGrid className="h-4 w-4 text-slate-400" />
      </div>
      {rows && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-400">
              <th className="px-4 py-2">Route</th><th>Coach</th><th>Time</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-t border-slate-50">
                <td className="px-4 py-2.5 font-medium text-navy-900">{r[0]}</td>
                <td className="text-slate-500">{r[1]}</td>
                <td className="text-slate-500">{r[2]}</td>
                <td><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{r[3]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {stats && (
        <div className="grid grid-cols-3 gap-3 p-4">
          {([
            { label: 'Open seats', n: '28', Icon: CalendarDays },
            { label: 'Held', n: '4', Icon: MapPin },
            { label: 'Booked', n: '12', Icon: Bus },
          ] as const).map((item) => (
            <div key={item.label} className="rounded-xl bg-slate-50 p-3">
              <item.Icon className="h-4 w-4 text-navy-700" />
              <p className="mt-2 text-xl font-bold text-navy-900">{item.n}</p>
              <p className="text-[11px] text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CallbackModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', note: '' });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await apiFetch('/api/ops.php?resource=partner-leads', {
      method: 'POST',
      body: JSON.stringify({ resource: 'partner-leads', ...form }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || data.error) { setError(String(data.error || 'Could not send request.')); return; }
    setDone(String(data.message || 'We will call you back.'));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void submit(e)}>
        <div className="flex items-center gap-2 text-navy-900">
          <Phone className="h-5 w-5" />
          <h3 className="font-display text-lg font-bold">Get a call back</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">Share a number. YLT onboard will reach you — no spam lists.</p>
        {done ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{done}</p>
        ) : (
          <div className="mt-4 space-y-3">
            <input required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} placeholder="What do you operate?" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-navy-800 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Request call back'}</button>
          </div>
        )}
        <button type="button" className="mt-3 w-full text-sm text-slate-500" onClick={onClose}>Close</button>
      </form>
    </div>
  );
}
