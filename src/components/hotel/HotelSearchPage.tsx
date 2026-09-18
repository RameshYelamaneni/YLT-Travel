import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Star, MapPin, Shield, ChevronDown, ChevronUp, Building2, Calendar, Users } from 'lucide-react';
import { useHotelStore, HOTEL_CITIES, defaultStayDates } from '../../store/hotelStore';

const AMENITY_OPTIONS = ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Parking', 'Gym', 'Bar', 'Room Service'];

const DEST_IMAGES: Record<string, string> = {
  Tirupati: 'https://images.pexels.com/photos/2161467/pexels-photo-2161467.jpeg?auto=compress&cs=tinysrgb&w=800',
  Chennai: 'https://images.pexels.com/photos/3573382/pexels-photo-3573382.jpeg?auto=compress&cs=tinysrgb&w=800',
  Hyderabad: 'https://images.pexels.com/photos/3581368/pexels-photo-3581368.jpeg?auto=compress&cs=tinysrgb&w=800',
  Bangalore: 'https://images.pexels.com/photos/3573351/pexels-photo-3573351.jpeg?auto=compress&cs=tinysrgb&w=800',
};

const inputClass = 'w-full rounded-lg border-2 px-3 py-3 text-sm font-medium transition hover:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30';
const inputStyle = {
  backgroundColor: 'var(--bg-surface)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  colorScheme: 'auto' as const,
};

const labelClass = 'mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide';
const labelTextStyle = { color: 'var(--text-primary)' };
const labelIconColor = 'text-gold-600';

export default function HotelSearchPage({ go }: { go: (v: any) => void }) {
  const store = useHotelStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { void store.hydrateFromApi(); }, []);

  function handleSearch() {
    const stay = defaultStayDates(store.filters.checkIn, store.filters.checkOut);
    store.setFilters({ checkIn: stay.checkIn, checkOut: stay.checkOut });
    store.searchHotels({ checkIn: stay.checkIn, checkOut: stay.checkOut });
    go({ name: 'hotelResults' });
  }

  function handleCityPick(city: string) {
    store.setFilters({ city });
    store.searchHotels({ city });
    go({ name: 'hotelResults' });
  }

  function toggleStar(s: number) {
    const cur = store.filters.starRatings;
    store.setFilter('starRatings', cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  }

  function toggleAmenity(a: string) {
    const cur = store.filters.amenities;
    store.setFilter('amenities', cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a]);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Hero with HD hotel image */}
      <div className="relative overflow-hidden" style={{ minHeight: 480 }}>
        <img
          src="https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Luxury hotel"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[var(--bg-page)]" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 pt-24 pb-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            <Building2 className="h-3.5 w-3.5" /> YLT Hotels — Verified Stays
          </div>
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl drop-shadow-lg">Find Your Perfect Stay</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/80">
            Book from SLA-verified hotels across South India with guaranteed quality,
            competitive rates, and instant confirmation.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-4xl px-4 pb-16">
        {/* Search card */}
        <div className="rounded-2xl border-2 p-6 shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* City */}
            <div className="relative">
              <label className={labelClass} style={labelTextStyle}>
                <MapPin className={`h-4 w-4 ${labelIconColor}`} /> City
              </label>
              <button
                onClick={() => setCityOpen(!cityOpen)}
                className={`${inputClass} flex items-center justify-between`}
                style={inputStyle}
              >
                <span style={{ color: store.filters.city ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {store.filters.city || 'Select city'}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
              </button>
              {cityOpen && (
                <div
                  className="absolute z-20 mt-1 w-full rounded-xl border-2 shadow-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  {HOTEL_CITIES.map(c => (
                    <button
                      key={c}
                      onClick={() => { store.setFilter('city', c); setCityOpen(false); }}
                      className="block w-full px-4 py-3 text-left text-sm font-semibold transition hover:bg-[var(--bg-raised)]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Check-in */}
            <div>
              <label className={labelClass} style={labelTextStyle}>
                <Calendar className={`h-4 w-4 ${labelIconColor}`} /> Check-in
              </label>
              <input
                type="date"
                min={today}
                value={store.filters.checkIn}
                onChange={e => store.setFilter('checkIn', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Check-out */}
            <div>
              <label className={labelClass} style={labelTextStyle}>
                <Calendar className={`h-4 w-4 ${labelIconColor}`} /> Check-out
              </label>
              <input
                type="date"
                min={store.filters.checkIn || today}
                value={store.filters.checkOut}
                onChange={e => store.setFilter('checkOut', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Guests */}
            <div>
              <label className={labelClass} style={labelTextStyle}>
                <Users className={`h-4 w-4 ${labelIconColor}`} /> Guests
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={store.filters.guests}
                onChange={e => store.setFilter('guests', +e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {/* More filters toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="mt-4 flex items-center gap-2 text-sm font-semibold transition hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filtersOpen ? 'Hide Filters' : 'More Filters'}
            {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {filtersOpen && (
            <div className="mt-4 grid gap-5 border-t-2 pt-5 sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: 'var(--border)' }}>
              {/* Price range */}
              <div>
                <label className={`${labelClass} block`} style={labelTextStyle}>Price Range (₹)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={store.filters.priceMin || ''}
                    onChange={e => store.setFilter('priceMin', +e.target.value)}
                    className="w-full rounded-lg border-2 px-2 py-2 text-sm font-medium"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={store.filters.priceMax === 50000 ? '' : store.filters.priceMax}
                    onChange={e => store.setFilter('priceMax', +e.target.value || 50000)}
                    className="w-full rounded-lg border-2 px-2 py-2 text-sm font-medium"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Star rating */}
              <div>
                <label className={`${labelClass} block`} style={labelTextStyle}>Star Rating</label>
                <div className="flex gap-1.5">
                  {[5, 4, 3, 2, 1].map(s => (
                    <button
                      key={s}
                      onClick={() => toggleStar(s)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition ${
                        store.filters.starRatings.includes(s)
                          ? 'bg-amber-500/20 text-amber-600'
                          : 'bg-[var(--bg-raised)]'
                      }`}
                      style={store.filters.starRatings.includes(s) ? undefined : { color: 'var(--text-primary)' }}
                    >
                      {s}<Star className="h-3 w-3 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className={`${labelClass} block`} style={labelTextStyle}>Amenities</label>
                <div className="flex flex-wrap gap-1.5">
                  {AMENITY_OPTIONS.map(a => (
                    <button
                      key={a}
                      onClick={() => toggleAmenity(a)}
                      className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition ${
                        store.filters.amenities.includes(a) ? 'bg-sky-500/20 text-sky-600' : 'bg-[var(--bg-raised)]'
                      }`}
                      style={store.filters.amenities.includes(a) ? undefined : { color: 'var(--text-primary)' }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* SLA toggle */}
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2">
                  <div className="relative" onClick={() => store.setFilter('slaOnly', !store.filters.slaOnly)}>
                    <div className={`h-5 w-9 rounded-full transition ${store.filters.slaOnly ? 'bg-emerald-500' : 'bg-[var(--bg-raised)]'}`} />
                    <div className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${store.filters.slaOnly ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    <Shield className="h-3.5 w-3.5 text-emerald-500" /> SLA Verified Only
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="btn-search group mt-6 w-full py-4 text-base"
          >
            <Search className="h-5 w-5 transition-transform group-hover:scale-110" /> Search Hotels
          </button>
        </div>

        {/* Popular destinations */}
        <div className="mt-16">
          <h2 className="mb-1 font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Popular Destinations</h2>
          <p className="mb-6 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Explore top cities with the best hotel options</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(DEST_IMAGES).map(([city, img]) => (
              <button
                key={city}
                onClick={() => handleCityPick(city)}
                className="group relative overflow-hidden rounded-xl border-2 transition hover:border-crimson-500/40 hover:shadow-xl"
                style={{ borderColor: 'var(--border)', height: 220 }}
              >
                <img src={img} alt={city} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <p className="flex items-center gap-1.5 text-lg font-bold text-white drop-shadow">
                    <MapPin className="h-4 w-4 text-crimson-400" />{city}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-white/80">
                    {store.allHotels.filter(h => h.city === city).length} hotels available
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
