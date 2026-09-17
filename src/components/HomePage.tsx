import { useState } from 'react';
import {
  Navigation, Car, ArrowRight, Star, BadgeCheck, ShieldCheck, Sparkles, ChevronRight, Hotel,
  Bus,
} from 'lucide-react';
import { useNav } from '../store/nav';
import SearchWidget from './SearchWidget';

type Service = 'bus' | 'car' | 'hotels';

const SERVICES: { id: Service; label: string; icon: React.ComponentType<{ className?: string }>; tagline: string; desc: string }[] = [
  { id: 'bus',     label: 'Bus Booking',    icon: Bus,    tagline: 'Intercity, AC & sleeper',          desc: 'Search and book buses across 10+ cities with live seat maps and instant PNR.' },
  { id: 'car',     label: 'Car Booking',    icon: Car,    tagline: 'Self-drive, chauffeured, airport',  desc: 'Six rental modes — chauffeured, outstation, airport, hourly, subscription & self-drive.' },
  { id: 'hotels',  label: 'Hotel Booking',  icon: Hotel,  tagline: 'Verified stays, instant confirm',    desc: 'Book from SLA-verified hotels across South India with competitive rates and instant confirmation.' },
];

export default function HomePage() {
  const { go } = useNav();
  const [active, setActive] = useState<Service>('bus');
  const activeService = SERVICES.find((s) => s.id === active)!;

  function launch() {
    if (active === 'bus') go({ name: 'routes' });
    else if (active === 'car') go({ name: 'cars' });
    else go({ name: 'hotels' });
  }

  return (
    <div>
      {/* Welcome marquee */}
      <div className="overflow-hidden border-b py-2.5" style={{ backgroundColor: 'var(--bg-marquee)', borderColor: 'var(--border)' }}>
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="flex items-center gap-3">
              <Sparkles className="h-3.5 w-3.5 text-crimson-500" />
              Welcome to YLT Travels
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              Book buses, cars & hotels across South India
              <span style={{ color: 'var(--text-muted)' }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* HERO with animated scene */}
      <section className="relative overflow-hidden" style={{ minHeight: 560 }}>
        <div className="absolute inset-0" style={{ animation: 'scene-fade-in 0.6s ease-out' }}>
          <ServiceScene service={active} />
        </div>

        <div
          className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full blur-3xl bg-crimson-600/15"
          style={{ animation: 'floatSlow 6s ease-in-out infinite' }}
        />

        <div className="container-fluid relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_400px] lg:items-center">
          <div style={{ animation: 'slideUp 0.6s ease-out' }}>
            <span className="chip chip-crimson">Automated Transit OS</span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl" style={{ color: 'var(--text-primary)' }}>
              Book buses, cars<br />
              <span className="text-gradient-crimson">& hotels</span> in one place
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              YLT Transit connects intercity bus travel with last-mile car pickups, self-drive rentals,
              and hotel stays — all in one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={launch} className="btn-primary group">
                {activeService.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => go({ name: 'bookings' })} className="btn-ghost">My Bookings</button>
            </div>
            <div className="mt-10 flex gap-10">
              <Stat label="Cities" value="10+" />
              <Stat label="Daily buses" value="500+" />
              <Stat label="From" value="₹420" />
            </div>
          </div>

          <div style={{ animation: 'slideUp 0.6s ease-out 0.1s both' }}>
            <div className="surface p-3 backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}>
              <p className="label-text px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>Choose your booking</p>
              <div className="mt-1 space-y-1.5">
                {SERVICES.map((s) => {
                  const isActive = s.id === active;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActive(s.id)}
                      className={`group flex w-full items-center gap-3 rounded-xl p-3.5 text-left transition-all duration-300 ${
                        isActive
                          ? 'border border-crimson-500/40 bg-crimson-600/10'
                          : 'border border-transparent hover:bg-[var(--bg-raised)]'
                      }`}
                      style={isActive ? { animation: 'card-glow-pulse 3s ease-in-out infinite' } : undefined}
                    >
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${
                        isActive ? 'bg-crimson-600 text-white' : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                      }`}>
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.tagline}</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition ${isActive ? 'text-crimson-500' : ''}`} style={!isActive ? { color: 'var(--text-muted)' } : undefined} />
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 rounded-xl p-3.5" style={{ backgroundColor: 'var(--bg-raised)' }}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{activeService.desc}</p>
                <button onClick={launch} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-crimson-600 py-2.5 text-sm font-semibold text-white transition hover:bg-crimson-500">
                  Explore {activeService.label} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid relative pb-10">
          <SearchWidget />
        </div>
      </section>

      {/* Animated service showcase */}
      <div className="container-fluid py-16">
        <h2 className="text-center font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>One platform, every ride</h2>
        <p className="mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>From intercity buses to hotels, cars, and shared rides.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ServiceShowcaseCard service="bus" onClick={() => go({ name: 'routes' })} />
          <ServiceShowcaseCard service="car" onClick={() => go({ name: 'cars' })} />
          <ServiceShowcaseCard service="hotels" onClick={() => go({ name: 'hotels' })} />
        </div>
      </div>

      {/* Why YLT */}
      <div className="border-t" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="container-fluid py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Why YLT Transit?</h2>
              <div className="mt-6 space-y-4">
                <Benefit icon={BadgeCheck} title="SLA Verified" desc="Every operator, car, and hotel is SLA-verified for safety, quality, and service." />
                <Benefit icon={ShieldCheck} title="Secure Payments" desc="UPI, cards, and wallets. Instant PNR and digital tickets with QR codes." />
                <Benefit icon={Star} title="Top Rated" desc="4.7+ average rating across 50,000+ reviews from real travelers." />
              </div>
            </div>
            <div className="surface p-8" style={{ background: 'linear-gradient(135deg, rgba(168,30,48,0.08), var(--bg-surface))' }}>
              <h3 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Ready to travel?</h3>
              <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Search buses, book a hotel, or rent a car in seconds.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => go({ name: 'routes' })} className="btn-primary">Search Buses</button>
                <button onClick={() => go({ name: 'hotels' })} className="btn-ghost">Book Hotel</button>
                <button onClick={() => go({ name: 'cars' })} className="btn-ghost">Rent a Car</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ServiceScene — animated SVG/CSS scenes ── */
function ServiceScene({ service }: { service: Service }) {
  if (service === 'bus') return <BusScene />;
  if (service === 'car') return <CarScene />;
  return <HotelScene />;
}

function BusScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 40%, #fde68a 65%, #fef3c7 100%)' }}>
      <div className="absolute right-12 top-10 h-16 w-16 rounded-full" style={{ background: 'radial-gradient(circle, #fde047 0%, #facc15 60%, transparent 70%)', animation: 'floatSlow 5s ease-in-out infinite' }} />
      <Cloud className="left-[8%] top-[12%]" delay="0s" duration="40s" />
      <Cloud className="left-[55%] top-[6%]" delay="-12s" duration="50s" />
      <Cloud className="left-[30%] top-[20%]" delay="-25s" duration="45s" />
      <svg className="absolute bottom-[34%] w-full" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ height: 120 }}>
        <path d="M0,120 L0,70 Q150,20 300,50 T600,40 T900,55 T1200,30 L1200,120 Z" fill="#86efac" opacity="0.6" />
        <path d="M0,120 L0,90 Q200,50 400,75 T800,65 T1200,80 L1200,120 Z" fill="#4ade80" opacity="0.5" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '34%', background: 'linear-gradient(180deg, #4b5563 0%, #374151 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#fbbf24' }} />
        <div className="absolute left-0 right-0 top-1/2 flex justify-center gap-4" style={{ animation: 'road-marks-scroll 0.8s linear infinite' }}>
          {Array.from({ length: 40 }).map((_, i) => <div key={i} className="h-1.5 w-10 rounded" style={{ background: '#fde68a' }} />)}
        </div>
      </div>
      <div className="absolute bottom-[16%] left-0" style={{ animation: 'bus-traverse 14s linear infinite' }}>
        <div style={{ animation: 'float-vehicle 1.2s ease-in-out infinite' }}><BusSVG /></div>
      </div>
      <div className="absolute bottom-[20%] left-0 h-1 w-16" style={{ background: 'linear-gradient(90deg, transparent, #fff, transparent)', animation: 'speed-dash 0.4s linear infinite', transformOrigin: 'left' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 45%, transparent 70%)' }} />
    </div>
  );
}

function BusSVG() {
  return (
    <svg width="260" height="150" viewBox="0 0 260 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="130" cy="140" rx="110" ry="6" fill="#000" opacity="0.25" />
      <path d="M8,38 Q8,18 28,14 L210,14 Q248,14 250,52 L250,96 Q250,104 242,104 L18,104 Q8,104 8,96 Z" fill="url(#sleeperBody)" />
      <path d="M14,16 L210,16 Q246,16 248,50 L248,58 L14,58 Z" fill="url(#sleeperTop)" opacity="0.92" />
      {[0,1,2,3,4,5,6,7].map(i => <rect key={`u${i}`} x={22 + i * 26} y={22} width="20" height="14" rx="2.5" fill="#1e293b" stroke="#475569" strokeWidth="0.6" />)}
      {[0,1,2,3,4,5,6,7].map(i => <rect key={`l${i}`} x={22 + i * 26} y={44} width="20" height="14" rx="2.5" fill="#1e293b" stroke="#475569" strokeWidth="0.6" />)}
      <path d="M210,16 Q246,16 248,50 L248,70 L214,70 L210,30 Z" fill="url(#windshield)" stroke="#0f172a" strokeWidth="1" />
      <rect x="216" y="74" width="30" height="18" rx="2" fill="#1e293b" />
      <rect x="218" y="76" width="26" height="3" rx="1" fill="#64748b" />
      <rect x="218" y="81" width="26" height="3" rx="1" fill="#64748b" />
      <rect x="218" y="86" width="26" height="3" rx="1" fill="#64748b" />
      <circle cx="231" cy="100" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
      <text x="231" y="103" textAnchor="middle" fontSize="5" fontWeight="800" fill="#cbd5e1">V</text>
      <ellipse cx="244" cy="64" rx="3" ry="4" fill="#fde047" opacity="0.95" />
      <rect x="14" y="62" width="16" height="40" rx="1.5" fill="#7f1d1d" stroke="#450a0a" strokeWidth="0.6" />
      <rect x="16" y="64" width="12" height="18" rx="1" fill="#bae6fd" opacity="0.4" />
      <rect x="14" y="92" width="234" height="6" fill="#dc2626" />
      <rect x="14" y="98" width="234" height="2" fill="#fbbf24" />
      <rect x="110" y="78" width="40" height="12" rx="2" fill="#fff" />
      <text x="130" y="87" textAnchor="middle" fontSize="9" fontWeight="800" fill="#dc2626">YLT</text>
      <text x="200" y="100" textAnchor="end" fontSize="7" fontWeight="700" fill="#fff" opacity="0.8">VOLVO SLEEPER</text>
      <circle cx="60" cy="104" r="13" fill="#0f172a" />
      <circle cx="60" cy="104" r="6" fill="#64748b" style={{ animation: 'wheel-spin 1.4s linear infinite', transformOrigin: '60px 104px' }} />
      <circle cx="100" cy="104" r="13" fill="#0f172a" />
      <circle cx="100" cy="104" r="6" fill="#64748b" style={{ animation: 'wheel-spin 1.4s linear infinite', transformOrigin: '100px 104px' }} />
      <circle cx="226" cy="104" r="13" fill="#0f172a" />
      <circle cx="226" cy="104" r="6" fill="#64748b" style={{ animation: 'wheel-spin 1.4s linear infinite', transformOrigin: '226px 104px' }} />
      <defs>
        <linearGradient id="sleeperBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f8fafc" /><stop offset="50%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#94a3b8" /></linearGradient>
        <linearGradient id="sleeperTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#991b1b" /></linearGradient>
        <linearGradient id="windshield" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.7" /><stop offset="100%" stopColor="#0f172a" stopOpacity="0.85" /></linearGradient>
      </defs>
    </svg>
  );
}

function CarScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #dbeafe 0%, #e0f2fe 40%, #fef9c3 70%, #fed7aa 100%)' }}>
      <div className="absolute right-12 top-8 h-14 w-14 rounded-full" style={{ background: 'radial-gradient(circle, #fde047 0%, #facc15 60%, transparent 70%)', animation: 'floatSlow 5s ease-in-out infinite' }} />
      <Cloud className="left-[20%] top-[12%]" delay="0s" duration="50s" />
      <Cloud className="left-[65%] top-[18%]" delay="-25s" duration="55s" />
      <Tree left="10%" />
      <Tree left="86%" />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '35%', background: 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#fbbf24' }} />
        <div className="absolute left-0 right-0 top-1/2 flex justify-center gap-4" style={{ animation: 'road-marks-scroll 0.8s linear infinite' }}>
          {Array.from({ length: 40 }).map((_, i) => <div key={i} className="h-1.5 w-11 rounded" style={{ background: '#fde68a' }} />)}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="absolute h-0.5 rounded-full" style={{ bottom: `${20 + i * 3}%`, left: 0, width: `${50 + i * 18}px`, background: 'linear-gradient(90deg, transparent, rgba(248,113,113,0.6), transparent)', animation: `speed-dash ${0.35 + i * 0.1}s linear infinite`, transformOrigin: 'left' }} />
      ))}
      <div className="absolute bottom-[18%] left-0" style={{ animation: 'bus-traverse 12s linear infinite' }}>
        <div style={{ animation: 'float-vehicle 0.9s ease-in-out infinite' }}><CarSVG color="#dc2626" brand="bmw" /></div>
      </div>
      <div className="absolute right-8 top-1/3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: '#dc2626', animation: 'floatSlow 3s ease-in-out infinite' }}>
        <Car className="h-3.5 w-3.5" /> Book Your Ride
      </div>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(219,234,254,0.5) 0%, rgba(219,234,254,0.2) 50%, transparent 80%)' }} />
    </div>
  );
}

function CarSVG({ color, brand = 'bmw' }: { color: string; brand?: 'bmw' | 'audi' }) {
  const gid = `car-${brand}-${color.replace('#','')}`;
  return (
    <svg width="200" height="100" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="92" rx="85" ry="5" fill="#000" opacity="0.3" />
      <path d="M12,62 Q14,44 36,40 L58,36 Q70,22 100,20 Q130,22 142,36 L164,40 Q186,44 188,62 L188,72 Q188,78 182,78 L18,78 Q12,78 12,72 Z" fill={`url(#${gid})`} stroke="#000" strokeOpacity="0.15" strokeWidth="1" />
      <path d="M58,36 Q70,22 100,20 Q130,22 142,36 L138,38 Q128,26 100,24 Q72,26 62,38 Z" fill="#fff" opacity="0.18" />
      <path d="M62,38 Q72,26 100,24 Q128,26 138,38 L134,40 Q124,30 100,28 Q76,30 66,40 Z" fill="url(#glass)" />
      <rect x="98" y="26" width="3" height="16" fill="#0f172a" opacity="0.6" />
      <path d="M20,56 Q100,52 180,56" stroke="#000" strokeOpacity="0.12" strokeWidth="1" fill="none" />
      {brand === 'bmw' ? (
        <g>
          <rect x="176" y="50" width="10" height="14" rx="2" fill="#0f172a" />
          <rect x="177" y="52" width="8" height="2" fill="#64748b" />
          <rect x="177" y="56" width="8" height="2" fill="#64748b" />
          <rect x="177" y="60" width="8" height="2" fill="#64748b" />
          <circle cx="168" cy="42" r="4" fill="#fff" stroke="#0f172a" strokeWidth="0.5" />
          <circle cx="168" cy="42" r="2.5" fill="#1e40af" />
          <circle cx="168" cy="42" r="1" fill="#fff" />
        </g>
      ) : (
        <g>
          <path d="M172,48 L188,48 L186,66 L174,66 Z" fill="#0f172a" />
          <rect x="174" y="52" width="12" height="1.5" fill="#64748b" />
          <rect x="174" y="56" width="12" height="1.5" fill="#64748b" />
          <rect x="174" y="60" width="12" height="1.5" fill="#64748b" />
          {[0,1,2].map(i => <circle key={i} cx={162 + i * 5} cy={40} r="2.5" fill="none" stroke="#cbd5e1" strokeWidth="1" />)}
        </g>
      )}
      <ellipse cx="184" cy="56" rx="3" ry="2.5" fill="#fde047" opacity="0.95" />
      <rect x="176" y="44" width="12" height="1.5" rx="0.5" fill="#7dd3fc" opacity="0.9" />
      <rect x="12" y="50" width="5" height="8" rx="1" fill="#ef4444" />
      <path d="M138,38 L144,34 L146,38 Z" fill="#1f2937" />
      <rect x="90" y="50" width="8" height="2" rx="1" fill="#000" opacity="0.25" />
      <circle cx="48" cy="78" r="13" fill="#0f172a" />
      <circle cx="48" cy="78" r="8" fill="#1e293b" />
      <circle cx="48" cy="78" r="4" fill="#64748b" style={{ animation: 'wheel-spin 1s linear infinite', transformOrigin: '48px 78px' }} />
      {[0,72,144,216,288].map(deg => <line key={deg} x1="48" y1="78" x2={48 + 7 * Math.cos(deg*Math.PI/180)} y2={78 + 7 * Math.sin(deg*Math.PI/180)} stroke="#94a3b8" strokeWidth="1.2" style={{ animation: 'wheel-spin 1s linear infinite', transformOrigin: '48px 78px' }} />)}
      <circle cx="152" cy="78" r="13" fill="#0f172a" />
      <circle cx="152" cy="78" r="8" fill="#1e293b" />
      <circle cx="152" cy="78" r="4" fill="#64748b" style={{ animation: 'wheel-spin 1s linear infinite', transformOrigin: '152px 78px' }} />
      {[0,72,144,216,288].map(deg => <line key={deg} x1="152" y1="78" x2={152 + 7 * Math.cos(deg*Math.PI/180)} y2={78 + 7 * Math.sin(deg*Math.PI/180)} stroke="#94a3b8" strokeWidth="1.2" style={{ animation: 'wheel-spin 1s linear infinite', transformOrigin: '152px 78px' }} />)}
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.95" /><stop offset="55%" stopColor={color} /><stop offset="100%" stopColor="#000" stopOpacity="0.65" /></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bae6fd" stopOpacity="0.75" /><stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" /></linearGradient>
      </defs>
    </svg>
  );
}

function HotelScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #3b82f6 35%, #60a5fa 55%, #fde68a 80%, #fef3c7 100%)' }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white" style={{ width: 1.5, height: 1.5, left: `${(i*53)%100}%`, top: `${(i*17)%30}%`, opacity: 0.7, animation: `star-shimmer ${2+(i%3)}s ease-in-out infinite` }} />
      ))}
      <div className="absolute right-16 top-8 h-12 w-12 rounded-full" style={{ background: 'radial-gradient(circle, #f8fafc 0%, #cbd5e1 60%, transparent 70%)' }} />
      <div className="absolute bottom-[34%] left-1/2 -translate-x-1/2" style={{ width: 180, height: 200 }}>
        <div className="absolute inset-0 rounded-t-lg" style={{ background: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)', border: '2px solid #94a3b8' }} />
        {[0,1,2,3].map(row => [0,1,2,3].map(col => {
          const lit = (row + col) % 2 === 0;
          return <div key={`${row}-${col}`} className="absolute rounded-sm" style={{ left: 18 + col * 38, top: 18 + row * 42, width: 22, height: 28, background: lit ? '#fde047' : '#475569', animation: lit ? `hotel-light ${2 + ((row+col)%3)}s ease-in-out infinite` : undefined, animationDelay: `${(row+col)*0.3}s` }} />;
        }))}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded px-3 py-1 text-xs font-bold text-white" style={{ background: '#dc2626' }}>YLT HOTEL</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-12 w-16 rounded-t-md" style={{ background: '#7f1d1d' }} />
      </div>
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 overflow-hidden rounded-2xl" style={{ width: 260, height: 70, background: 'linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%', animation: 'pool-shimmer 3s linear infinite' }} />
        {[0,1,2].map(i => <div key={i} className="absolute rounded-full border-2 border-white/60" style={{ left: 40 + i * 80, top: 25, width: 20, height: 20, animation: 'pool-ring 3s ease-out infinite', animationDelay: `${i * 1}s` }} />)}
        <div className="absolute left-8 top-8 h-2.5 w-2.5 rounded-full bg-amber-300" style={{ animation: 'floatSlow 2s ease-in-out infinite' }} />
        <div className="absolute right-12 top-12 h-2.5 w-2.5 rounded-full bg-amber-300" style={{ animation: 'floatSlow 2.5s ease-in-out infinite', animationDelay: '-0.5s' }} />
      </div>
      <PalmTree left="6%" />
      <PalmTree left="88%" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(30,58,138,0.4) 0%, rgba(30,58,138,0.15) 50%, transparent 80%)' }} />
    </div>
  );
}

function Cloud({ className, delay, duration }: { className?: string; delay: string; duration: string }) {
  return (
    <div className={`absolute ${className}`} style={{ animation: `cloud-drift ${duration} linear infinite`, animationDelay: delay }}>
      <svg width="80" height="40" viewBox="0 0 80 40" fill="white" opacity="0.85">
        <ellipse cx="20" cy="25" rx="18" ry="14" />
        <ellipse cx="42" cy="20" rx="22" ry="18" />
        <ellipse cx="62" cy="26" rx="16" ry="12" />
      </svg>
    </div>
  );
}

function Tree({ left }: { left: string }) {
  return (
    <div className="absolute bottom-[30%]" style={{ left }}>
      <div className="mx-auto h-16 w-2" style={{ background: '#78350f' }} />
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full" style={{ background: '#16a34a' }} />
      <div className="absolute bottom-16 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full" style={{ background: '#22c55e' }} />
    </div>
  );
}

function PalmTree({ left }: { left: string }) {
  return (
    <div className="absolute bottom-[8%]" style={{ left }}>
      <div className="relative">
        <div className="mx-auto h-24 w-2.5 rounded-full" style={{ background: 'linear-gradient(180deg, #78350f, #92400e)' }} />
        {[-50, -30, 0, 30, 50].map((deg, i) => (
          <div key={i} className="absolute top-0 left-1/2 h-1.5 w-12 origin-left rounded-full" style={{ background: '#16a34a', transform: `rotate(${deg}deg)`, transformOrigin: 'left center', left: '50%' }} />
        ))}
      </div>
    </div>
  );
}

function ServiceShowcaseCard({ service, onClick }: { service: Service; onClick: () => void }) {
  const meta = SERVICES.find(s => s.id === service)!;
  const Icon = meta.icon;
  return (
    <button onClick={onClick} className="surface-raised group overflow-hidden text-left transition hover:border-crimson-700/30">
      <div className="relative h-32 overflow-hidden">
        <div className="absolute inset-0 scale-100 transition-transform duration-500 group-hover:scale-110">
          {service === 'bus' && <BusScene />}
          {service === 'car' && <CarScene />}
          {service === 'hotels' && <HotelScene />}
        </div>
        <div className="absolute bottom-3 left-3 z-10 grid h-10 w-10 place-items-center rounded-xl bg-white/90 text-crimson-600 shadow-lg backdrop-blur transition group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{meta.label}</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{meta.desc}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-crimson-600 transition group-hover:gap-2">
          Explore <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  );
}

function Benefit({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500"><Icon className="h-5 w-5" /></div>
      <div><p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>{desc}</p></div>
    </div>
  );
}
