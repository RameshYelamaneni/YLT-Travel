import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { YltLogo } from '../BrandLogo';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { useNav } from '../../store/nav';
import { onboardPublicHref, onboardTitle, offsiteLinkProps, type OnboardKind, type OnboardScreen } from '../../lib/onboardHost';
import { field, label } from './onboardUi';
import PartnerLandingPage from './PartnerLandingPage';
import PartnerRegistrationPage from './PartnerRegistrationPage';

export default function PartnerOnboardPage({ kind, screen = 'landing' }: { kind: OnboardKind; screen?: OnboardScreen }) {
  if (kind === 'operator' && (screen === 'landing' || screen === 'guide')) return <PartnerLandingPage />;
  if (screen === 'registration' || kind === 'hotel') return <PartnerRegistrationPage kind={kind === 'hotel' ? 'hotel' : kind} />;
  return <PartnerSignIn kind={kind} />;
}

function PartnerSignIn({ kind }: { kind: OnboardKind }) {
  const { signInAgent, sendOtp } = useAuth();
  const go = useNav((s) => s.go);
  const [mode, setMode] = useState<'signin' | 'otp' | 'forgot' | 'review'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [login, setLogin] = useState({ id: '', password: '' });
  const [otp, setOtp] = useState({ email: '', code: '' });
  const title = onboardTitle(kind);
  const lightLanding = kind === 'agent';

  async function doLogin() {
    setBusy(true); setError(''); setInfo('');
    const res = await signInAgent(login.id.trim(), login.password, true);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      if (/under review/i.test(res.error)) setMode('review');
      return;
    }
    go({ name: 'partner' });
  }

  async function sendLoginOtp() {
    setBusy(true); setError('');
    const email = (otp.email || login.id).trim();
    if (!email.includes('@')) { setBusy(false); setError('Enter the email on your application to receive OTP.'); return; }
    const res = await sendOtp(email);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setOtp((s) => ({ ...s, email }));
    setInfo('OTP sent to your email.');
    setMode('otp');
  }

  async function verifyOtp() {
    setBusy(true); setError('');
    const res = await apiFetch('/api/auth/onboard-otp', {
      method: 'POST',
      body: JSON.stringify({ action: 'onboard-otp', email: otp.email.trim().toLowerCase(), code: otp.code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || data.error) {
      setError(String(data.error || 'Invalid code.'));
      if (/under review/i.test(String(data.error || ''))) setMode('review');
      return;
    }
    const token = data.access_token || data.accessToken;
    if (!token) { setError('Could not sign in.'); return; }
    try {
      localStorage.setItem('ylt_auth_token', token);
      localStorage.setItem('ylt_auth_user', JSON.stringify({
        email: data.email || data.user_email, name: data.name, user_id: data.user_id,
        type: 'agent', bus_enabled: data.bus_enabled, hotel_enabled: data.hotel_enabled, car_enabled: data.car_enabled,
        partner_kind: data.partner_kind,
      }));
    } catch { /* ignore */ }
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {lightLanding && (
        <div className="bg-navy-900 px-4 py-8 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">YLT Agent</p>
          <h1 className="mt-2 font-display text-2xl font-bold">Travel agent desk</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/70">Sign in below, or create an application. ERP stays locked until onboard approval.</p>
        </div>
      )}
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-10">
        <div className="w-full rounded-2xl bg-white p-8 shadow-xl shadow-slate-300/60">
          <div className="flex flex-col items-center text-center">
            <YltLogo size={56} />
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-navy-700">YLT Travels</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">{title} · password or email OTP</p>
          </div>

          {mode === 'review' && (
            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Application under review</p>
              <p className="mt-1">{info || 'Our onboard team will email you after approval. Partner ERP stays locked until then.'}</p>
              <button type="button" className="mt-4 text-sm font-semibold text-navy-800" onClick={() => setMode('signin')}>Back to sign in</button>
            </div>
          )}

          {mode === 'signin' && (
            <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); void doLogin(); }}>
              <label className="block">
                <span className={label}>Email / username / mobile</span>
                <input className={field} value={login.id} onChange={(e) => setLogin({ ...login, id: e.target.value })} placeholder="Enter email/username/mobile" autoComplete="username" />
              </label>
              <label className="block">
                <span className={label}>Enter password</span>
                <div className="relative">
                  <input className={`${field} pr-10`} type={showPass ? 'text' : 'password'} value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} placeholder="Enter password" autoComplete="current-password" />
                  <button type="button" className="absolute right-3 top-3 text-slate-400" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </label>
              <button type="button" className="text-sm font-semibold text-navy-800" onClick={() => { setMode('forgot'); setOtp({ email: login.id, code: '' }); }}>Forgot password?</button>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-lg bg-navy-800 py-3 text-sm font-bold text-white disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
              </button>
              <div className="relative py-1 text-center text-xs text-slate-400">or</div>
              <button type="button" disabled={busy} onClick={() => void sendLoginOtp()} className="w-full rounded-lg border border-navy-800 py-3 text-sm font-bold text-navy-800">Login with OTP</button>
              <p className="pt-2 text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <button type="button" className="font-bold text-navy-800" onClick={() => go({ name: 'onboard', kind, screen: 'registration', type: kind })}>Sign Up</button>
              </p>
              {kind === 'agent' && (
                <p className="text-center text-xs text-slate-400">
                  Bus operator?{' '}
                  <a className="font-semibold text-navy-800" {...offsiteLinkProps(onboardPublicHref('operator'))}>Open Partner landing</a>
                </p>
              )}
            </form>
          )}

          {mode === 'otp' && (
            <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); void verifyOtp(); }}>
              <p className="text-sm text-slate-600">{info}</p>
              <label className="block"><span className={label}>Email</span><input className={field} value={otp.email} onChange={(e) => setOtp({ ...otp, email: e.target.value })} /></label>
              <label className="block"><span className={label}>6-digit code</span><input className={field} value={otp.code} onChange={(e) => setOtp({ ...otp, code: e.target.value })} maxLength={6} /></label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-lg bg-navy-800 py-3 text-sm font-bold text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify OTP'}</button>
              <button type="button" className="w-full text-sm text-slate-500" onClick={() => setMode('signin')}>Back</button>
            </form>
          )}

          {mode === 'forgot' && (
            <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); void sendLoginOtp(); }}>
              <p className="text-sm text-slate-600">We email a login code. After approval you can sign in with OTP.</p>
              <label className="block"><span className={label}>Email</span><input className={field} value={otp.email} onChange={(e) => setOtp({ ...otp, email: e.target.value })} /></label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-lg bg-navy-800 py-3 text-sm font-bold text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}</button>
              <button type="button" className="w-full text-sm text-slate-500" onClick={() => setMode('signin')}>Back</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
