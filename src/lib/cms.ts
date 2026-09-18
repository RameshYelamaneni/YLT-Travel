import type { Director, AppSettings } from '../types';
import { apiUrl, apiFetch } from './api';

export async function fetchDirectors(): Promise<Director[]> {
  try {
    const res = await fetch(apiUrl('/api/directors'));
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((d: any) => ({
      id: d.id,
      name: d.full_name || d.name,
      role: d.title || d.role,
      bio: d.bio ?? '',
      image_url: d.image_url,
      linkedin_url: d.linkedin_url ?? null,
      order_index: Number(d.order_index ?? 0),
    }));
  } catch (e) {
    console.warn('fetchDirectors error:', e);
    return [];
  }
}

export async function saveDirector(d: Partial<Director> & { id: string }): Promise<{ error: string | null }> {
  try {
    const res = await apiFetch('/api/directors', {
      method: 'POST',
      body: JSON.stringify({
        id: d.id,
        full_name: d.name,
        title: d.role,
        bio: d.bio,
        image_url: d.image_url,
        linkedin_url: d.linkedin_url,
        order_index: d.order_index,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return { error: data.error ?? 'Save failed.' };
    return { error: null };
  } catch (e) {
    return { error: 'Network error.' };
  }
}

export async function deleteDirector(id: string): Promise<{ error: string | null }> {
  try {
    const res = await apiFetch(`/api/directors?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || data.error) return { error: data.error ?? 'Delete failed.' };
    return { error: null };
  } catch (e) {
    return { error: 'Network error.' };
  }
}

export async function fetchSettings(): Promise<AppSettings> {
  try {
    const res = await fetch(apiUrl('/api/settings'));
    const data = await res.json();
    if (!res.ok || data.error) {
      return { upi_id: 'ylt@upi', whatsapp_number: '919999999999', support_email: 'support@ylt.in', fare_tax_percent: 5 };
    }
    return {
      upi_id: data.upi_id ?? 'ylt@upi',
      whatsapp_number: '919999999999',
      support_email: data.smtp_from_email ?? 'support@ylt.in',
      fare_tax_percent: 5,
    } as AppSettings;
  } catch (e) {
    return { upi_id: 'ylt@upi', whatsapp_number: '919999999999', support_email: 'support@ylt.in', fare_tax_percent: 5 };
  }
}
