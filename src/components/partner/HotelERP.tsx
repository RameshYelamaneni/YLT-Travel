import { useState } from 'react';
import {
  Hotel as HotelIcon, Plus, Star, MapPin, Shield, BedDouble, Users, TrendingUp,
  Trash2, Edit3, X, DollarSign, Percent, Wifi, Waves, Sparkles, Utensils, Dumbbell,
  Snowflake, ConciergeBell, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { usePartnerHotelStore, fmtINR, hotelSlaCompliance, avgOccupancy, type HotelAsset, type HotelBookingRecord } from '../../store/partnerHotelStore';

const ALL_AMENITIES = ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Parking', 'Gym', 'Bar', 'Room Service', 'Laundry', 'AC', 'Airport Shuttle', 'Business Center'];

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  WiFi: Wifi, Pool: Waves, Spa: Sparkles, Restaurant: Utensils, Gym: Dumbbell,
  AC: Snowflake, 'Room Service': ConciergeBell,
};

export default function HotelERP() {
  const { hotels, bookings, addHotel, updateHotel, removeHotel, toggleSla, updateRoom, updateBookingStatus, addBooking } = usePartnerHotelStore();
  const [editing, setEditing] = useState<HotelAsset | null>(null);
  const [adding, setAdding] = useState(false);
  const [addingBooking, setAddingBooking] = useState(false);
  const [tab, setTab] = useState<'inventory' | 'bookings' | 'analytics'>('inventory');

  const totalRevenue = hotels.reduce((s, h) => s + h.monthlyRevenue, 0);
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked-in').length;
  const sla = hotelSlaCompliance(hotels);
  const occ = avgOccupancy(hotels);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Hotel ERP</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your hotel inventory, rooms, bookings & SLA compliance.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add Hotel</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Hotels" value={String(hotels.length)} sub={`${hotels.filter(h => h.status === 'active').length} active`} icon={HotelIcon} tone="crimson" />
        <StatCard label="Monthly Revenue" value={`₹${fmtINR(totalRevenue)}`} sub="Across all properties" icon={DollarSign} tone="green" />
        <StatCard label="Avg Occupancy" value={`${occ}%`} sub={occ >= 70 ? 'Healthy' : 'Needs boost'} icon={Percent} tone="blue" />
        <StatCard label="SLA Compliance" value={`${sla}%`} sub={sla >= 80 ? 'Verified' : 'Action needed'} icon={Shield} tone={sla >= 80 ? 'green' : 'amber'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['inventory', 'bookings', 'analytics'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="grid gap-4 md:grid-cols-2">
          {hotels.map(h => (
            <div key={h.id} className="overflow-hidden rounded-2xl border bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border)' }}>
              <div className="relative h-40">
                <img src={h.photo} alt={h.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-white">{h.name}</h3>
                    <p className="flex items-center gap-1 text-xs text-white/80"><MapPin className="h-3 w-3" />{h.city}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-3 w-3 ${i < h.stars ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />)}
                  </div>
                </div>
                <span className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${h.slaVerified ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
                  <Shield className="h-3 w-3" />{h.slaVerified ? 'SLA' : 'Pending'}
                </span>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5">
                  {h.amenities.slice(0, 5).map(a => {
                    const Icon = AMENITY_ICONS[a];
                    return <span key={a} className="flex items-center gap-1 rounded-full bg-[var(--bg-raised)] px-2 py-0.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{Icon && <Icon className="h-2.5 w-2.5" />}{a}</span>;
                  })}
                  {h.amenities.length > 5 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{h.amenities.length - 5}</span>}
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rooms</p>
                  {h.rooms.map(r => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg bg-[var(--bg-raised)] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.type}</span>
                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}><Users className="h-2.5 w-2.5" />{r.capacity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-crimson-600">₹{fmtINR(r.rate)}</span>
                        <button onClick={() => updateRoom(h.id, r.id, { available: !r.available })}
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${r.available ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}>
                          {r.available ? 'AVAIL' : 'CLOSED'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-[var(--bg-raised)] p-2">
                    <p style={{ color: 'var(--text-muted)' }}>Occupancy</p>
                    <p className="font-bold" style={{ color: h.occupancyPct >= 70 ? 'var(--text-primary)' : '#f59e0b' }}>{h.occupancyPct}%</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-raised)] p-2">
                    <p style={{ color: 'var(--text-muted)' }}>Monthly Rev</p>
                    <p className="font-bold text-emerald-600">₹{fmtINR(h.monthlyRevenue)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.contactPhone}</span>
                  <div className="flex gap-2">
                    <button className="text-xs font-medium text-crimson-600" onClick={() => setEditing(h)}><Edit3 className="h-3.5 w-3.5" /></button>
                    <button className="text-xs font-medium text-amber-600" onClick={() => toggleSla(h.id)} title="Toggle SLA"><Shield className="h-3.5 w-3.5" /></button>
                    <button className="text-xs font-medium text-red-500" onClick={() => removeHotel(h.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bookings Tab */}
      {tab === 'bookings' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button className="btn-primary text-sm" onClick={() => setAddingBooking(true)}><Plus className="h-4 w-4" /> New Booking</button>
          </div>
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-4 py-3 font-semibold">PNR</th>
                  <th className="px-4 py-3 font-semibold">Hotel</th>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Check-in</th>
                  <th className="px-4 py-3 font-semibold">Nights</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b transition hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{b.pnr}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{b.hotelName}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{b.guestName}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{b.roomType}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{b.checkIn}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{b.nights}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">₹{fmtINR(b.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        b.status === 'confirmed' ? 'bg-sky-500/15 text-sky-600' :
                        b.status === 'checked-in' ? 'bg-emerald-500/15 text-emerald-600' :
                        b.status === 'checked-out' ? 'bg-gray-500/15 text-gray-500' :
                        'bg-red-500/15 text-red-500'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {b.status === 'confirmed' && (
                          <button onClick={() => updateBookingStatus(b.id, 'checked-in')} className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-500/25">Check In</button>
                        )}
                        {b.status === 'checked-in' && (
                          <button onClick={() => updateBookingStatus(b.id, 'checked-out')} className="rounded-md bg-gray-500/15 px-2 py-1 text-[10px] font-semibold text-gray-500 transition hover:bg-gray-500/25">Check Out</button>
                        )}
                        {b.status === 'cancelled' && (
                          <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="rounded-md bg-sky-500/15 px-2 py-1 text-[10px] font-semibold text-sky-600 transition hover:bg-sky-500/25">Restore</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          {addingBooking && (
            <NewBookingModal hotels={hotels} onClose={() => setAddingBooking(false)} onSave={(b) => { addBooking(b); setAddingBooking(false); }} />
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Occupancy by Hotel</h3>
              <div className="space-y-3">
                {hotels.map(h => (
                  <div key={h.id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>{h.name}</span>
                      <span className="font-bold" style={{ color: h.occupancyPct >= 70 ? 'var(--text-primary)' : '#f59e0b' }}>{h.occupancyPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-raised)' }}>
                      <div className={`h-full rounded-full transition-all ${h.occupancyPct >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${h.occupancyPct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Revenue by Hotel</h3>
              <div className="space-y-3">
                {hotels.map(h => (
                  <div key={h.id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>{h.name}</span>
                      <span className="font-bold text-emerald-600">₹{fmtINR(h.monthlyRevenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-raised)' }}>
                      <div className="h-full rounded-full bg-crimson-600 transition-all" style={{ width: `${(h.monthlyRevenue / Math.max(...hotels.map(x => x.monthlyRevenue))) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            <h3 className="mb-4 flex items-center gap-2 font-display font-bold" style={{ color: 'var(--text-primary)' }}>
              <AlertTriangle className="h-4 w-4 text-amber-500" /> SLA & Performance Alerts
            </h3>
            <div className="space-y-2">
              {hotels.filter(h => !h.slaVerified).map(h => (
                <div key={h.id} className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}><span className="font-semibold">{h.name}</span> — SLA verification pending. Complete checklist to enable bookings.</span>
                </div>
              ))}
              {hotels.filter(h => h.occupancyPct < 60).map(h => (
                <div key={`occ-${h.id}`} className="flex items-center gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                  <TrendingUp className="h-4 w-4 text-sky-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}><span className="font-semibold">{h.name}</span> — Low occupancy ({h.occupancyPct}%). Consider dynamic pricing or promotions.</span>
                </div>
              ))}
              {hotels.filter(h => h.slaVerified && h.occupancyPct >= 60).map(h => (
                <div key={`ok-${h.id}`} className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}><span className="font-semibold">{h.name}</span> — Performing well. SLA verified, {h.occupancyPct}% occupancy.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(adding || editing) && (
        <HotelForm
          hotel={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSave={(data) => {
            if (editing) updateHotel(editing.id, data);
            else addHotel(data as Omit<HotelAsset, 'id'>);
            setAdding(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; tone: 'crimson' | 'green' | 'blue' | 'amber' }) {
  const tones: Record<string, string> = { crimson: 'text-crimson-600 bg-crimson-500/10', green: 'text-emerald-600 bg-emerald-500/10', blue: 'text-blue-600 bg-blue-500/10', amber: 'text-amber-600 bg-amber-500/10' };
  return (
    <div className="rounded-2xl border bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="mt-1 font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function HotelForm({ hotel, onClose, onSave }: { hotel: HotelAsset | null; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState({
    name: hotel?.name ?? '', city: hotel?.city ?? '', address: hotel?.address ?? '', stars: hotel?.stars ?? 3,
    amenities: hotel?.amenities ?? ['WiFi', 'AC'], slaVerified: hotel?.slaVerified ?? false,
    status: hotel?.status ?? 'active', occupancyPct: hotel?.occupancyPct ?? 50, monthlyRevenue: hotel?.monthlyRevenue ?? 0,
    contactPhone: hotel?.contactPhone ?? '', photo: hotel?.photo ?? 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=400',
    rooms: hotel?.rooms ?? [{ id: 'r1', type: 'Standard', capacity: 2, rate: 2000, available: true }],
  });

  function toggleAmenity(a: string) {
    setF(s => ({ ...s, amenities: s.amenities.includes(a) ? s.amenities.filter(x => x !== a) : [...s.amenities, a] }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{hotel ? 'Edit Hotel' : 'Add Hotel'}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <L label="Hotel Name"><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="City"><input className={inputCls} value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></L>
            <L label="Stars"><select className={inputCls} value={f.stars} onChange={e => setF({ ...f, stars: +e.target.value })}>{[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s} Star</option>)}</select></L>
          </div>
          <L label="Address"><input className={inputCls} value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></L>
          <L label="Contact Phone"><input className={inputCls} value={f.contactPhone} onChange={e => setF({ ...f, contactPhone: e.target.value })} /></L>
          <div>
            <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Amenities</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_AMENITIES.map(a => (
                <button key={a} onClick={() => toggleAmenity(a)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${f.amenities.includes(a) ? 'bg-sky-500/20 text-sky-400' : 'bg-[var(--bg-raised)]'}`}
                  style={f.amenities.includes(a) ? undefined : { color: 'var(--text-secondary)' }}>{a}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="Status"><select className={inputCls} value={f.status} onChange={e => setF({ ...f, status: e.target.value as any })}><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option></select></L>
            <L label="Occupancy %"><input type="number" className={inputCls} value={f.occupancyPct} onChange={e => setF({ ...f, occupancyPct: +e.target.value })} /></L>
          </div>
          <L label="Monthly Revenue (₹)"><input type="number" className={inputCls} value={f.monthlyRevenue} onChange={e => setF({ ...f, monthlyRevenue: +e.target.value })} /></L>
          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={f.slaVerified} onChange={e => setF({ ...f, slaVerified: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>SLA Verified</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
            <button className="btn-primary text-sm" onClick={() => onSave(f)}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>{children}</label>;
}

const inputCls = 'w-full rounded-lg border bg-[var(--bg-raised)] px-3 py-2 text-sm outline-none focus:border-crimson-500';

function NewBookingModal({ hotels, onClose, onSave }: { hotels: HotelAsset[]; onClose: () => void; onSave: (b: Omit<HotelBookingRecord, 'id'>) => void }) {
  const [f, setF] = useState({
    pnr: `YLTH${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    hotelId: hotels[0]?.id ?? '',
    guestName: '',
    roomType: hotels[0]?.rooms[0]?.type ?? 'Standard',
    checkIn: new Date().toISOString().slice(0, 10),
    nights: 1,
    amount: hotels[0]?.rooms[0]?.rate ?? 2000,
    status: 'confirmed' as HotelBookingRecord['status'],
  });

  function save() {
    const hotel = hotels.find((h) => h.id === f.hotelId);
    const checkOut = new Date(new Date(f.checkIn).getTime() + f.nights * 86400000).toISOString().slice(0, 10);
    onSave({
      pnr: f.pnr,
      hotelName: hotel?.name ?? '',
      guestName: f.guestName,
      roomType: f.roomType,
      checkIn: f.checkIn,
      checkOut,
      nights: f.nights,
      amount: f.amount,
      status: f.status,
    });
  }

  return (
    <div className="erp-overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="erp-modal-enter w-full max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>New Hotel Booking</h3>
          <button onClick={onClose}><X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <L label="PNR"><input className={inputCls} value={f.pnr} onChange={(e) => setF({ ...f, pnr: e.target.value })} /></L>
            <L label="Hotel"><select className={inputCls} value={f.hotelId} onChange={(e) => { const h = hotels.find((x) => x.id === e.target.value); setF({ ...f, hotelId: e.target.value, roomType: h?.rooms[0]?.type ?? 'Standard', amount: h?.rooms[0]?.rate ?? 2000 }); }}><option value="">Select</option>{hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></L>
          </div>
          <L label="Guest Name"><input className={inputCls} value={f.guestName} onChange={(e) => setF({ ...f, guestName: e.target.value })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Room Type"><select className={inputCls} value={f.roomType} onChange={(e) => setF({ ...f, roomType: e.target.value })}>{hotels.find((h) => h.id === f.hotelId)?.rooms.map((r) => <option key={r.id} value={r.type}>{r.type}</option>)}</select></L>
            <L label="Nights"><input type="number" className={inputCls} value={f.nights} onChange={(e) => setF({ ...f, nights: +e.target.value })} /></L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="Check-in"><input type="date" className={inputCls} value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></L>
            <L label="Amount (₹)"><input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></L>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
            <button className="btn-primary text-sm" onClick={save}>Create Booking</button>
          </div>
        </div>
      </div>
    </div>
  );
}
