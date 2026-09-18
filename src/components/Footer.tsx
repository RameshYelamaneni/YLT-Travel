import { useState } from 'react';
import {
  Navigation, Car, Bed, Mail, Phone, MapPin, CheckCircle2,
  Facebook, Twitter, Instagram, ArrowRight, ShieldCheck, BadgeCheck, Star,
  Apple, Download,
} from 'lucide-react';
import { useNav, type View } from '../store/nav';
import { subscribeNewsletter } from '../lib/hotels';
import { YltLogo } from './BrandLogo';
import { onboardPublicHref, offsiteLinkProps } from '../lib/onboardHost';

export default function Footer() {
  const { go } = useNav();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setStatus('loading');
    setError('');
    const { error: err } = await subscribeNewsletter(email.trim(), undefined, 'footer');
    if (err) { setStatus('error'); setError(err); return; }
    setStatus('success');
    setEmail('');
  }

  const navItems: { label: string; view: View; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'Bus Booking', view: { name: 'routes' }, icon: Navigation },
    { label: 'Car Booking', view: { name: 'cars' }, icon: Car },
    { label: 'Hotel Booking', view: { name: 'hotels' }, icon: Bed },
  ];

  return (
    <footer className="mt-auto border-t" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      {/* App download band */}
      <div className="border-b" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, rgba(11, 31, 58, 0.08), transparent)' }}>
        <div className="container-fluid py-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h3 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Download the YLT Travels app</h3>
              <p className="mt-2 max-w-xl" style={{ color: 'var(--text-secondary)' }}>Book buses, cars, and hotels on the go. Exclusive app-only fares, instant PNR, offline tickets, and real-time tracking.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="group flex items-center gap-3 rounded-xl border px-4 py-2.5 transition hover:border-gold-500 hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                  <Apple className="h-6 w-6" style={{ color: 'var(--text-primary)' }} />
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Download on the</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>App Store</p>
                  </div>
                </button>
                <button className="group flex items-center gap-3 rounded-xl border px-4 py-2.5 transition hover:border-gold-500 hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                  <Download className="h-6 w-6" style={{ color: 'var(--text-primary)' }} />
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Get it on</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Google Play</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative grid h-36 w-36 place-items-center rounded-3xl" style={{ background: 'linear-gradient(135deg, rgb(11, 31, 58), rgb(22, 58, 98))' }}>
                <Navigation className="h-16 w-16 text-white" />
                <span className="absolute bottom-3 text-xs font-bold text-white/90">YLT TRAVELS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter band */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container-fluid py-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <h4 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Get travel deals &amp; offers</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Subscribe for seasonal fares and exclusive discounts.</p>
            </div>
            {status === 'success' ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 animate-scale-in">
                <CheckCircle2 className="h-5 w-5" /> You're subscribed! Watch your inbox for deals.
              </div>
            ) : (
              <form onSubmit={subscribe} className="flex w-full max-w-md gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-gold-500"
                  style={{ backgroundColor: 'var(--bg-raised)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
                <button type="submit" disabled={status === 'loading'} className="btn-primary whitespace-nowrap disabled:opacity-60">
                  {status === 'loading' ? 'Subscribing…' : <>Subscribe <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      </div>

      {/* Main footer */}
      <div className="container-fluid py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <button onClick={() => go({ name: 'home' })} className="flex items-center gap-2">
              <YltLogo size={36} />
              <span className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>YLT Travels</span>
            </button>
            <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Book buses and hotels online across South India — live seats, UPI, QR e-tickets, and last-mile cars in one place.</p>
            <div className="mt-5 flex gap-3">
              <button aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-lg border transition hover:border-gold-500 hover:bg-navy-700 hover:text-white" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <Facebook className="h-4 w-4" />
              </button>
              <button aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-lg border transition hover:border-gold-500 hover:bg-navy-700 hover:text-white" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <Instagram className="h-4 w-4" />
              </button>
              <button aria-label="Twitter" className="grid h-9 w-9 place-items-center rounded-lg border transition hover:border-gold-500 hover:bg-navy-700 hover:text-white" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <Twitter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Services</h4>
            <div className="mt-4 space-y-3" style={{ color: 'var(--text-secondary)' }}>
              {navItems.map((item) => (
                <button key={item.label} onClick={() => go(item.view)} className="flex items-center gap-2 text-sm transition hover:text-navy-600">
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Info</h4>
            <div className="mt-4 space-y-3" style={{ color: 'var(--text-secondary)' }}>
              <button onClick={() => go({ name: 'about' })} className="flex items-center gap-2 text-sm transition hover:text-navy-600">About Us</button>
              <button onClick={() => go({ name: 'help' })} className="flex items-center gap-2 text-sm transition hover:text-navy-600">Help &amp; Support</button>
              <button onClick={() => go({ name: 'careers' })} className="flex items-center gap-2 text-sm transition hover:text-navy-600">Careers</button>
              <button onClick={() => go({ name: 'offers' })} className="flex items-center gap-2 text-sm transition hover:text-navy-600">Offers</button>
              <a {...offsiteLinkProps(onboardPublicHref('operator'))} className="block text-sm transition hover:text-navy-600">Bus operator registration</a>
              <a {...offsiteLinkProps(onboardPublicHref('agent'))} className="block text-sm transition hover:text-navy-600">Agent registration</a>
              <a {...offsiteLinkProps(onboardPublicHref('hotel', 'registration'))} className="block text-sm transition hover:text-navy-600">Hotel partner registration</a>
              <a {...offsiteLinkProps(onboardPublicHref('insurance'))} className="block text-sm transition hover:text-navy-600">Insurance partner</a>
              <button onClick={() => go({ name: 'help' })} className="flex items-center gap-2 text-sm transition hover:text-navy-600">T&amp;C</button>
              <button onClick={() => go({ name: 'help' })} className="flex items-center gap-2 text-sm transition hover:text-navy-600">Privacy Policy</button>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Contact</h4>
            <div className="mt-4 space-y-3" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-2 text-sm transition hover:text-navy-600"><Phone className="h-3.5 w-3.5" /> +91 99999 99999</span>
              <span className="flex items-center gap-2 text-sm transition hover:text-navy-600"><Mail className="h-3.5 w-3.5" /> support@ylttravels.com</span>
              <span className="flex items-center gap-2 text-sm transition hover:text-navy-600"><MapPin className="h-3.5 w-3.5" /> Tirupati, Andhra Pradesh</span>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-10 flex flex-wrap items-center gap-6 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-gold-600" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>SLA Verified Operators</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-gold-600" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>4.7+ Rated by 50k+ Travelers</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="container-fluid flex flex-col items-center justify-between gap-3 py-5 sm:flex-row">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© {new Date().getFullYear()} YLT Travels. All rights reserved.</p>
          <div className="flex flex-wrap gap-5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <button className="transition hover:text-navy-600">Privacy Policy</button>
            <button className="transition hover:text-navy-600">Terms of Service</button>
            <button className="transition hover:text-navy-600">Refund Policy</button>
            <button className="transition hover:text-navy-600">Cookies</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
