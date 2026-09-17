import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const API = import.meta.env.VITE_API_BASE_URL ?? '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const OTP_FN_URL = `${SUPABASE_URL}/functions/v1/otp-auth`;
const OTP_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
};
const TOKEN_KEY = 'ylt_auth_token';
const USER_KEY = 'ylt_auth_user';

export type EmployeeRole = 'admin' | 'sales' | 'support' | 'marketing' | 'operator' | 'manager';

export interface AuthUser {
  email: string;
  name: string;
  user_id: string;
  type: 'customer' | 'agent' | 'admin';
  role?: EmployeeRole;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  sendOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, code: string) => Promise<{ error: string | null }>;
  forgotPasswordSend: (email: string) => Promise<{ error: string | null }>;
  forgotPasswordReset: (email: string, code: string, password: string) => Promise<{ error: string | null }>;
  signInAgent: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAdmin: (username: string, password: string) => Promise<{ error: string | null }>;
  isAgent: boolean;
  isAdmin: boolean;
  role: EmployeeRole | null;
}

const Ctx = createContext<AuthCtx | null>(null);

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

function persistSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate the stored token once on boot. The cached user is already
    // hydrated from localStorage (stateless JWT), so we stay logged in even
    // if this validation call fails — we only clear on an explicit invalid
    // token response, never on network errors.
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    fetch(`${API}/auth.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'me' }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && data.user) {
          setUser({ email: data.user.email, name: data.user.name, user_id: data.user.sub, type: data.user.type, role: data.user.role });
        }
        // On failure, keep the cached user so a refresh never logs the user out.
      })
      .catch(() => { /* offline — keep cached user */ })
      .finally(() => setLoading(false));
  }, []);

  async function post(body: Record<string, unknown>) {
    try {
      const res = await fetch(`${API}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error ?? 'Request failed.' };
      return data;
    } catch {
      return { error: 'Network error. Check your connection.' };
    }
  }

  async function signIn(email: string, password: string) {
    const data: any = await post({ action: 'signin', email, password });
    if (data.error) return { error: data.error };
    persistSession(data.access_token, { email: data.user_email, name: data.name, user_id: data.user_id ?? '', type: 'customer' });
    setUser({ email: data.user_email, name: data.name, user_id: data.user_id ?? '', type: 'customer' });
    return { error: null };
  }

  async function signInAgent(email: string, password: string) {
    try {
      const res = await fetch(`${OTP_FN_URL}/agent-signin`, {
        method: 'POST',
        headers: OTP_HEADERS,
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error ?? 'Invalid agent credentials.' };
      persistSession(data.access_token, { email: data.user_email, name: data.name, user_id: data.user_id ?? '', type: 'agent' });
      setUser({ email: data.user_email, name: data.name, user_id: data.user_id ?? '', type: 'agent' });
      return { error: null };
    } catch {
      return { error: 'Network error. Check your connection.' };
    }
  }

  async function signInAdmin(username: string, password: string) {
    try {
      const res = await fetch(`${OTP_FN_URL}/admin-signin`, {
        method: 'POST',
        headers: OTP_HEADERS,
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error ?? 'Invalid admin credentials.' };
      persistSession(data.access_token, { email: data.user_email, name: data.name, user_id: data.user_id ?? '', type: 'admin', role: data.role });
      setUser({ email: data.user_email, name: data.name, user_id: data.user_id ?? '', type: 'admin', role: data.role });
      return { error: null };
    } catch {
      return { error: 'Network error. Check your connection.' };
    }
  }

  async function signUp(email: string, password: string, name: string) {
    const data: any = await post({ action: 'signup', email, password, name });
    if (data.error) return { error: data.error };
    persistSession(data.access_token, { email: data.user_email, name: data.name ?? name, user_id: '', type: 'customer' });
    setUser({ email: data.user_email, name: data.name ?? name, user_id: '', type: 'customer' });
    return { error: null };
  }

  function signOut() {
    clearSession();
    setUser(null);
    // Force reload so persisted Zustand stores re-hydrate from a clean slate.
    window.location.reload();
  }



  async function sendOtp(email: string) {
    try {
      const res = await fetch(`${OTP_FN_URL}/send`, {
        method: 'POST',
        headers: OTP_HEADERS,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error ?? 'Failed to send OTP.' };
      return { error: null };
    } catch {
      return { error: 'Network error. Check your connection.' };
    }
  }

  async function verifyOtp(email: string, code: string) {
    try {
      const res = await fetch(`${OTP_FN_URL}/verify`, {
        method: 'POST',
        headers: OTP_HEADERS,
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error ?? 'Verification failed.' };
      persistSession(data.access_token, { email: data.user_email, name: data.user_email, user_id: '', type: 'customer' });
      setUser({ email: data.user_email, name: data.user_email, user_id: '', type: 'customer' });
      return { error: null };
    } catch {
      return { error: 'Network error. Check your connection.' };
    }
  }

  async function forgotPasswordSend(email: string) {
    try {
      const res = await fetch(`${OTP_FN_URL}/send`, {
        method: 'POST',
        headers: OTP_HEADERS,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { error: data.error ?? 'Failed to send code.' };
      return { error: null };
    } catch {
      return { error: 'Network error. Check your connection.' };
    }
  }

  async function forgotPasswordReset(email: string, code: string, password: string) {
    return { error: 'Password reset is not available with OTP login. Please use OTP login or Sign Up to create a new account.' };
  }

  return (
    <Ctx.Provider value={{ user, loading, signIn, signUp, signOut, sendOtp, verifyOtp, forgotPasswordSend, forgotPasswordReset, signInAgent, signInAdmin, isAgent: user?.type === 'agent', isAdmin: user?.type === 'admin', role: user?.type === 'admin' ? (user.role ?? null) : null }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
