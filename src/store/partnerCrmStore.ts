import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { authToken, authUserId } from '../lib/auth';
import { usePartnerHotelStore, type HotelGuest } from './partnerHotelStore';

export type PartnerCustomer = HotelGuest;

interface PartnerCrmState {
  partnerId: string;
  customers: PartnerCustomer[];
  loading: boolean;
  lastError: string | null;
  load: (partnerId?: string) => Promise<void>;
  save: (c: Partial<PartnerCustomer> & { name: string }) => Promise<string>;
  remove: (id: string) => Promise<void>;
}

function staffHeaders(): Record<string, string> {
  const t = authToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}`, 'X-Authorization': `Bearer ${t}` } : {}),
  };
}

async function crmRequest(path: string, init: RequestInit = {}): Promise<any> {
  const headers = new Headers(init.headers);
  Object.entries(staffHeaders()).forEach(([k, v]) => { if (!headers.has(k)) headers.set(k, v); });
  const res = await apiFetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const err = typeof data.error === 'string' ? data.error : '';
    if (res.status === 401 || res.status === 403) throw new Error(err || 'Sign in as a partner to use CRM.');
    throw new Error(err || `CRM request failed (${res.status || 'network'}).`);
  }
  return data;
}

function mapCustomer(g: any): PartnerCustomer {
  return {
    id: String(g.id || ''),
    name: g.name || '',
    phone: g.phone || '',
    email: g.email || '',
    notes: g.notes || '',
    city: g.city || '',
    tags: Array.isArray(g.tags) ? g.tags : [],
    last_stay: g.last_stay || '',
    last_trip: g.last_trip || '',
    stays: Array.isArray(g.stays) ? g.stays : [],
    trips: Array.isArray(g.trips) ? g.trips : [],
  };
}

export const usePartnerCrmStore = create<PartnerCrmState>((set, get) => ({
  partnerId: '',
  customers: [],
  loading: false,
  lastError: null,

  load: async (partnerId) => {
    const pid = partnerId || get().partnerId || authUserId();
    if (!pid) {
      set({ customers: [], partnerId: '', loading: false, lastError: authToken() ? 'Partner id missing.' : 'Sign in as a partner to load customers.' });
      return;
    }
    set({ loading: true, partnerId: pid, lastError: null });
    try {
      const data = await crmRequest('/api/crm.php');
      const rows = Array.isArray(data.customers) ? data.customers : [];
      set({ customers: rows.map(mapCustomer), loading: false, lastError: null });
    } catch (e) {
      set({ loading: false, lastError: e instanceof Error ? e.message : 'Could not load customers.' });
    }
  },

  save: async (c) => {
    const pid = get().partnerId || authUserId();
    if (!pid || !authToken()) {
      const msg = 'Sign in as a partner to save customers.';
      set({ lastError: msg });
      throw new Error(msg);
    }
    const data = await crmRequest('/api/crm.php', {
      method: 'POST',
      body: JSON.stringify({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        tags: c.tags,
        notes: c.notes,
      }),
    });
    await get().load(pid);
    const hotelPid = usePartnerHotelStore.getState().partnerId || pid;
    void usePartnerHotelStore.getState().load(hotelPid);
    return String(data.id || data.customer?.id || '');
  },

  remove: async (id) => {
    const pid = get().partnerId || authUserId();
    await crmRequest(`/api/crm.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await get().load(pid);
    void usePartnerHotelStore.getState().load(pid);
  },
}));
