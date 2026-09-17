import { useEffect } from 'react';
import { ArrowLeft, Star, MapPin, Shield, SortAsc } from 'lucide-react';
import { useHotelStore } from '../../store/hotelStore';
import { formatINR } from '../../lib/format';

export default function HotelResultsPage({ go }: { go: (v: any) => void }) {
  const { filtered, loading, filters, setFilter, searchHotels } = useHotelStore();

  useEffect(() => { searchHotels(); }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => go({ name: 'hotels' })}
              className="rounded-lg border p-2 transition hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {loading ? 'Searching...' : `${filtered.length} hotels found`}
              </h1>
              {filters.city && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-400">
                  <MapPin className="h-3 w-3" />{filters.city}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <select value={filters.sortBy} onChange={e => { setFilter('sortBy', e.target.value as any); searchHotels(); }}
              className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="stars">Star Rating</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                <div className="flex gap-4">
                  <div className="h-36 w-48 rounded-lg" style={{ backgroundColor: 'var(--bg-raised)' }} />
                  <div className="flex-1 space-y-3 py-2">
                    <div className="h-5 w-48 rounded" style={{ backgroundColor: 'var(--bg-raised)' }} />
                    <div className="h-3 w-32 rounded" style={{ backgroundColor: 'var(--bg-raised)' }} />
                    <div className="flex gap-2">{[1, 2, 3].map(j => <div key={j} className="h-5 w-14 rounded-full" style={{ backgroundColor: 'var(--bg-raised)' }} />)}</div>
                    <div className="h-6 w-24 rounded" style={{ backgroundColor: 'var(--bg-raised)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-xl border py-20 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No hotels found</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or search a different city.</p>
            <button onClick={() => go({ name: 'hotels' })} className="mt-4 rounded-lg bg-crimson-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-crimson-700">Back to Search</button>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {filtered.map(h => (
              <button key={h.id} onClick={() => go({ name: 'hotelDetails', hotelId: h.id })}
                className="group flex w-full flex-col overflow-hidden rounded-xl border text-left transition hover:border-crimson-500/30 hover:shadow-lg sm:flex-row"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-auto sm:w-56">
                  <img src={h.photos[0]} alt={h.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  {h.sla_verified && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Shield className="h-3 w-3" />SLA
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>{h.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <MapPin className="h-3 w-3" />{h.city} &middot; {h.address}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-lg bg-sky-500/10 px-2 py-1">
                        <span className="text-sm font-bold text-sky-400">{h.avg_rating}</span>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({h.review_count})</span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < h.stars ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />
                      ))}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {h.amenities.slice(0, 5).map(a => (
                        <span key={a} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>{a}</span>
                      ))}
                      {h.amenities.length > 5 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{h.amenities.length - 5}</span>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-end justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <span className="text-lg font-bold text-crimson-500">{formatINR(h.base_price)}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}> /night</span>
                    </div>
                    <span className="rounded-lg bg-crimson-600/10 px-3 py-1.5 text-xs font-semibold text-crimson-500 transition group-hover:bg-crimson-600 group-hover:text-white">View Rooms</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
