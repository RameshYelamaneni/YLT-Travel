import { useState } from 'react';
import {
  ArrowLeft, Star, MapPin, Shield, Wifi, Waves, Sparkles, Utensils, ParkingCircle,
  Dumbbell, Wine, ConciergeBell, WashingMachine, Snowflake, Plane, Briefcase,
  BedDouble, Users, Phone, Mail, Calendar, ChevronRight,
} from 'lucide-react';
import { useHotelStore } from '../../store/hotelStore';
import { formatINR } from '../../lib/format';

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  WiFi: Wifi, Pool: Waves, Spa: Sparkles, Restaurant: Utensils, Parking: ParkingCircle,
  Gym: Dumbbell, Bar: Wine, 'Room Service': ConciergeBell, Laundry: WashingMachine,
  AC: Snowflake, 'Airport Shuttle': Plane, 'Business Center': Briefcase,
};

export default function HotelDetailsPage({ hotelId, go }: { hotelId: string; go: (v: any) => void }) {
  const hotel = useHotelStore(s => s.getHotel(hotelId));
  const [mainPhoto, setMainPhoto] = useState(0);

  if (!hotel) return (
    <div className="grid min-h-[60vh] place-items-center" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="text-center">
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Hotel not found</p>
        <button onClick={() => go({ name: 'hotelResults' })} className="mt-3 rounded-lg bg-crimson-600 px-4 py-2 text-sm text-white">Back to Results</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <button onClick={() => go({ name: 'hotelResults' })}
          className="mb-4 flex items-center gap-2 text-sm font-medium transition hover:text-crimson-500" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to Results
        </button>

        <div className="mb-6 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <img src={hotel.photos[mainPhoto]} alt={hotel.name} className="h-64 w-full object-cover sm:h-80" />
          <div className="flex gap-2 overflow-x-auto p-3" style={{ backgroundColor: 'var(--bg-card)' }}>
            {hotel.photos.map((p, i) => (
              <button key={i} onClick={() => setMainPhoto(i)}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === mainPhoto ? 'border-crimson-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <img src={p} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{hotel.name}</h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="h-4 w-4" />{hotel.city} &middot; {hotel.address}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < hotel.stars ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />)}</div>
                    {hotel.sla_verified && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400"><Shield className="h-3 w-3" />SLA Verified</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-sky-500/10 px-4 py-2.5">
                  <span className="text-2xl font-bold text-sky-400">{hotel.avg_rating}</span>
                  <div>
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hotel.review_count} reviews</p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{hotel.description}</p>
            </div>

            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h2 className="mb-4 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Amenities</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {hotel.amenities.map(a => {
                  const Icon = AMENITY_ICONS[a] || Sparkles;
                  return (
                    <div key={a} className="flex items-center gap-2.5 rounded-lg p-2.5" style={{ backgroundColor: 'var(--bg-surface)' }}>
                      <Icon className="h-4 w-4 text-sky-400" />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{a}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h2 className="mb-4 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Available Rooms</h2>
              <div className="space-y-3">
                {hotel.rooms.map(room => (
                  <div key={room.id} className="flex flex-col overflow-hidden rounded-lg border transition hover:border-crimson-500/30 sm:flex-row" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                    <img src={room.photo} alt={room.room_type} className="h-32 w-full object-cover sm:h-auto sm:w-40" />
                    <div className="flex flex-1 items-center justify-between gap-4 p-4">
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{room.room_type}</h3>
                        <p className="mt-0.5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{room.bed_type}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />Max {room.max_guests}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {room.amenities.slice(0, 4).map(a => <span key={a} className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-muted)' }}>{a}</span>)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-crimson-500">{formatINR(room.price_per_night)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>per night + GST</p>
                        {room.available ? (
                          <button onClick={() => go({ name: 'hotelCheckout', hotelId: hotel.id, roomId: room.id })}
                            className="mt-2 flex items-center gap-1 rounded-lg bg-crimson-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-crimson-700">
                            Select <ChevronRight className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="mt-2 inline-block rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">Sold Out</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Guest Reviews</h2>
                <div className="flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-3 py-1.5">
                  <span className="text-lg font-bold text-sky-400">{hotel.avg_rating}</span>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <div className="space-y-3">
                {hotel.reviews.map(r => (
                  <div key={r.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.guest_name}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />)}
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.comment}</p>
                    <p className="mt-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Cancellation Policy</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{hotel.cancellation_policy}</p>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Contact</h3>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><Phone className="h-3.5 w-3.5 text-sky-400" />{hotel.contact_phone}</p>
                <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><Mail className="h-3.5 w-3.5 text-sky-400" />{hotel.contact_email}</p>
              </div>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Quick Book</h3>
              <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>Starting from</p>
              <p className="text-2xl font-bold text-crimson-500">{formatINR(hotel.base_price)}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/night</span></p>
              <button onClick={() => { const r = hotel.rooms.find(rm => rm.available); if (r) go({ name: 'hotelCheckout', hotelId: hotel.id, roomId: r.id }); }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-crimson-600 py-2.5 text-sm font-semibold text-white transition hover:bg-crimson-700">
                <Calendar className="h-4 w-4" /> Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
