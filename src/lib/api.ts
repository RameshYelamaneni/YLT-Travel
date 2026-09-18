import { authToken } from './auth';

declare global {
  interface Window {
    __YLT_API_BASE__?: string;
  }
}

export function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
}

function trimSlash(s: string): string {
  return s.replace(/\/$/, '');
}

function deadApiHost(s: string): boolean {
  return /api\.ylttravels\.com/i.test(s);
}

function mergeQuery(pathname: string, fromPath: string, forced?: Record<string, string>): string {
  const src = new URL(fromPath, 'https://ylttravels.com');
  const out = new URL(pathname, 'https://ylttravels.com');
  src.searchParams.forEach((v, k) => out.searchParams.set(k, v));
  if (forced) {
    for (const [k, v] of Object.entries(forced)) out.searchParams.set(k, v);
  }
  const q = out.searchParams.toString();
  return q ? `${out.pathname}?${q}` : out.pathname;
}

/** Live Hostinger: Apache PHP under /api/*.php. Never requires Go. */
export function livePhpUrl(path: string): string {
  const raw = path.startsWith('/') ? path : `/${path}`;
  const u = new URL(raw, 'https://ylttravels.com');
  const p = (u.pathname.replace(/\/+$/, '') || '/');

  if (p === '/api/auth.php' || p.startsWith('/api/auth.php/')) {
    return mergeQuery('/api/auth.php', raw);
  }
  if (p.startsWith('/api/auth')) {
    const rest = p.replace(/^\/api\/auth\/?/, '');
    const forced: Record<string, string> = {};
    if (rest) forced.rest = rest;
    const idMatch = rest.match(/^(partners|employees)\/([^/]+)/);
    if (idMatch) forced.id = idMatch[2];
    return mergeQuery('/api/auth.php', raw, forced);
  }
  if (p.startsWith('/api/offers')) {
    return mergeQuery('/api/offers.php', raw);
  }
  if (p.startsWith('/api/bookings')) {
    return mergeQuery('/api/bookings.php', raw);
  }
  if (p.startsWith('/api/hotel-bookings')) {
    return mergeQuery('/api/bookings.php', raw, { resource: 'hotel-bookings' });
  }
  if (p.startsWith('/api/hotels')) {
    return mergeQuery('/api/bookings.php', raw, { resource: 'hotels' });
  }
  if (p.startsWith('/api/buses')) {
    return mergeQuery('/api/bookings.php', raw, { resource: 'buses' });
  }
  if (p.startsWith('/api/newsletter')) {
    return mergeQuery('/api/bookings.php', raw, { resource: 'newsletter' });
  }
  if (p.startsWith('/api/tickets') || p.startsWith('/api/mail')) {
    return mergeQuery('/api/mail.php', raw);
  }
  if (p.startsWith('/api/payments/create-order')) {
    return mergeQuery('/api/bookings.php', raw, { resource: 'create-order' });
  }
  if (p.startsWith('/api/payments/verify')) {
    return mergeQuery('/api/bookings.php', raw, { resource: 'verify' });
  }
  if (p.startsWith('/api/erp')) {
    return mergeQuery('/api/erp.php', raw);
  }
  if (p.startsWith('/api/pms')) {
    return mergeQuery('/api/pms.php', raw);
  }
  if (p.startsWith('/api/ops')) {
    return mergeQuery('/api/ops.php', raw);
  }
  if (p.startsWith('/api/uploads')) {
    return mergeQuery('/api/uploads.php', raw);
  }
  if (p.startsWith('/api/crm')) {
    return mergeQuery('/api/crm.php', raw);
  }
  if (p.startsWith('/api/chat')) {
    return mergeQuery('/api/chat.php', raw);
  }
  if (p.startsWith('/api/feedback')) {
    return mergeQuery('/api/feedback.php', raw);
  }
  if (p.startsWith('/api/v1/email-templates') || p.startsWith('/api/email-templates') || p.startsWith('/api/templates')) {
    return mergeQuery('/api/templates.php', raw);
  }
  if (
    p.startsWith('/api/settings') ||
    p.startsWith('/api/admin/') ||
    p === '/api/health' ||
    p.startsWith('/api/directors') ||
    p.startsWith('/api/v1/')
  ) {
    const rest = p.startsWith('/api/settings') ? '' : p.replace(/^\/api\/(?:v1\/)?/, '');
    const forced: Record<string, string> = {};
    if (rest && rest !== 'settings') forced.rest = rest;
    return mergeQuery('/api/settings.php', raw, forced);
  }
  if (p.startsWith('/api/') && !p.endsWith('.php')) {
    return mergeQuery(`${p}.php`, raw);
  }
  return raw;
}

/** Runtime public/config.js, then VITE_API_BASE_URL. Live Hostinger must leave both empty. */
export function apiBase(): string {
  const runtime = typeof window !== 'undefined' ? String(window.__YLT_API_BASE__ || '').trim() : '';
  const env = String((import.meta as any).env?.VITE_API_BASE_URL || '').trim();
  const raw = trimSlash(runtime || env || '');
  if (!raw || deadApiHost(raw)) return '';
  return raw;
}

function sameOriginApi(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return p.startsWith('/api') ? p : `/api${p}`;
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && !isLocalHost()) {
    return livePhpUrl(p);
  }
  const base = apiBase();
  if (!base) return sameOriginApi(p);
  if (p.startsWith('/api/') && (base === '/api' || base.endsWith('/api'))) {
    return trimSlash(base.replace(/\/api$/, '')) + p;
  }
  if (p.startsWith('/api/')) return trimSlash(base) + p;
  return `${trimSlash(base)}${p}`;
}

/**
 * Live: PHP /api/*.php (email OTP on Hostinger, no Go).
 * Localhost: Vite /api first (proxies to Go if running, else mock).
 */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = authToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}`, 'X-Authorization': `Bearer ${token}` } : {}),
  };
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const extra = authHeaders();
  if (extra.Authorization && !headers.has('Authorization')) headers.set('Authorization', extra.Authorization);
  if (extra['X-Authorization'] && !headers.has('X-Authorization')) headers.set('X-Authorization', extra['X-Authorization']);
  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(apiUrl(path), { ...init, headers });
}

export function apiUrlCandidates(path: string): string[] {
  if (typeof window !== 'undefined' && !isLocalHost()) {
    return [livePhpUrl(path)];
  }
  const local = sameOriginApi(path);
  const configured = apiUrl(path);
  const out: string[] = [];
  const add = (u: string) => {
    const t = String(u || '').trim();
    if (t && !out.includes(t) && !deadApiHost(t)) out.push(t);
  };
  add(local);
  add(configured);
  if (!out.length) add(local);
  return out;
}

export function authNetworkError(kind?: string): string {
  if (isLocalHost()) {
    return 'Could not reach the login API. Keep npm run dev running.';
  }
  if (kind === 'otp_send') return 'Could not send email OTP';
  return 'Could not reach the login API.';
}
