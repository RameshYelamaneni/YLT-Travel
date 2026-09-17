import { useMemo, useState } from 'react';
import {
  Search, Navigation, Car, Shield, Briefcase, Sparkles, Mail, Globe, Lock,
  Ticket, CreditCard, MapPin, Clock, Star, BadgeCheck, ShieldCheck, Zap, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { View } from '../store/nav';

interface Article {
  id: string;
  category: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  body: string[];
}

const ARTICLES: Article[] = [
  {
    id: 'bus-booking',
    category: 'Bus',
    icon: Navigation,
    title: 'Bus Bookings',
    summary: 'Search and book AC/sleeper buses across 10+ South Indian cities with live seat maps and instant PNR.',
    body: [
      'YLT Transit aggregates intercity bus operators across Tamil Nadu, Karnataka, Kerala, Andhra Pradesh and Telangana. Search by origin, destination and date to see live availability.',
      'Each result shows operator name, bus type (AC sleeper, AC seater, non-AC), departure/arrival times, duration, amenities (charging points, water, blankets), rating and fare.',
      'Pick your seats from a live seat map — booked seats are disabled in real time. Choose boarding and dropping points, then proceed to checkout.',
      'On payment success, a PNR is generated instantly and a digital ticket with QR code is available for download from My Bookings.',
    ],
  },
  {
    id: 'last-mile',
    category: 'Bus',
    icon: MapPin,
    title: 'Last-Mile Car Pickup',
    summary: 'Add a chauffeured car pickup from your drop point to your final destination, right from the bus checkout.',
    body: [
      'When booking a bus, YLT Transit offers an optional last-mile car pickup. A verified driver meets you at the bus drop point and drives you to your final address.',
      'Pricing is surge-aware and calculated by distance from the drop point to your destination. You can add this during bus checkout.',
      'You must provide a drop address via the address input modal. The car and driver details are shown on your ticket.',
    ],
  },
  {
    id: 'car-booking',
    category: 'Car',
    icon: Car,
    title: 'Car Bookings',
    summary: 'Six rental modes — chauffeured, outstation, airport, hourly, subscription and self-drive.',
    body: [
      'YLT Transit offers six car rental modes to cover every travel need:',
      '1. Chauffeured — a verified driver drives you in a rental car. Best for city trips and events.',
      '2. Outstation — intercity trips with driver. Round-trip and one-way available.',
      '3. Airport — pickup or drop to/from the airport with flight tracking.',
      '4. Hourly — book a car with driver for a fixed number of hours within city limits.',
      '5. Subscription — monthly car service for daily commutes. Billed monthly.',
      '6. Self-Drive — rent a car and drive yourself. License verification required.',
      'All cars come with insurance add-on options, surge-aware pricing, and downloadable PDF tickets.',
    ],
  },
  {
    id: 'my-bookings',
    category: 'Account',
    icon: Ticket,
    title: 'My Bookings & Tickets',
    summary: 'View all your bus and car bookings. Download PDF tickets, view QR codes, and track status.',
    body: [
      'The My Bookings page shows every booking tied to your account — buses and cars — sorted by date.',
      'Each booking card shows the PNR, route, date, time, seats, fare, and current status (Confirmed, Completed, Cancelled).',
      'Download a PDF ticket with QR code for offline verification. The QR encodes the PNR and is scannable by operators.',
      'Cancel eligible bookings from the booking card. Refunds are processed to the original payment method.',
    ],
  },
  {
    id: 'payments',
    category: 'Account',
    icon: CreditCard,
    title: 'Payments & Refunds',
    summary: 'UPI, cards and wallets. Instant PNR, digital tickets, and refunds to original payment method.',
    body: [
      'YLT Transit supports UPI, credit/debit cards and popular wallets. All payments are processed through a PCI-compliant gateway.',
      'On successful payment, your PNR is generated instantly and the booking is confirmed in real time.',
      'Cancellation refunds are credited back to the original payment method within 3-5 business days, depending on your bank.',
      'Fares include all taxes. The fare shown at checkout is the final amount — no hidden charges.',
    ],
  },
  {
    id: 'auth',
    category: 'Account',
    icon: Lock,
    title: 'Login & Authentication',
    summary: 'Email OTP or password login for customers. 7-day sessions. OTP sent via email.',
    body: [
      'Customers can sign in with email OTP (passwordless) or with an email + password account. OTP codes are sent via email using SMTP.',
      'Sessions last 7 days for customers and agent partners. You stay logged in across page refreshes.',
      'If you forget your password, use the OTP login flow to access your account, then reset from profile settings.',
    ],
  },
  {
    id: 'operator-erp',
    category: 'ERP',
    icon: Briefcase,
    title: 'Operator ERP',
    summary: 'Agent partners get a full ERP: fleet manager, expense ledger, driver roster, and AI dispatch assistant.',
    body: [
      'Agent partners (operators) get access to a full ERP via the ERP login tab in the login modal.',
      'Fleet Manager — add, edit and track cars in your fleet. Each car has a type, capacity, rate and status.',
      'Expense Ledger — log fuel, maintenance, tolls and other expenses per car. See profit/loss per vehicle.',
      'Driver Roster — manage drivers assigned to your cars. Track licenses, ratings and assignments.',
      'AI Dispatch Assistant — an AI-powered assistant that suggests optimal car-to-booking assignments based on location, availability and SLA.',
      'Operator credentials are managed by core admins. Contact your admin if you need an ERP account.',
    ],
  },
  {
    id: 'admin',
    category: 'Admin',
    icon: Shield,
    title: 'Admin Panel',
    summary: 'Core admins manage directors, agent partners, SMTP email settings, and app configuration.',
    body: [
      'The Admin Panel is for core admins only. Access it via the Admin tab in the header after logging in with admin credentials.',
      'Directors — manage the leadership/director profiles shown on the site, including photos and bios.',
      'Agent Partners — create and manage operator accounts who get ERP access.',
      'SMTP Settings — configure the email server used to send OTP codes and booking confirmations.',
      'App Settings — manage global app configuration like pricing, feature flags and branding.',
      'Admin sessions auto-expire after 5 minutes of inactivity for security.',
    ],
  },
  {
    id: 'security',
    category: 'Platform',
    icon: ShieldCheck,
    title: 'Security & Privacy',
    summary: 'JWT-based auth, RLS-protected database, encrypted sessions, and SLA-verified operators.',
    body: [
      'All authentication is JWT-based with signed tokens. Passwords are never stored in plain text.',
      'The database is protected by Row Level Security (RLS) — users can only read and write their own data.',
      'Every operator and car is SLA-verified: background checks, license verification, vehicle inspection and rating thresholds.',
      'Payment data never touches our servers — it goes directly to the PCI-compliant payment gateway.',
    ],
  },
  {
    id: 'about',
    category: 'Platform',
    icon: Sparkles,
    title: 'About YLT Transit',
    summary: 'An all-in-one transit operating system connecting buses and cars in one platform.',
    body: [
      'YLT Transit is an all-in-one transit operating system that connects intercity bus travel with last-mile car pickups, self-drive rentals, and hotel stays — all in a single platform.',
      'Built for three audiences: travelers (customers), agent partners (operators), and core admins.',
      'Travelers book buses and cars. Operators manage fleets and dispatch via the ERP. Admins manage the platform.',
      'Coverage spans 10+ South Indian cities with 500+ daily buses and a growing car network.',
    ],
  },
];

const CATEGORIES = ['All', 'Bus', 'Car', 'Account', 'ERP', 'Admin', 'Platform'];

export default function HelpPage({ go }: { go: (v: View) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [openId, setOpenId] = useState<string | null>('about');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const matchesCat = category === 'All' || a.category === category;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.body.join(' ').toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-crimson-600/15 blur-3xl animate-float-slow" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />
        </div>
        <div className="container-fluid relative py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center animate-slide-up">
            <span className="chip chip-crimson"><Sparkles className="h-3.5 w-3.5" /> Help Center</span>
            <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl" style={{ color: 'var(--text-primary)' }}>How can we help?</h1>
            <p className="mt-4 text-lg" style={{ color: 'var(--text-secondary)' }}>Search our knowledge base or browse by category to learn everything about YLT Transit.</p>
            {/* Search bar */}
            <div className="mt-8 relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for buses, cars, payments, ERP, admin..."
                className="input-field !rounded-xl !py-4 !pl-12 !text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category pills */}
      <div className="container-fluid py-6">
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                category === c
                  ? 'bg-crimson-600 text-white'
                  : 'border border-[var(--border)] bg-[var(--bg-raised)] hover:border-crimson-500/40 hover:text-crimson-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="container-fluid pb-20">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p style={{ color: 'var(--text-muted)' }}>No articles found for "{query}". Try a different search.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-3">
            {filtered.map((a) => {
              const isOpen = openId === a.id;
              return (
                <div
                  key={a.id}
                  className={`overflow-hidden rounded-xl border transition ${
                    isOpen ? 'border-crimson-500/40 bg-crimson-500/5' : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-crimson-500/30'
                  }`}
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : a.id)}
                    className="flex w-full items-center gap-4 p-5 text-left"
                  >
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${
                      isOpen ? 'bg-crimson-600 text-white' : 'bg-crimson-600/10 text-crimson-600'
                    }`}>
                      <a.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-crimson-600">{a.category}</span>
                      </div>
                      <h3 className="mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{a.title}</h3>
                      <p className="mt-0.5 truncate text-sm" style={{ color: 'var(--text-secondary)' }}>{a.summary}</p>
                    </div>
                    <ChevronRight className={`h-5 w-5 shrink-0 transition ${isOpen ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  {isOpen && (
                    <div className="animate-fade-up px-5 pb-5 pl-20">
                      <div className="space-y-3">
                        {a.body.map((p, i) => (
                          <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick links */}
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6" style={{ boxShadow: 'var(--shadow)' }}>
          <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Quick links</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <QuickLink icon={Navigation} label="Book a bus" onClick={() => go({ name: 'routes' })} />
            <QuickLink icon={Car} label="Rent a car" onClick={() => go({ name: 'cars' })} />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Mail className="h-3.5 w-3.5" />
            Still need help? Contact <span className="text-crimson-600">support@ylttravels.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 transition hover:border-crimson-500/40 hover:bg-crimson-500/5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-crimson-600/15 text-crimson-600"><Icon className="h-5 w-5" /></div>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <ChevronRight className="ml-auto h-4 w-4" style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}
