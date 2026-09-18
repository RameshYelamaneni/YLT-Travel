import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiUrlCandidates, authNetworkError, isLocalHost } from './api';
import { alreadyOnIdleLogin, idleLoginHref } from './onboardHost';

const TOKEN_KEY = 'ylt_auth_token';
const USER_KEY = 'ylt_auth_user';
const ACTIVITY_KEY = 'ylt_auth_active';
const IDLE_CAP_MS = 30 * 60 * 1000;

export type EmployeeRole = 'admin' | 'hr' | 'sales' | 'support' | 'marketing' | 'operator' | 'manager' | 'onboard' | 'partner_onboard' | 'agent_onboard';

export interface AuthUser {
  email: string;
  name: string;
  user_id: string;
  type: 'customer' | 'agent' | 'admin';
  role?: EmployeeRole;
  phone?: string;
  bus_enabled?: boolean;
  hotel_enabled?: boolean;
  car_enabled?: boolean;
  partner_kind?: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, remember?: boolean) => Promise<{ error: string | null }>;
  signOut: () => void;
  sendOtp: (email: string) => Promise<{ error: string | null; hint?: string }>;
  verifyOtp: (email: string, code: string, remember?: boolean) => Promise<{ error: string | null }>;
  forgotPasswordSend: (email: string) => Promise<{ error: string | null }>;
  forgotPasswordReset: (email: string, code: string, password: string) => Promise<{ error: string | null }>;
  signInAgent: (email: string, password: string, remember?: boolean) => Promise<{ error: string | null }>;
  signInAdmin: (username: string, password: string, remember?: boolean) => Promise<{ error: string | null }>;
  updateProfile: (patch: { name?: string; phone?: string }) => void;
  isAgent: boolean;
  isAdmin: boolean;
  role: EmployeeRole | null;
}

const Ctx = createContext<AuthCtx | null>(null);

function storeGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readUser(): AuthUser | null {
  try {
    const raw = storeGet(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

function persistSession(token: string, user: AuthUser, remember: boolean) {
  if (!token) return;
  const primary = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  try {
    primary.setItem(TOKEN_KEY, token);
    primary.setItem(USER_KEY, JSON.stringify(user));
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
    other.removeItem(ACTIVITY_KEY);
  } catch { /* private mode */ }
  touchActivity(true);
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ACTIVITY_KEY);
  } catch { /* private mode */ }
}

export function authToken(): string | null {
  return storeGet(TOKEN_KEY);
}

export function authUserId(): string {
  return readUser()?.user_id || '';
}

function tokenOf(data: any): string {
  return data.access_token || data.accessToken || '';
}

function jwtClaims(token: string): { exp?: number; idle?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number; idle?: number };
  } catch {
    return null;
  }
}

function jwtExp(token: string): number | null {
  const json = jwtClaims(token);
  return typeof json?.exp === 'number' ? json.exp : null;
}

function idleLimitMs(token: string | null): number {
  let ms = IDLE_CAP_MS;
  if (token) {
    const idle = jwtClaims(token)?.idle;
    if (typeof idle === 'number' && idle > 0) ms = Math.min(ms, idle * 1000);
  }
  return Math.max(60_000, ms);
}

function tokenExpired(token: string | null): boolean {
  if (!token) return true;
  const exp = jwtExp(token);
  return exp != null && Date.now() / 1000 >= exp;
}

function lastActivity(): number {
  const n = Number(storeGet(ACTIVITY_KEY) || 0);
  return Number.isFinite(n) ? n : 0;
}

let lastTouchWrite = 0;

function touchActivity(force = false) {
  const now = Date.now();
  if (!force && now - lastTouchWrite < 4000) return;
  lastTouchWrite = now;
  const stamp = String(now);
  try {
    if (sessionStorage.getItem(TOKEN_KEY)) sessionStorage.setItem(ACTIVITY_KEY, stamp);
    if (localStorage.getItem(TOKEN_KEY)) localStorage.setItem(ACTIVITY_KEY, stamp);
    if (!sessionStorage.getItem(TOKEN_KEY) && !localStorage.getItem(TOKEN_KEY)) {
      sessionStorage.setItem(ACTIVITY_KEY, stamp);
    }
  } catch { /* ignore */ }
}

function idleExpired(): boolean {
  const token = authToken();
  if (!token) return false;
  const last = lastActivity();
  if (!last) return true;
  return Date.now() - last > idleLimitMs(token);
}

function redirectIdleLogin() {
  if (typeof window === 'undefined') return;
  const href = idleLoginHref();
  if (alreadyOnIdleLogin(href)) return;
  window.location.replace(href);
}

function flagOn(v: unknown, fallback = false): boolean {
  if (v === undefined || v === null || v === '') return fallback;
  if (v === false || v === 0 || v === '0' || v === 'false') return false;
  return v === true || v === 1 || v === '1' || v === 'true' || v === 'on';
}

function userFrom(data: any, fallback: Partial<AuthUser> = {}): AuthUser {
  const type = (fallback.type || 'customer') as AuthUser['type'];
  return {
    email: data.user_email || data.email || fallback.email || '',
    name: data.name || fallback.name || data.user_email || data.email || '',
    user_id: data.user_id || data.userId || fallback.user_id || '',
    type,
    role: data.role || fallback.role,
    bus_enabled: flagOn(data.bus_enabled ?? fallback.bus_enabled, true),
    hotel_enabled: flagOn(data.hotel_enabled ?? fallback.hotel_enabled, true),
    car_enabled: flagOn(data.car_enabled ?? fallback.car_enabled, true),
    partner_kind: data.partner_kind || fallback.partner_kind,
  };
}

function goPath(action: string): string {
  switch (action) {
    case 'otp_send': return '/api/auth/otp/send';
    case 'otp_verify': return '/api/auth/otp/verify';
    case 'admin-signin': return '/api/auth/admin-signin';
    case 'agent-signin': return '/api/auth/agent-signin';
    case 'onboard-signup': return '/api/auth/onboard-signup';
    case 'onboard-otp': return '/api/auth/onboard-otp';
    case 'signin': return '/api/auth/signin';
    case 'signup': return '/api/auth/signup';
    case 'logout': return '/api/auth/logout';
    default: return '/api/auth/password';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readUser());
  const [loading, setLoading] = useState(true);
  const idleTimer = useRef<number | null>(null);
  const bootGen = useRef(0);

  function dropSession(redirectLogin = false) {
    bootGen.current += 1;
    const token = authToken();
    if (token) {
      const urls = isLocalHost() ? apiUrlCandidates(goPath('logout')) : ['/api/auth.php'];
      void Promise.all(urls.map((url) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'logout' }),
        keepalive: true,
      }).catch(() => undefined)));
    }
    clearSession();
    setUser(null);
    if (redirectLogin) redirectIdleLogin();
  }

  function applyAuthUser(u: AuthUser, token: string, remember: boolean) {
    bootGen.current += 1;
    persistSession(token, u, remember);
    setUser(u);
  }

  useEffect(() => {
    const gen = ++bootGen.current;
    const token = authToken();
    if (!token || tokenExpired(token) || idleExpired()) {
      if (token && (tokenExpired(token) || idleExpired())) dropSession(true);
      else if (!authToken()) {
        clearSession();
        setUser(null);
      }
      setLoading(false);
      return;
    }
    const fallback = readUser();
    (async () => {
      let ok = false;
      for (const url of apiUrlCandidates('/api/auth/me')) {
        if (bootGen.current !== gen || authToken() !== token) return;
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, 'X-Authorization': `Bearer ${token}` },
          });
          if (bootGen.current !== gen || authToken() !== token) return;
          if (res.status === 401 || res.status === 403) {
            dropSession(true);
            setLoading(false);
            return;
          }
          if (!res.ok) continue;
          const data = await res.json();
          if (data?.ok && data.user) {
            const type = data.user.type || fallback?.type || 'customer';
            const next: AuthUser = {
              email: data.user.email || fallback?.email || '',
              name: data.user.name || fallback?.name || '',
              user_id: data.user.sub || data.user.user_id || fallback?.user_id || '',
              type,
              role: data.user.role || fallback?.role,
              bus_enabled: flagOn(data.user.bus_enabled, fallback?.bus_enabled ?? true),
              hotel_enabled: flagOn(data.user.hotel_enabled, fallback?.hotel_enabled ?? true),
              car_enabled: flagOn(data.user.car_enabled, fallback?.car_enabled ?? true),
              partner_kind: data.user.partner_kind || fallback?.partner_kind,
            };
            if (bootGen.current !== gen || authToken() !== token) return;
            const remember = !!localStorage.getItem(TOKEN_KEY);
            persistSession(token, next, remember);
            setUser(next);
            ok = true;
            break;
          }
        } catch {
          /* try next origin */
        }
      }
      if (bootGen.current !== gen) return;
      if (!ok && tokenExpired(token) && authToken() === token) dropSession(true);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    touchActivity(true);
    const onActivity = () => touchActivity();
    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'pointerdown', 'keydown', 'click', 'touchstart', 'touchmove', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (idleExpired() || tokenExpired(authToken())) dropSession(true);
      else touchActivity(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) dropSession(false);
    };
    window.addEventListener('storage', onStorage);
    idleTimer.current = window.setInterval(() => {
      const token = authToken();
      if (!token || tokenExpired(token) || idleExpired()) dropSession(true);
    }, 10000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      if (idleTimer.current) window.clearInterval(idleTimer.current);
    };
  }, [user]);

  async function post(action: string, body: Record<string, unknown>) {
    const urls = isLocalHost()
      ? apiUrlCandidates(goPath(action))
      : ['/api/auth.php'];
    const payload = { ...body, action };
    let last = authNetworkError(action);
    for (const url of urls) {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 12000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          continue;
        }
        if (res.ok && !data.error) return data;
        if (data.error && res.status >= 400 && res.status < 500) {
          return { error: String(data.error) };
        }
        last = data.error ? String(data.error) : last;
      } catch {
        continue;
      } finally {
        window.clearTimeout(timer);
      }
    }
    return { error: last };
  }

  async function signIn(email: string, password: string, remember = false) {
    const data: any = await post('signin', { email, password, remember });
    if (data.error) return { error: data.error };
    const token = tokenOf(data);
    if (!token) return { error: 'Login succeeded but no session token was returned.' };
    applyAuthUser(userFrom(data, { type: 'customer' }), token, remember);
    return { error: null };
  }

  async function signInAgent(email: string, password: string, remember = false) {
    const data: any = await post('agent-signin', { email, password, remember });
    if (data.error) return { error: data.error };
    const token = tokenOf(data);
    if (!token) return { error: 'Login succeeded but no session token was returned.' };
    applyAuthUser(userFrom(data, { type: 'agent', partner_kind: data.partner_kind }), token, remember);
    return { error: null };
  }

  async function signInAdmin(username: string, password: string, remember = false) {
    const data: any = await post('admin-signin', { username, password, remember });
    if (data.error) return { error: data.error };
    const token = tokenOf(data);
    if (!token) return { error: 'Login succeeded but no session token was returned.' };
    applyAuthUser(userFrom(data, { type: 'admin', role: data.role }), token, remember);
    return { error: null };
  }

  async function signUp(email: string, password: string, name: string, remember = false) {
    const data: any = await post('signup', { email, password, name, remember });
    if (data.error) return { error: data.error };
    const token = tokenOf(data);
    if (!token) return { error: 'Account created but no session token was returned.' };
    applyAuthUser(userFrom(data, { type: 'customer', name }), token, remember);
    return { error: null };
  }

  function signOut() {
    dropSession();
  }

  async function sendOtp(email: string) {
    const data: any = await post('otp_send', { email: email.trim().toLowerCase() });
    if (data.error) return { error: data.error as string };
    return { error: null, hint: typeof data.hint === 'string' ? data.hint : undefined };
  }

  async function verifyOtp(email: string, code: string, remember = false) {
    const digits = String(code || '').replace(/\D/g, '').slice(0, 6);
    const data: any = await post('otp_verify', { email: email.trim().toLowerCase(), code: digits, remember });
    if (data.error) return { error: data.error };
    const token = tokenOf(data);
    if (!token) return { error: 'Login succeeded but no session token was returned.' };
    applyAuthUser(userFrom(data, { type: 'customer' }), token, remember);
    return { error: null };
  }

  async function forgotPasswordSend(email: string) {
    return sendOtp(email);
  }

  async function forgotPasswordReset() {
    return { error: 'Password reset is not available with OTP login. Please use OTP login or Sign Up to create a new account.' };
  }

  function updateProfile(patch: { name?: string; phone?: string }) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        if (localStorage.getItem(TOKEN_KEY)) localStorage.setItem(USER_KEY, JSON.stringify(next));
        if (sessionStorage.getItem(TOKEN_KEY)) sessionStorage.setItem(USER_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <Ctx.Provider value={{ user, loading, signIn, signUp, signOut, sendOtp, verifyOtp, forgotPasswordSend, forgotPasswordReset, signInAgent, signInAdmin, updateProfile, isAgent: user?.type === 'agent', isAdmin: user?.type === 'admin', role: user?.type === 'admin' ? (user.role ?? null) : null }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
