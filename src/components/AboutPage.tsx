import { useEffect, useState } from 'react';
import { Sparkles, Linkedin, Mail, MapPin, Phone, Bus, Car, ShieldCheck, Award } from 'lucide-react';
import { fetchDirectors, fetchSettings } from '../lib/cms';

interface Director {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  image_url: string | null;
  linkedin_url: string | null;
  order_index: number;
}

interface Settings {
  upi_id: string | null;
  whatsapp_number: string | null;
  support_email: string | null;
}

export default function AboutPage() {
  const [directors, setDirectors] = useState<Director[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [dirs, sett] = await Promise.all([
        fetchDirectors(),
        fetchSettings(),
      ]);
      setDirectors(dirs);
      setSettings({
        support_email: sett.support_email,
        whatsapp_number: sett.whatsapp_number,
      } as Settings);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-crimson-600/15 blur-3xl animate-float-slow" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />
        </div>
        <div className="container-fluid relative py-16 sm:py-24 text-center">
          <span className="chip chip-crimson"><Sparkles className="h-3.5 w-3.5" /> About Us</span>
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl animate-slide-up" style={{ color: 'var(--text-primary)' }}>
            YLT Travels
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg animate-slide-up" style={{ color: 'var(--text-secondary)' }}>
            The all-in-one transit operating system connecting South India by bus and car — built for travelers, operators, and admins.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 max-w-2xl mx-auto">
            <Stat icon={Bus} label="500+ daily buses" />
            <Stat icon={Car} label="6 rental modes" />
            <Stat icon={MapPin} label="10+ cities" />
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="container-fluid py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Our Mission</h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            YLT Travels unifies intercity bus travel, last-mile car pickups, self-drive rentals, and hotel stays into a single platform. We serve three audiences: travelers who book journeys, agent partners who manage fleets and dispatch, and core admins who run the platform. Coverage spans Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, and Telangana.
          </p>
        </div>
      </section>

      {/* Board of Directors */}
      <section className="container-fluid pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="chip chip-crimson"><Award className="h-3.5 w-3.5" /> Leadership</span>
            <h2 className="mt-3 font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Board of Directors</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>The team steering YLT Travels forward.</p>
          </div>

          {loading ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }}>
                  <div className="mx-auto h-24 w-24 rounded-full bg-[var(--bg-raised)]" />
                  <div className="mx-auto mt-4 h-4 w-2/3 rounded bg-[var(--bg-raised)]" />
                  <div className="mx-auto mt-2 h-3 w-1/2 rounded bg-[var(--bg-raised)]" />
                </div>
              ))}
            </div>
          ) : directors.length === 0 ? (
            <p className="mt-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Director profiles will appear here soon.</p>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {directors.map((d) => (
                <div key={d.id} className="group rounded-2xl border bg-[var(--bg-surface)] p-6 text-center transition hover:border-crimson-500/40 hover:shadow-lg" style={{ borderColor: 'var(--border)' }}>
                  <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-crimson-500/20 bg-[var(--bg-raised)]">
                    {d.image_url ? (
                      <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-2xl font-bold text-crimson-600">
                        {d.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</h3>
                  <p className="mt-0.5 text-sm font-medium text-crimson-600">{d.role}</p>
                  {d.bio && <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{d.bio}</p>}
                  {d.linkedin_url && (
                    <a href={d.linkedin_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs text-crimson-600 hover:underline">
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="container-fluid pb-20">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-[var(--bg-surface)] p-8" style={{ borderColor: 'var(--border)' }}>
          <div className="text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-crimson-600" />
            <h2 className="mt-3 font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Get in Touch</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>We're here to help with bookings, partnerships, and support.</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {settings?.support_email && (
              <ContactCard icon={Mail} label="Email" value={settings.support_email} />
            )}
            {settings?.whatsapp_number && (
              <ContactCard icon={Phone} label="WhatsApp" value={settings.whatsapp_number} />
            )}
            <ContactCard icon={MapPin} label="HQ" value="Tirupati, Andhra Pradesh" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="rounded-xl border bg-[var(--bg-surface)] px-3 py-3" style={{ borderColor: 'var(--border)' }}>
      <Icon className="mx-auto h-5 w-5 text-crimson-600" />
      <p className="mt-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  );
}

function ContactCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-[var(--bg-raised)] p-4 text-center" style={{ borderColor: 'var(--border)' }}>
      <Icon className="mx-auto h-5 w-5 text-crimson-600" />
      <p className="mt-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
