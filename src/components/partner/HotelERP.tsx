import { useEffect, useMemo, useState } from 'react';
import {
  Hotel as HotelIcon, Plus, Star, MapPin, Shield, Trash2, Edit3, X, DollarSign, Percent,
  ConciergeBell, ClipboardList, Link2,
  Users, Receipt, BarChart3, CheckSquare,
} from 'lucide-react';
import {
  usePartnerHotelStore, fmtINR, avgOccupancy,
  type HotelAsset, type HotelBookingRecord, type HotelGuest, type HotelRatePlan,
} from '../../store/partnerHotelStore';
import { useAuth } from '../../lib/auth';
import { ErpLoader } from '../operator/ErpLoader';
import { PhotoField, GalleryField } from './MediaUpload';
import HotelDashboard from './HotelDashboard';
import HotelTapeChart, { type WalkInSeed } from './HotelTapeChart';
import { addDaysIso, todayIso } from '../../lib/pmsMetrics';

const ALL_AMENITIES = ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Parking', 'Gym', 'Bar', 'Room Service', 'Laundry', 'AC', 'Airport Shuttle', 'Business Center'];
const inputCls = 'w-full rounded-lg border bg-[var(--bg-raised)] px-3 py-2 text-sm outline-none focus:border-crimson-500';

export type HotelPmsView = 'dashboard' | 'calendar' | 'desk' | 'rooms' | 'inventory' | 'reservations' | 'guests' | 'rates' | 'folio' | 'reports';

const TITLES: Record<HotelPmsView, { kicker: string; title: string; sub: string }> = {
  dashboard: { kicker: 'Property', title: 'Dashboard', sub: 'Today’s arrivals, departures, stay overs, occupancy, and revenue — live from MySQL.' },
  calendar: { kicker: 'Front office', title: 'Availability', sub: 'Room × date tape. Click a vacant cell to create a stay; click a bar for folio and guest.' },
  desk: { kicker: 'Front office', title: 'Front desk', sub: 'Arrivals, in-house guests, departures, and open tasks — live from MySQL.' },
  rooms: { kicker: 'Housekeeping', title: 'Rooms / Housekeeping', sub: 'Room rack and HK status. Clean, dirty, and out-of-order update the live board.' },
  inventory: { kicker: 'Properties', title: 'Inventory', sub: 'Hotels assigned to this partner. Add a property to generate a room rack.' },
  reservations: { kicker: 'Bookings', title: 'Reservations', sub: 'Booking list posted to hotel_bookings. The room plan lives under Availability.' },
  guests: { kicker: 'CRM', title: 'Guests', sub: 'Your memberships only. Same traveller at another hotel is a separate record you cannot see.' },
  rates: { kicker: 'Pricing', title: 'Rate plans', sub: 'Simple BAR / meal-plan rates per room type. Used as walk-in defaults.' },
  folio: { kicker: 'Accounts', title: 'Folio / charges', sub: 'Room charge plus extras (F&B, laundry, tax) against a reservation.' },
  reports: { kicker: 'Analytics', title: 'Reports', sub: 'Occupancy, ADR, and RevPAR computed from posted stays.' },
};

export default function HotelERP({ view = 'desk' }: { view?: HotelPmsView }) {
  const { user } = useAuth();
  const store = usePartnerHotelStore();
  const {
    hotels, bookings, rooms, arrivals, inhouse, departures, occupancyPct, loading,
    lastFeedbackLink, guests, ratePlans, folioCharges, notes, lastError,
    addHotel, updateHotel, removeHotel, toggleSla, updateBookingStatus, addBooking, setRoomHk, setRoomPhoto,
    saveGuest, saveRatePlan, removeRatePlan, addFolioCharge, saveNote,
  } = store;
  const [editing, setEditing] = useState<HotelAsset | null>(null);
  const [adding, setAdding] = useState(false);
  const [addingBooking, setAddingBooking] = useState(false);
  const [assignFor, setAssignFor] = useState<HotelBookingRecord | null>(null);
  const [roomPick, setRoomPick] = useState('');
  const [guestOpen, setGuestOpen] = useState<HotelGuest | null>(null);
  const [walkInSeed, setWalkInSeed] = useState<WalkInSeed | null>(null);
  const [stayOpen, setStayOpen] = useState<HotelBookingRecord | null>(null);

  const partnerId = user?.user_id ?? '';

  useEffect(() => {
    if (!partnerId) return;
    const s = usePartnerHotelStore.getState();
    if (s.hydrated && s.partnerId === partnerId) return;
    void s.load(partnerId);
  }, [partnerId]);

  const occ = occupancyPct || avgOccupancy(Array.isArray(hotels) ? hotels : []);
  const liveRev = (Array.isArray(bookings) ? bookings : []).filter((b) => b.status !== 'cancelled').reduce((s, b) => s + Number(b.amount || 0), 0);
  const vacant = useMemo(
    () => (Array.isArray(rooms) ? rooms : []).filter((r) => r.status === 'vacant' && r.hk_status !== 'dirty'),
    [rooms],
  );
  const meta = TITLES[view] || TITLES.desk;

  if (loading && !hotels.length && !bookings.length && !rooms.length) {
    return <ErpLoader label="Loading hotel PMS…" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{meta.kicker}</p>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{meta.title}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{meta.sub}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(view === 'desk' || view === 'reservations' || view === 'dashboard' || view === 'calendar') && (
            <button className="btn-ghost text-sm" onClick={() => { setWalkInSeed(null); setAddingBooking(true); }}><ClipboardList className="h-4 w-4" /> Walk-in</button>
          )}
          {(view === 'inventory' || view === 'desk') && (
            <button className="btn-primary text-sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add property</button>
          )}
        </div>
      </div>

      {lastError && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700">{lastError}</div>
      )}

      {lastFeedbackLink && view === 'desk' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Guest rating link generated after check-out.</span>
          <button type="button" className="font-semibold underline" onClick={() => navigator.clipboard.writeText(lastFeedbackLink)}>Copy link</button>
        </div>
      )}

      {view === 'dashboard' && (
        <HotelDashboard
          hotels={hotels} rooms={rooms} bookings={bookings}
          arrivals={arrivals} inhouse={inhouse} departures={departures}
          occupancyPct={occ} guests={guests}
          onWalkIn={() => { setWalkInSeed(null); setAddingBooking(true); }}
          onOpenStay={setStayOpen}
        />
      )}

      {view === 'calendar' && (
        <HotelTapeChart
          rooms={rooms} hotels={hotels} bookings={bookings}
          onEmpty={(seed) => { setWalkInSeed(seed); setAddingBooking(true); }}
          onBooking={setStayOpen}
        />
      )}

      {view === 'desk' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Properties" value={String(hotels.length)} sub={`${hotels.filter((h) => h.status === 'active').length} live`} icon={HotelIcon} tone="crimson" />
            <Kpi label="Stay revenue" value={`₹${fmtINR(liveRev)}`} sub="From posted bookings" icon={DollarSign} tone="green" />
            <Kpi label="Occupancy" value={`${occ}%`} sub={`${rooms.filter((r) => r.status === 'occupied').length}/${rooms.length || 0} rooms`} icon={Percent} tone="blue" />
            <Kpi label="In-house" value={String(inhouse.length)} sub={`${arrivals.length} arriving today`} icon={ConciergeBell} tone="amber" />
          </div>
          {hotels.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {hotels.map((h) => (
                <button key={h.id} type="button" onClick={() => setEditing(h)} className="w-40 shrink-0 overflow-hidden rounded-xl border text-left" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                  <div className="h-20 bg-[var(--bg-raised)]">
                    {h.photo ? <img src={h.photo} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs" style={{ color: 'var(--text-muted)' }}>No photo</div>}
                  </div>
                  <p className="truncate px-2 py-1.5 text-xs font-semibold">{h.name}</p>
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-3">
            <DeskCol title="Arrivals today" items={arrivals} empty="No arrivals in the database for today." action={(b) => setAssignFor(b)} actionLabel="Check in" hide={['checked-in', 'checked-out', 'cancelled']} />
            <DeskCol title="In-house" items={inhouse} empty="No guests in-house." action={(b) => void updateBookingStatus(b.id, 'checked-out')} actionLabel="Check out" />
            <DeskCol title="Departures" items={departures} empty="No departures due." action={(b) => void updateBookingStatus(b.id, 'checked-out')} actionLabel="Check out" />
          </div>
          <TaskBoard notes={notes} onSave={(n) => void saveNote(n)} />
        </>
      )}

      {view === 'rooms' && <RoomsBoard rooms={rooms} hotels={hotels} onHk={(id, status, hk) => void setRoomHk(id, status, hk)} onPhoto={(id, url) => void setRoomPhoto(id, url)} />}
      {view === 'inventory' && (
        <InventoryBoard hotels={hotels} onEdit={setEditing} onSla={(id) => void toggleSla(id)} onRemove={(id) => void removeHotel(id)} />
      )}
      {view === 'reservations' && (
        <ReservationsBoard
          bookings={bookings}
          onWalkIn={() => { setWalkInSeed(null); setAddingBooking(true); }}
          onCheckIn={(b) => setAssignFor(b)}
          onCheckOut={(id) => void updateBookingStatus(id, 'checked-out')}
          onOpen={setStayOpen}
        />
      )}
      {view === 'guests' && (
        <GuestsBoard guests={guests} onOpen={setGuestOpen} onCreate={(g) => void saveGuest(g)} />
      )}
      {view === 'rates' && (
        <RatesBoard hotels={hotels} plans={ratePlans} onSave={(r) => void saveRatePlan(r)} onRemove={(id) => void removeRatePlan(id)} />
      )}
      {view === 'folio' && (
        <FolioBoard bookings={bookings} charges={folioCharges} onAdd={(c) => void addFolioCharge(c)} />
      )}
      {view === 'reports' && <ReportsBoard hotels={hotels} rooms={rooms} bookings={bookings} occ={occ} />}

      {assignFor && (
        <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setAssignFor(null)}>
          <div className="erp-modal-enter erp-modal-card w-full max-w-md rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Assign room · {assignFor.guestName}</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{assignFor.pnr} · {assignFor.roomType}</p>
            <select className={inputCls + ' mt-4'} value={roomPick} onChange={(e) => setRoomPick(e.target.value)}>
              <option value="">Vacant / clean rooms</option>
              {vacant.filter((r) => !assignFor.hotel_id || r.hotel_id === assignFor.hotel_id).map((r) => (
                <option key={r.id} value={r.id}>{r.room_number} · {r.room_type} · ₹{fmtINR(r.rate)}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost text-sm" onClick={() => setAssignFor(null)}>Cancel</button>
              <button className="btn-primary text-sm" disabled={!roomPick} onClick={() => { void updateBookingStatus(assignFor.id, 'checked-in', roomPick); setAssignFor(null); setRoomPick(''); }}>Confirm check-in</button>
            </div>
          </div>
        </div>
      )}

      {(adding || editing) && (
        <HotelForm
          hotel={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) await updateHotel(editing.id, data);
            else await addHotel(data as Omit<HotelAsset, 'id'>);
            setAdding(false); setEditing(null);
          }}
        />
      )}
      {addingBooking && (
        <NewBookingModal
          hotels={hotels} guests={guests} ratePlans={ratePlans} rooms={rooms} seed={walkInSeed}
          onClose={() => { setAddingBooking(false); setWalkInSeed(null); }}
          onSave={async (b) => { await addBooking(b); setAddingBooking(false); setWalkInSeed(null); }}
        />
      )}
      {guestOpen && (
        <GuestDrawer guest={guestOpen} notes={notes} onClose={() => setGuestOpen(null)} onNote={(n) => void saveNote(n)} />
      )}
      {stayOpen && (
        <StayDrawer
          booking={stayOpen}
          charges={folioCharges}
          guests={guests}
          vacant={vacant}
          onClose={() => setStayOpen(null)}
          onGuest={(g) => { setStayOpen(null); setGuestOpen(g); }}
          onCheckIn={(b) => { setStayOpen(null); setAssignFor(b); }}
          onCheckOut={(id) => { void updateBookingStatus(id, 'checked-out'); setStayOpen(null); }}
          onCharge={(c) => void addFolioCharge(c)}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; tone: 'crimson' | 'green' | 'blue' | 'amber' }) {
  const tones: Record<string, string> = { crimson: 'text-crimson-600 bg-crimson-500/10', green: 'text-emerald-600 bg-emerald-500/10', blue: 'text-blue-600 bg-blue-500/10', amber: 'text-amber-600 bg-amber-500/10' };
  return (
    <div className="rounded-2xl border bg-[var(--bg-surface)] p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="mt-1 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function DeskCol({ title, items, empty, action, actionLabel, hide }: {
  title: string; items: HotelBookingRecord[]; empty: string;
  action: (b: HotelBookingRecord) => void; actionLabel: string; hide?: string[];
}) {
  const rows = hide ? items.filter((b) => !hide.includes(b.status)) : items;
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <h3 className="mb-3 font-display font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {rows.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{empty}</p> : (
        <ul className="space-y-2">
          {rows.map((b) => (
            <li key={b.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold">{b.guestName}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{b.pnr} · {b.hotelName} · {b.roomNumber || b.roomType}</p>
              <button className="mt-2 rounded-md bg-navy-800 px-2 py-1 text-[10px] font-bold text-white" onClick={() => action(b)}>{actionLabel}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskBoard({ notes, onSave }: { notes: { id: string; title: string; body: string; due_date: string; status: string; kind: string }[]; onSave: (n: { id?: string; title: string; body?: string; due_date?: string; status?: string; kind?: string }) => void }) {
  const [title, setTitle] = useState('');
  const open = notes.filter((n) => n.status !== 'done');
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display font-bold"><CheckSquare className="h-4 w-4 text-crimson-600" /> Notes / tasks</h3>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{open.length} open</span>
      </div>
      <div className="mb-3 flex gap-2">
        <input className={inputCls} placeholder="Add a front-desk task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn-primary shrink-0 text-sm" onClick={() => { if (!title.trim()) return; onSave({ title: title.trim(), kind: 'task', status: 'open' }); setTitle(''); }}>Add</button>
      </div>
      <ul className="space-y-2">
        {open.slice(0, 8).map((n) => (
          <li key={n.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <span>{n.title}<span className="ml-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{n.due_date}</span></span>
            <button className="text-[11px] font-semibold text-emerald-700" onClick={() => onSave({ ...n, status: 'done' })}>Done</button>
          </li>
        ))}
        {!open.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No open tasks.</p>}
      </ul>
    </div>
  );
}

function RoomsBoard({ rooms, hotels, onHk, onPhoto }: {
  rooms: { id: string; hotel_id?: string; room_number: string; floor: string; room_type: string; rate: number; status: string; hk_status: string; guest_name: string | null; photo_url?: string }[];
  hotels: HotelAsset[];
  onHk: (id: string, status: string, hk: string) => void;
  onPhoto: (id: string, url: string) => void;
}) {
  const [hotelId, setHotelId] = useState('all');
  const list = Array.isArray(rooms) ? rooms : [];
  const properties = Array.isArray(hotels) ? hotels : [];
  const filtered = hotelId === 'all' ? list : list.filter((r) => r.hotel_id === hotelId);
  const hotelBy = new Map(properties.map((h) => [h.id, h]));
  if (!list.length) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add a property to generate a room rack. Housekeeping statuses update live.</p>;
  }
  return (
    <div className="space-y-3">
      {properties.length > 1 && (
        <label className="flex max-w-xs items-center gap-2 text-sm">
          <span style={{ color: 'var(--text-muted)' }}>Property</span>
          <select className={inputCls} value={hotelId} onChange={(e) => setHotelId(e.target.value)}>
            <option value="all">All properties</option>
            {properties.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((r) => {
          const inherit = hotelBy.get(r.hotel_id || '')?.photo || '';
          const photo = r.photo_url || inherit;
          return (
            <div key={r.id} className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
              <div className="h-28 bg-[var(--bg-raised)]">
                {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No photo</div>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{r.room_number}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fl {r.floor} · {r.room_type}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === 'occupied' ? 'bg-emerald-500/15 text-emerald-700' : r.status === 'dirty' || r.hk_status === 'dirty' ? 'bg-amber-500/15 text-amber-700' : 'bg-sky-500/15 text-sky-700'}`}>{r.status}</span>
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.guest_name || 'Vacant'} · ₹{fmtINR(r.rate)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>HK · {r.hk_status || 'clean'}</p>
                <div className="mt-3">
                  <PhotoField label="Room photo" url={r.photo_url || ''} onChange={(url) => onPhoto(r.id, url)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <button className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold" onClick={() => onHk(r.id, 'vacant', 'clean')}>Clean</button>
                  <button className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold" onClick={() => onHk(r.id, 'dirty', 'dirty')}>Dirty</button>
                  <button className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white" onClick={() => onHk(r.id, 'ooo', 'clean')}>OOO</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!filtered.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No rooms for this property.</p>}
    </div>
  );
}

function InventoryBoard({ hotels, onEdit, onSla, onRemove }: { hotels: HotelAsset[]; onEdit: (h: HotelAsset) => void; onSla: (id: string) => void; onRemove: (id: string) => void }) {
  if (!hotels.length) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hotels for this partner yet. Click Add property — it saves to the hotels table with your partner id.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {hotels.map((h) => (
        <div key={h.id} className="overflow-hidden rounded-2xl border bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border)' }}>
          <div className="relative h-40 bg-[var(--bg-raised)]">
            {h.photo ? <img src={h.photo} alt={h.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm" style={{ color: 'var(--text-muted)' }}>No photo yet</div>}
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
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[var(--bg-raised)] p-2">
                <p style={{ color: 'var(--text-muted)' }}>Occupancy</p>
                <p className="font-bold">{h.occupancyPct}%</p>
              </div>
              <div className="rounded-lg bg-[var(--bg-raised)] p-2">
                <p style={{ color: 'var(--text-muted)' }}>Stay revenue</p>
                <p className="font-bold text-emerald-600">₹{fmtINR(h.monthlyRevenue)}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="text-xs font-medium text-crimson-600" onClick={() => onEdit(h)}><Edit3 className="h-3.5 w-3.5" /></button>
              <button className="text-xs font-medium text-amber-600" onClick={() => onSla(h.id)}><Shield className="h-3.5 w-3.5" /></button>
              <button className="text-xs font-medium text-red-500" onClick={() => onRemove(h.id)}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReservationsBoard({ bookings, onWalkIn, onCheckIn, onCheckOut, onOpen }: {
  bookings: HotelBookingRecord[];
  onWalkIn: () => void; onCheckIn: (b: HotelBookingRecord) => void; onCheckOut: (id: string) => void;
  onOpen: (b: HotelBookingRecord) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn-primary text-sm" onClick={onWalkIn}><Plus className="h-4 w-4" /> New booking</button>
      </div>
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
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
              {bookings.map((b) => (
                <tr key={b.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">
                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => onOpen(b)}>{b.pnr}</button>
                  </td>
                  <td className="px-4 py-3">{b.hotelName}</td>
                  <td className="px-4 py-3">{b.guestName}</td>
                  <td className="px-4 py-3">{b.roomNumber || b.roomType}</td>
                  <td className="px-4 py-3 text-xs">{b.checkIn}</td>
                  <td className="px-4 py-3">{b.nights}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">₹{fmtINR(b.amount)}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{b.status}</span></td>
                  <td className="px-4 py-3">
                    {b.status === 'confirmed' && <button onClick={() => onCheckIn(b)} className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-700">Check in</button>}
                    {b.status === 'checked-in' && <button onClick={() => onCheckOut(b.id)} className="rounded-md bg-slate-200 px-2 py-1 text-[10px] font-semibold">Check out</button>}
                  </td>
                </tr>
              ))}
              {!bookings.length && <tr><td colSpan={9} className="px-4 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No reservations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GuestsBoard({ guests, onOpen, onCreate }: { guests: HotelGuest[]; onOpen: (g: HotelGuest) => void; onCreate: (g: { name: string; phone?: string; email?: string }) => void }) {
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const rows = guests.filter((g) => {
    const s = q.toLowerCase();
    return !s || g.name.toLowerCase().includes(s) || g.phone.includes(s) || g.email.toLowerCase().includes(s);
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <input className={inputCls} placeholder="Guest name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={inputCls} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <button className="btn-primary text-sm" disabled={!form.name.trim()} onClick={() => { onCreate(form); setForm({ name: '', phone: '', email: '' }); }}><Users className="h-4 w-4" /> Save profile</button>
      </div>
      <input className={inputCls + ' max-w-sm'} placeholder="Search guests…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Stays</th>
              <th className="px-4 py-3">Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => {
              const value = g.stays.filter((s) => s.status !== 'cancelled').reduce((s, b) => s + Number(b.amount || 0), 0);
              return (
                <tr key={g.id} className="cursor-pointer border-b hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }} onClick={() => onOpen(g)}>
                  <td className="px-4 py-3 font-semibold">{g.name}</td>
                  <td className="px-4 py-3">{g.phone || '—'}</td>
                  <td className="px-4 py-3">{g.email || '—'}</td>
                  <td className="px-4 py-3">{g.stays.length}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">₹{fmtINR(value)}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={5} className="px-4 py-8" style={{ color: 'var(--text-muted)' }}>No guest profiles yet. Walk-ins create them automatically.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GuestDrawer({ guest, notes, onClose, onNote }: { guest: HotelGuest; notes: { id: string; title: string; body: string; guest_key: string }[]; onClose: () => void; onNote: (n: { title: string; body?: string; guest_key?: string; kind?: string }) => void }) {
  const [body, setBody] = useState('');
  const related = notes.filter((n) => {
    if (guest.email && n.guest_key.includes(guest.email)) return true;
    const ph = guest.phone.replace(/\D/g, '');
    return Boolean(ph && n.guest_key.includes(ph));
  });
  return (
    <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <aside className="erp-modal-enter erp-modal-card h-full w-full max-w-md overflow-y-auto border-l bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{guest.name}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{guest.phone || 'No phone'} · {guest.email || 'No email'}</p>
        <h4 className="mt-5 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Stay history</h4>
        <ul className="mt-2 space-y-2">
          {guest.stays.map((s) => (
            <li key={s.id} className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border)' }}>
              <p className="font-semibold">{s.hotelName} · {s.pnr}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.checkIn} · {s.nights}n · ₹{fmtINR(s.amount)} · {s.status}</p>
            </li>
          ))}
          {!guest.stays.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No stays posted yet.</p>}
        </ul>
        <h4 className="mt-5 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Notes</h4>
        <textarea className={inputCls + ' mt-2 min-h-[80px]'} value={body} onChange={(e) => setBody(e.target.value)} placeholder="CRM note…" />
        <button className="btn-primary mt-2 text-sm" onClick={() => { if (!body.trim()) return; onNote({ title: `Note · ${guest.name}`, body, guest_key: guest.email || guest.phone, kind: 'note' }); setBody(''); }}>Save note</button>
        <ul className="mt-3 space-y-2 text-sm">
          {related.map((n) => <li key={n.id} className="rounded-lg bg-[var(--bg-raised)] p-2">{n.title}<p className="text-xs" style={{ color: 'var(--text-muted)' }}>{n.body}</p></li>)}
        </ul>
      </aside>
    </div>
  );
}

function RatesBoard({ hotels, plans, onSave, onRemove }: { hotels: HotelAsset[]; plans: HotelRatePlan[]; onSave: (r: Partial<HotelRatePlan> & { name: string }) => void; onRemove: (id: string) => void }) {
  const [f, setF] = useState({ hotel_id: hotels[0]?.id ?? '', name: 'BAR', room_type: 'Standard', amount: 2500, meal_plan: 'Room only', refundable: true });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <select className={inputCls} value={f.hotel_id} onChange={(e) => setF({ ...f, hotel_id: e.target.value })}>{hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
        <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Plan name" />
        <input className={inputCls} value={f.room_type} onChange={(e) => setF({ ...f, room_type: e.target.value })} placeholder="Room type" />
        <input className={inputCls} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
        <select className={inputCls} value={f.meal_plan} onChange={(e) => setF({ ...f, meal_plan: e.target.value })}>
          <option>Room only</option><option>Breakfast</option><option>MAP</option><option>AP</option>
        </select>
        <button className="btn-primary text-sm" disabled={!f.name || !hotels.length} onClick={() => onSave(f)}>Save plan</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className="flex items-start justify-between rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hotels.find((h) => h.id === p.hotel_id)?.name || 'Hotel'} · {p.room_type} · {p.meal_plan} · {p.refundable ? 'Refundable' : 'Non-refundable'}</p>
              <p className="mt-1 font-display text-xl font-bold text-crimson-600">₹{fmtINR(p.amount)}</p>
            </div>
            <button className="text-red-500" onClick={() => onRemove(p.id)}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {!plans.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No rate plans yet. Add BAR or breakfast rates above.</p>}
      </div>
    </div>
  );
}

function FolioBoard({ bookings, charges, onAdd }: { bookings: HotelBookingRecord[]; charges: { id: string; booking_id: string; pnr: string; description: string; amount: number; charge_type: string }[]; onAdd: (c: { booking_id: string; pnr?: string; description: string; amount: number; charge_type?: string }) => void }) {
  const [bid, setBid] = useState(bookings[0]?.id ?? '');
  const [desc, setDesc] = useState('Extra bed');
  const [amount, setAmount] = useState(500);
  const [kind, setKind] = useState('other');
  const booking = bookings.find((b) => b.id === bid);
  const lines = charges.filter((c) => !bid || c.booking_id === bid);
  const total = lines.reduce((s, c) => s + Number(c.amount || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <select className={inputCls + ' md:col-span-2'} value={bid} onChange={(e) => setBid(e.target.value)}>
          {bookings.map((b) => <option key={b.id} value={b.id}>{b.pnr} · {b.guestName}</option>)}
        </select>
        <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Charge" />
        <input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} />
        <button className="btn-primary text-sm" disabled={!bid} onClick={() => onAdd({ booking_id: bid, pnr: booking?.pnr, description: desc, amount, charge_type: kind })}><Receipt className="h-4 w-4" /> Post</button>
        <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="room">Room</option><option value="fb">F&B</option><option value="laundry">Laundry</option><option value="tax">Tax</option><option value="other">Other</option>
        </select>
      </div>
      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Folio {booking ? `· ${booking.guestName}` : ''}</p>
          <p className="font-display text-xl font-bold">₹{fmtINR(total)}</p>
        </div>
        <ul className="space-y-2 text-sm">
          {lines.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
              <span>{c.description} <span className="text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>{c.charge_type}</span></span>
              <span className="font-semibold">₹{fmtINR(c.amount)}</span>
            </li>
          ))}
          {!lines.length && <p style={{ color: 'var(--text-muted)' }}>No charges posted. Room charge is added on walk-in.</p>}
        </ul>
      </div>
    </div>
  );
}

function ReportsBoard({ hotels, rooms, bookings, occ }: { hotels: HotelAsset[]; rooms: { id: string }[]; bookings: HotelBookingRecord[]; occ: number }) {
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const roomNights = live.reduce((s, b) => s + Number(b.nights || 1), 0);
  const revenue = live.reduce((s, b) => s + Number(b.amount || 0), 0);
  const adr = roomNights ? Math.round(revenue / roomNights) : 0;
  const revpar = rooms.length ? Math.round(revenue / Math.max(1, rooms.length)) : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Occupancy" value={`${occ}%`} icon={Percent} tone="blue" />
        <Kpi label="ADR" value={`₹${fmtINR(adr)}`} sub="Revenue / room-nights" icon={DollarSign} tone="green" />
        <Kpi label="RevPAR" value={`₹${fmtINR(revpar)}`} sub="Revenue / rooms" icon={BarChart3} tone="amber" />
        <Kpi label="Posted revenue" value={`₹${fmtINR(revenue)}`} icon={Receipt} tone="crimson" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {hotels.map((h) => (
          <div key={h.id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <p className="font-semibold">{h.name}</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{h.occupancyPct}% occupied · ₹{fmtINR(h.monthlyRevenue)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-crimson-600" style={{ width: `${Math.min(100, h.occupancyPct)}%` }} />
            </div>
          </div>
        ))}
        {!hotels.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Reports fill after the first live booking.</p>}
      </div>
    </div>
  );
}

function HotelForm({ hotel, onClose, onSave }: { hotel: HotelAsset | null; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [f, setF] = useState({
    name: hotel?.name ?? '', city: hotel?.city ?? '', address: hotel?.address ?? '', stars: hotel?.stars ?? 3,
    amenities: hotel?.amenities ?? ['WiFi', 'AC'], slaVerified: hotel?.slaVerified ?? true,
    status: hotel?.status ?? 'active', occupancyPct: hotel?.occupancyPct ?? 0, monthlyRevenue: hotel?.monthlyRevenue ?? 0,
    contactPhone: hotel?.contactPhone ?? '', photo: hotel?.photo ?? '', gallery: hotel?.gallery ?? [],
    rooms: hotel?.rooms ?? [{ id: 'r1', type: 'Standard', capacity: 2, rate: 2000, available: true }],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  function toggleAmenity(a: string) {
    setF((s) => ({ ...s, amenities: s.amenities.includes(a) ? s.amenities.filter((x) => x !== a) : [...s.amenities, a] }));
  }
  async function submit() {
    if (!f.name.trim()) { setError('Hotel name required.'); return; }
    setSaving(true); setError(null);
    try {
      await onSave(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save hotel.');
      setSaving(false);
    }
  }
  return (
    <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="erp-modal-enter erp-modal-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{hotel ? 'Edit hotel' : 'Add hotel'}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-3">
          <L label="Hotel name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="City"><input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></L>
            <L label="Stars"><select className={inputCls} value={f.stars} onChange={(e) => setF({ ...f, stars: +e.target.value })}>{[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s} Star</option>)}</select></L>
          </div>
          <L label="Address"><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></L>
          <L label="Contact phone"><input className={inputCls} value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })} /></L>
          <PhotoField label="Property photo" url={f.photo} onChange={(photo) => setF({ ...f, photo })} />
          <GalleryField urls={f.gallery} onChange={(gallery) => setF({ ...f, gallery })} />
          <div className="flex flex-wrap gap-1.5">
            {ALL_AMENITIES.map((a) => (
              <button key={a} type="button" onClick={() => toggleAmenity(a)} className={`rounded-full px-2.5 py-1 text-xs ${f.amenities.includes(a) ? 'bg-sky-500/20 text-sky-700' : 'bg-[var(--bg-raised)]'}`}>{a}</button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
            <button className="btn-primary text-sm" disabled={saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Save to database'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>{children}</label>;
}

function NewBookingModal({ hotels, guests, ratePlans, rooms, seed, onClose, onSave }: {
  hotels: HotelAsset[];
  guests: HotelGuest[];
  ratePlans: HotelRatePlan[];
  rooms: { id: string; hotel_id: string; room_number: string; room_type: string; rate: number; status: string }[];
  seed?: WalkInSeed | null;
  onClose: () => void;
  onSave: (b: Omit<HotelBookingRecord, 'id'> & { hotelId?: string; guestEmail?: string; guestPhone?: string; customerId?: string; roomId?: string }) => void | Promise<void>;
}) {
  const hotelId0 = seed?.hotelId || hotels[0]?.id || '';
  const seedRoom = rooms.find((r) => r.id === seed?.roomId);
  const [f, setF] = useState({
    hotelId: hotelId0,
    customerId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    roomType: seed?.roomType || seedRoom?.room_type || hotels.find((h) => h.id === hotelId0)?.rooms[0]?.type || 'Standard',
    roomId: seed?.roomId || '',
    checkIn: seed?.checkIn || todayIso(),
    nights: 1,
    amount: Number(seedRoom?.rate || hotels.find((h) => h.id === hotelId0)?.rooms.find((r) => r.type === (seed?.roomType || seedRoom?.room_type))?.rate || hotels.find((h) => h.id === hotelId0)?.rooms[0]?.rate || 2000),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hotelRooms = rooms.filter((r) => r.hotel_id === f.hotelId && r.status !== 'ooo');
  const types = [...new Set(hotelRooms.map((r) => r.room_type).filter(Boolean))];
  function applyRate(hotelId: string, roomType: string, roomId?: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (room) return Number(room.rate || 0) || 2000;
    const plan = ratePlans.find((r) => r.hotel_id === hotelId && r.room_type === roomType);
    const hotel = hotels.find((h) => h.id === hotelId);
    return plan?.amount ?? hotel?.rooms.find((r) => r.type === roomType)?.rate ?? hotel?.rooms[0]?.rate ?? 2000;
  }
  function pickCustomer(id: string) {
    const g = guests.find((x) => x.id === id);
    setF((s) => ({
      ...s,
      customerId: id,
      guestName: g?.name || s.guestName,
      guestEmail: g?.email || s.guestEmail,
      guestPhone: g?.phone || s.guestPhone,
    }));
  }
  async function save() {
    if (!f.guestName.trim()) { setError('Guest name required.'); return; }
    const hotel = hotels.find((h) => h.id === f.hotelId);
    const room = rooms.find((r) => r.id === f.roomId);
    const checkOut = addDaysIso(f.checkIn, Math.max(1, f.nights));
    setSaving(true); setError(null);
    try {
      await onSave({
        pnr: '',
        hotelName: hotel?.name ?? '',
        hotelId: f.hotelId,
        guestName: f.guestName,
        guestEmail: f.guestEmail,
        guestPhone: f.guestPhone,
        customerId: f.customerId || undefined,
        roomType: room?.room_type || f.roomType,
        roomId: f.roomId || undefined,
        roomNumber: room?.room_number || seed?.roomNumber,
        checkIn: f.checkIn,
        checkOut,
        nights: Math.max(1, f.nights),
        amount: f.amount,
        status: 'confirmed',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save booking.');
      setSaving(false);
    }
  }
  return (
    <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="erp-modal-enter erp-modal-card w-full max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Walk-in / new stay</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-3">
          <L label="Hotel"><select className={inputCls} value={f.hotelId} onChange={(e) => { const hotelId = e.target.value; const h = hotels.find((x) => x.id === hotelId); const roomType = h?.rooms[0]?.type ?? 'Standard'; setF({ ...f, hotelId, roomType, roomId: '', amount: applyRate(hotelId, roomType) }); }}>{hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Room type">
              <select className={inputCls} value={f.roomType} onChange={(e) => setF({ ...f, roomType: e.target.value, roomId: '', amount: applyRate(f.hotelId, e.target.value) })}>
                {(types.length ? types : [f.roomType]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </L>
            <L label="Room">
              <select className={inputCls} value={f.roomId} onChange={(e) => { const roomId = e.target.value; const r = rooms.find((x) => x.id === roomId); setF({ ...f, roomId, roomType: r?.room_type || f.roomType, amount: applyRate(f.hotelId, r?.room_type || f.roomType, roomId) }); }}>
                <option value="">Assign later</option>
                {hotelRooms.filter((r) => !f.roomType || r.room_type === f.roomType).map((r) => (
                  <option key={r.id} value={r.id}>{r.room_number} · {r.room_type}</option>
                ))}
              </select>
            </L>
          </div>
          <L label="CRM customer">
            <select className={inputCls} value={f.customerId} onChange={(e) => pickCustomer(e.target.value)}>
              <option value="">New customer (create in CRM)</option>
              {guests.map((g) => <option key={g.id} value={g.id}>{g.name}{g.phone ? ` · ${g.phone}` : ''}</option>)}
            </select>
          </L>
          <L label="Guest name"><input className={inputCls} value={f.guestName} onChange={(e) => setF({ ...f, guestName: e.target.value, customerId: f.customerId })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Phone"><input className={inputCls} value={f.guestPhone} onChange={(e) => setF({ ...f, guestPhone: e.target.value })} /></L>
            <L label="Email"><input className={inputCls} value={f.guestEmail} onChange={(e) => setF({ ...f, guestEmail: e.target.value })} /></L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="Check-in"><input type="date" className={inputCls} value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></L>
            <L label="Nights"><input type="number" min={1} className={inputCls} value={f.nights} onChange={(e) => setF({ ...f, nights: +e.target.value })} /></L>
          </div>
          <L label="Amount"><input type="number" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></L>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
            <button className="btn-primary text-sm" onClick={() => void save()} disabled={!f.guestName || saving}>{saving ? 'Saving…' : 'Save booking'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StayDrawer({ booking, charges, guests, vacant, onClose, onGuest, onCheckIn, onCheckOut, onCharge }: {
  booking: HotelBookingRecord;
  charges: { id: string; booking_id: string; pnr: string; description: string; amount: number; charge_type: string }[];
  guests: HotelGuest[];
  vacant: { id: string; hotel_id?: string; room_number: string; room_type: string }[];
  onClose: () => void;
  onGuest: (g: HotelGuest) => void;
  onCheckIn: (b: HotelBookingRecord) => void;
  onCheckOut: (id: string) => void;
  onCharge: (c: { booking_id: string; pnr?: string; description: string; amount: number; charge_type?: string }) => void;
}) {
  const [desc, setDesc] = useState('Extra bed');
  const [amount, setAmount] = useState(500);
  const lines = charges.filter((c) => c.booking_id === booking.id);
  const total = lines.reduce((s, c) => s + Number(c.amount || 0), 0);
  const guest = guests.find((g) =>
    g.stays.some((s) => s.id === booking.id)
    || (booking.guest_email && g.email && g.email.toLowerCase() === booking.guest_email.toLowerCase())
    || (booking.guest_phone && g.phone && g.phone.replace(/\D/g, '') === booking.guest_phone.replace(/\D/g, '')),
  );
  return (
    <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <aside className="erp-modal-enter erp-modal-card h-full w-full max-w-md overflow-y-auto border-l bg-[var(--bg-surface)] p-5" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{booking.guestName}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{booking.pnr} · {booking.hotelName}</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{booking.checkIn} → {booking.checkOut} · {booking.nights}n · {booking.roomNumber || booking.roomType}</p>
        <p className="mt-2 font-display text-xl font-bold text-emerald-600">₹{fmtINR(booking.amount)}</p>
        <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">{booking.status}</span>
        <div className="mt-4 flex flex-wrap gap-2">
          {booking.status === 'confirmed' && <button className="btn-primary text-sm" onClick={() => onCheckIn(booking)}>Check in</button>}
          {booking.status === 'checked-in' && <button className="btn-ghost text-sm" onClick={() => onCheckOut(booking.id)}>Check out</button>}
          {guest && <button className="btn-ghost text-sm" onClick={() => onGuest(guest)}>Guest profile</button>}
        </div>
        {booking.status === 'confirmed' && !booking.roomNumber && vacant.length > 0 && (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Assign a vacant room at check-in ({vacant.length} ready).</p>
        )}
        <h4 className="mt-6 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Folio</h4>
        <p className="mb-2 font-display text-lg font-bold">₹{fmtINR(total)}</p>
        <ul className="space-y-2 text-sm">
          {lines.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
              <span>{c.description}</span>
              <span className="font-semibold">₹{fmtINR(c.amount)}</span>
            </li>
          ))}
          {!lines.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No extra charges yet.</p>}
        </ul>
        <div className="mt-3 grid grid-cols-[1fr_90px_auto] gap-2">
          <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} />
          <button className="btn-primary text-sm" onClick={() => onCharge({ booking_id: booking.id, pnr: booking.pnr, description: desc, amount, charge_type: 'other' })}>Post</button>
        </div>
      </aside>
    </div>
  );
}
