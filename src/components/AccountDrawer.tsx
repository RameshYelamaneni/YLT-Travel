import { useEffect, useState } from 'react';
import {
  X, User as UserIcon, Loader2, Zap, ArrowLeft, Shield, Building2, Briefcase,
  Ticket, Wallet, Gift, Tag, HelpCircle, Ban, CalendarClock, Search, Languages,
  Bell, Globe, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNav } from '../store/nav';
import { offsiteLinkProps } from '../lib/onboardHost';
import { useAccountPrefs } from '../store/accountPrefs';
import { findBookingByPnr, updateBookingStatus, type BookingRecord } from './MyBookingsPage';
import { formatINR } from '../lib/format';
import ThemePicker from './ThemePicker';

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
  startOnLogin?: boolean;
}

type Panel =
  | 'menu'
  | 'login'
  | 'signup'
  | 'profile'
  | 'wallet'
  | 'gift'
  | 'ticket-cancel'
  | 'ticket-reschedule'
  | 'ticket-search'
  | 'language';

type SubTab = 'otp' | 'signin';
type OtpStep = 'email' | 'code';

const WALLET_KEY = 'ylt-wallet';
const GIFT_CODES: Record<string, number> = { YLT50: 50, SUPERB60: 60 };

function readWallet(): { balance: number; redeemed: string[] } {
  try {
    const raw = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}');
    return { balance: Number(raw.balance) || 0, redeemed: Array.isArray(raw.redeemed) ? raw.redeemed : [] };
  } catch {
    return { balance: 0, redeemed: [] };
  }
}

function writeWallet(w: { balance: number; redeemed: string[] }) {
  localStorage.setItem(WALLET_KEY, JSON.stringify(w));
}

function erpDestFromSession(): 'partner' | 'admin' | 'operator' | null {
  try {
    const raw = sessionStorage.getItem('ylt_auth_user') || localStorage.getItem('ylt_auth_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { type?: string; role?: string };
    if (u.type === 'agent') return 'partner';
    if (u.type === 'admin') return u.role === 'operator' || u.role === 'manager' ? 'operator' : 'admin';
    return null;
  } catch {
    return null;
  }
}

export default function AccountDrawer({ open, onClose, message, startOnLogin }: Props) {
  const { user } = useAuth();
  const { go } = useNav();
  const [panel, setPanel] = useState<Panel>('menu');

  useEffect(() => {
    if (!open) return;
    setPanel(startOnLogin && !user ? 'login' : 'menu');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // user is read only when the drawer opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startOnLogin, onClose]);

  if (!open) return null;

  function navigate(name: 'bookings' | 'offers' | 'help' | 'admin' | 'partner' | 'operator') {
    onClose();
    go({ name });
  }

  function finishAuth() {
    const dest = erpDestFromSession();
    onClose();
    window.setTimeout(() => {
      const next = dest || erpDestFromSession();
      if (next) go({ name: next });
    }, 0);
  }

  function requireUser(next: Panel) {
    if (!user) { setPanel('login'); return; }
    setPanel(next);
  }

  const title =
    panel === 'login' ? 'Log in to manage your bookings'
    : panel === 'signup' ? 'Create your YLT account'
    : panel === 'profile' ? 'Personal information'
    : panel === 'wallet' ? 'YLT Wallet'
    : panel === 'gift' ? 'Redeem gift / offer code'
    : panel === 'ticket-cancel' ? 'Cancel ticket'
    : panel === 'ticket-reschedule' ? 'Reschedule ticket'
    : panel === 'ticket-search' ? 'Search ticket'
    : panel === 'language' ? 'Language'
    : 'Account';

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/45" aria-hidden />
      <aside
        className="account-drawer-in relative flex h-full w-full max-w-[380px] flex-col shadow-[-12px_0_40px_-18px_rgba(0,0,0,0.35)]"
        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            {panel !== 'menu' && (
              <button type="button" onClick={() => setPanel('menu')} className="grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: 'transparent' }} aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {panel === 'menu' && (
            <MenuBody
              message={message}
              onClose={onClose}
              onLogin={() => setPanel('login')}
              onSignup={() => setPanel('signup')}
              onBookings={() => { if (!user) { setPanel('login'); return; } navigate('bookings'); }}
              onProfile={() => requireUser('profile')}
              onWallet={() => setPanel('wallet')}
              onGift={() => setPanel('gift')}
              onOffers={() => navigate('offers')}
              onHelp={() => navigate('help')}
              onCancel={() => setPanel('ticket-cancel')}
              onReschedule={() => setPanel('ticket-reschedule')}
              onSearch={() => setPanel('ticket-search')}
              onLanguage={() => setPanel('language')}
              onStaff={() => {
                if (user?.type === 'admin') navigate(user.role === 'operator' || user.role === 'manager' ? 'operator' : 'admin');
                else if (user?.type === 'agent') navigate('partner');
                else setPanel('login');
              }}
            />
          )}
          {panel === 'login' && (
            <LoginForms onDone={finishAuth} onSignup={() => setPanel('signup')} />
          )}
          {panel === 'signup' && (
            <SignupForm onDone={finishAuth} onLogin={() => setPanel('login')} />
          )}
          {panel === 'profile' && <ProfileForm onSaved={onClose} />}
          {panel === 'wallet' && <WalletPanel />}
          {panel === 'gift' && <GiftPanel onDone={onClose} />}
          {(panel === 'ticket-cancel' || panel === 'ticket-reschedule' || panel === 'ticket-search') && (
            <TicketPanel mode={panel} onNeedLogin={() => setPanel('login')} onDone={onClose} />
          )}
          {panel === 'language' && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>English is the only language for now.</p>
          )}
        </div>
      </aside>
      <style>{`
        .login-input {
          width: 100%;
          padding: 0.5rem 0.7rem;
          border-radius: 0.55rem;
          border: 1px solid var(--border);
          background: var(--bg-input);
          color: var(--text-primary);
          font-size: 0.8125rem;
          outline: none;
        }
        .login-input:focus { border-color: #c9a227; box-shadow: 0 0 0 3px rgba(201,162,39,0.18); }
        .login-input::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  );
}

function MenuBody({
  message, onClose, onLogin, onSignup, onBookings, onProfile, onWallet, onGift, onOffers, onHelp,
  onCancel, onReschedule, onSearch, onLanguage, onStaff,
}: {
  message?: string;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
  onBookings: () => void;
  onProfile: () => void;
  onWallet: () => void;
  onGift: () => void;
  onOffers: () => void;
  onHelp: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  onSearch: () => void;
  onLanguage: () => void;
  onStaff: () => void;
}) {
  const { user, signOut, isAdmin, isAgent } = useAuth();
  const prefs = useAccountPrefs();

  return (
    <div>
      {message && (
        <p className="mb-3 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-800">{message}</p>
      )}
      {user ? (
        <div className="mb-4">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name || 'Traveller'}</p>
          <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
          <button type="button" onClick={() => { onClose(); signOut(); }} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-navy-600">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Log in to manage your bookings</p>
          <button type="button" onClick={onLogin} className="btn-primary mt-3 w-full rounded-full py-2.5 shadow-sm">
            Log In
          </button>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <button type="button" onClick={onSignup} className="font-semibold text-navy-600">Sign up</button>
          </p>
          <BusinessPortalLinks />
        </div>
      )}

      <Section label="My details">
        <Row icon={<Ticket className="h-4 w-4" />} label="Bookings" onClick={onBookings} />
        <Row icon={<UserIcon className="h-4 w-4" />} label="Personal information" onClick={onProfile} />
      </Section>
      <Section label="Payments">
        <Row icon={<Wallet className="h-4 w-4" />} label="YLT Wallet" extra="₹0" onClick={onWallet} />
        <Row icon={<Gift className="h-4 w-4" />} label="Redeem gift card" onClick={onGift} />
      </Section>
      <Section label="More">
        <Row icon={<Tag className="h-4 w-4" />} label="Offers" onClick={onOffers} />
        <Row icon={<HelpCircle className="h-4 w-4" />} label="Help" onClick={onHelp} />
        <Row icon={<Ban className="h-4 w-4" />} label="Cancel Ticket" onClick={onCancel} />
        <Row icon={<CalendarClock className="h-4 w-4" />} label="Reschedule ticket" onClick={onReschedule} />
        <Row icon={<Search className="h-4 w-4" />} label="Search ticket" onClick={onSearch} />
        <Row icon={<Languages className="h-4 w-4" />} label="Language" extra="English" onClick={onLanguage} />
        <ThemePicker />
        <div className="flex items-center justify-between px-1 py-2.5">
          <span className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
            <Bell className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> Notifications
          </span>
          <Toggle on={prefs.notifications} onChange={prefs.setNotifications} />
        </div>
        <Row icon={<Globe className="h-4 w-4" />} label="Country" extra="India" />
        <div className="flex items-center justify-between px-1 py-2.5">
          <span className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
            <Shield className="h-4 w-4 text-slate-500" /> Booking for women
          </span>
          <Toggle on={prefs.bookingForWomen} onChange={prefs.setBookingForWomen} />
        </div>
        {(isAdmin || isAgent) && (
          <Row icon={<Briefcase className="h-4 w-4" />} label={isAdmin ? 'Admin / operator' : (user?.partner_kind === 'agent' ? 'Agent portal' : 'Partner ERP')} onClick={onStaff} />
        )}
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function Row({ icon, label, extra, onClick }: { icon: React.ReactNode; label: string; extra?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2.5 text-left" style={{ backgroundColor: 'transparent' }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {extra && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{extra}</span>}
      <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-navy-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

function LoginForms({ onDone, onSignup }: { onDone: () => void; onSignup: () => void }) {
  const { signIn, sendOtp, verifyOtp, forgotPasswordSend, forgotPasswordReset } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('otp');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [siEmail, setSiEmail] = useState('');
  const [siPass, setSiPass] = useState('');
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotPass, setForgotPass] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null); setOtpHint(null); setOtpLoading(true);
    const { error, hint } = await sendOtp(otpEmail.trim());
    setOtpLoading(false);
    if (error) { setOtpError(error); return; }
    if (hint) setOtpHint(hint);
    setOtpStep('code');
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null); setOtpLoading(true);
    const digits = otpCode.replace(/\D/g, '').slice(0, 6);
    if (digits.length !== 6) {
      setOtpLoading(false);
      setOtpError('Enter the 6-digit code from your email.');
      return;
    }
    const { error } = await verifyOtp(otpEmail.trim(), digits, remember);
    setOtpLoading(false);
    if (error) { setOtpError(error); return; }
    onDone();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSiError(null); setSiLoading(true);
    const { error } = await signIn(siEmail, siPass, remember);
    setSiLoading(false);
    if (error) { setSiError(error); return; }
    onDone();
  }

  if (forgotOpen) {
    return (
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setForgotError(null); setForgotLoading(true);
          if (forgotStep === 'request') {
            const { error } = await forgotPasswordSend(forgotEmail);
            setForgotLoading(false);
            if (error) { setForgotError(error); return; }
            setForgotStep('verify');
            return;
          }
          const { error } = await forgotPasswordReset(forgotEmail, forgotCode, forgotPass);
          setForgotLoading(false);
          if (error) { setForgotError(error); return; }
          setForgotOpen(false);
          setSubTab('signin');
        }}
      >
        {forgotStep === 'request' ? (
          <Field label="EMAIL">
            <input type="email" className="login-input" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
          </Field>
        ) : (
          <>
            <Field label="RESET CODE">
              <input className="login-input text-center tracking-[0.35em]" value={forgotCode} onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
            </Field>
            <Field label="NEW PASSWORD">
              <input type="password" className="login-input" value={forgotPass} onChange={(e) => setForgotPass(e.target.value)} minLength={6} required />
            </Field>
          </>
        )}
        {forgotError && <Err msg={forgotError} />}
        <SubmitBtn loading={forgotLoading} label={forgotStep === 'request' ? 'Send code' : 'Update password'} />
        <button type="button" onClick={() => setForgotOpen(false)} className="w-full text-center text-xs text-slate-500">Back</button>
      </form>
    );
  }

  return (
    <div>
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        <button type="button" onClick={() => setSubTab('otp')} className={`flex-1 rounded-md py-2 text-xs font-semibold ${subTab === 'otp' ? 'bg-navy-600 text-white' : 'text-slate-600'}`}>Email OTP</button>
        <button type="button" onClick={() => setSubTab('signin')} className={`flex-1 rounded-md py-2 text-xs font-semibold ${subTab === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>Password</button>
      </div>

      <div className="mt-4">
        {subTab === 'otp' && (
          otpStep === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <Field label="EMAIL">
                <input type="email" className="login-input" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </Field>
              <p className="text-[11px] leading-snug text-slate-500">We email a 6-digit login code. No SMS.</p>
              {otpError && <Err msg={otpError} />}
              <RememberMe on={remember} onChange={setRemember} />
              <button type="submit" disabled={otpLoading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-2.5 disabled:opacity-40">
                {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /> Send OTP</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Code sent to <strong>{otpEmail}</strong>. Check inbox and spam.</p>
              <Field label="6-DIGIT CODE">
                <input className="login-input text-center text-xl font-bold tracking-[0.4em]" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" required autoFocus />
              </Field>
              {otpHint && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  Dev: code is <strong>{otpHint}</strong>
                </p>
              )}
              {otpError && <Err msg={otpError} />}
              <RememberMe on={remember} onChange={setRemember} />
              <SubmitBtn loading={otpLoading} label="Verify & sign in" />
              <button type="button" onClick={() => { setOtpStep('email'); setOtpCode(''); setOtpError(null); }} className="w-full text-center text-xs text-slate-500">Use a different email</button>
            </form>
          )
        )}
        {subTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <Field label="EMAIL">
              <input type="email" className="login-input" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} required autoFocus />
            </Field>
            <Field label="PASSWORD">
              <input type="password" className="login-input" value={siPass} onChange={(e) => setSiPass(e.target.value)} required />
            </Field>
            <button type="button" onClick={() => { setForgotOpen(true); setForgotEmail(siEmail); setForgotStep('request'); }} className="text-xs font-medium text-navy-600">Forgot password?</button>
            {siError && <Err msg={siError} />}
            <RememberMe on={remember} onChange={setRemember} />
            <SubmitBtn loading={siLoading} label="Sign In" />
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        New here? <button type="button" onClick={onSignup} className="font-semibold text-navy-600">Sign up</button>
      </p>
      <BusinessPortalLinks />
      <button type="button" onClick={() => setStaffOpen((v) => !v)} className="mt-4 flex w-full items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Shield className="h-3.5 w-3.5" /> Staff login
      </button>
      {staffOpen && <div className="mt-3"><StaffPanel onClose={onDone} /></div>}
    </div>
  );
}

function SignupForm({ onDone, onLogin }: { onDone: () => void; onLogin: () => void }) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error: err } = await signUp(email, pass, name, remember);
    setLoading(false);
    if (err) { setError(err); return; }
    onDone();
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <Field label="FULL NAME"><input className="login-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
      <Field label="EMAIL"><input type="email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
      <Field label="PASSWORD"><input type="password" className="login-input" value={pass} onChange={(e) => setPass(e.target.value)} minLength={6} required /></Field>
      {error && <Err msg={error} />}
      <RememberMe on={remember} onChange={setRemember} />
      <SubmitBtn loading={loading} label="Create account" />
      <button type="button" onClick={onLogin} className="w-full text-center text-xs text-slate-500">Already have an account? Log in</button>
    </form>
  );
}

function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saved, setSaved] = useState(false);
  if (!user) return <p className="text-sm text-slate-500">Sign in to edit your profile.</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        updateProfile({ name, phone });
        setSaved(true);
        onSaved();
      }}
    >
      <Field label="NAME"><input className="login-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="EMAIL"><input className="login-input bg-slate-50" value={user.email} readOnly /></Field>
      <Field label="PHONE"><input className="login-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" /></Field>
      {saved && <p className="text-xs text-emerald-600">Saved on this device.</p>}
      <SubmitBtn loading={false} label="Save" />
    </form>
  );
}

function WalletPanel() {
  const w = readWallet();
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-navy-700 to-navy-500 p-5 text-white">
        <p className="text-xs uppercase tracking-wide text-white/80">YLT Wallet</p>
        <p className="mt-2 font-display text-3xl font-bold">{formatINR(w.balance)}</p>
        <p className="mt-2 text-xs text-white/80">Balance 0 until wallet is wired to the database.</p>
      </div>
      <p className="text-xs text-slate-500">Coming soon. Top-up and trip credits will appear here.</p>
    </div>
  );
}

function GiftPanel({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [note, setNote] = useState<string | null>(null);
  function redeem(e: React.FormEvent) {
    e.preventDefault();
    const key = code.trim().toUpperCase();
    const w = readWallet();
    if (!key) return;
    if (w.redeemed.includes(key)) { setNote('This code was already redeemed on this device.'); return; }
    const amount = GIFT_CODES[key];
    if (!amount) { setNote('Unknown code. Try YLT50 or SUPERB60 (local stub).'); return; }
    w.balance += amount;
    w.redeemed.push(key);
    writeWallet(w);
    setNote(`Added ${formatINR(amount)} to YLT Wallet (local stub).`);
    setCode('');
    onDone();
  }
  return (
    <form onSubmit={redeem} className="space-y-3">
      <Field label="GIFT / OFFER CODE">
        <input className="login-input uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="YLT50" />
      </Field>
      {note && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{note}</p>}
      <SubmitBtn loading={false} label="Redeem" />
    </form>
  );
}

function TicketPanel({ mode, onNeedLogin, onDone }: { mode: 'ticket-cancel' | 'ticket-reschedule' | 'ticket-search'; onNeedLogin: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [pnr, setPnr] = useState('');
  const [hit, setHit] = useState<BookingRecord | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { onNeedLogin(); return; }
    const found = findBookingByPnr(pnr);
    setHit(found);
    setNote(found ? null : 'No booking with that PNR on this device. Check My Bookings after you sign in.');
  }

  return (
    <form onSubmit={search} className="space-y-3">
      <p className="text-xs text-slate-500">
        {mode === 'ticket-cancel' && 'Enter your PNR to cancel a local booking.'}
        {mode === 'ticket-reschedule' && 'Find a PNR, then search a new date for the same route.'}
        {mode === 'ticket-search' && 'Look up a booking by PNR from your saved tickets.'}
      </p>
      <Field label="PNR">
        <input className="login-input uppercase" value={pnr} onChange={(e) => setPnr(e.target.value)} placeholder="YLT123456" required />
      </Field>
      <SubmitBtn loading={false} label="Search" />
      {note && <p className="text-xs text-amber-700">{note}</p>}
      {hit && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--border)' }}>
          <p className="font-semibold">{hit.operator}</p>
          <p className="text-xs text-slate-500">{hit.route} · {hit.date} · PNR {hit.pnr}</p>
          {hit.status && <p className="mt-1 text-xs uppercase text-navy-600">{hit.status}</p>}
          {mode === 'ticket-cancel' && hit.status !== 'cancelled' && (
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-navy-600"
              onClick={() => { updateBookingStatus(hit.pnr, 'cancelled'); setHit({ ...hit, status: 'cancelled' }); onDone(); }}
            >
              Confirm cancel
            </button>
          )}
          {mode === 'ticket-reschedule' && (
            <p className="mt-2 text-xs text-slate-500">Use Search buses with a new date. The PNR stays until you rebook.</p>
          )}
        </div>
      )}
    </form>
  );
}

function StaffPanel({ onClose }: { onClose: () => void }) {
  const { signInAgent, signInAdmin } = useAuth();
  const [mode, setMode] = useState<'agent' | 'employee'>('agent');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = mode === 'agent'
      ? await signInAgent(email, pass, remember)
      : await signInAdmin(username, pass, remember);
    setLoading(false);
    if (err) { setError(err); return; }
    onClose();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        <button type="button" onClick={() => setMode('agent')} className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-xs font-semibold ${mode === 'agent' ? 'bg-navy-600 text-white' : 'text-slate-600'}`}>
          <Building2 className="h-3.5 w-3.5" /> Partner
        </button>
        <button type="button" onClick={() => setMode('employee')} className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-xs font-semibold ${mode === 'employee' ? 'bg-navy-600 text-white' : 'text-slate-600'}`}>
          <Briefcase className="h-3.5 w-3.5" /> Employee
        </button>
      </div>
      <form onSubmit={handle} className="space-y-3">
        {mode === 'agent' ? (
          <Field label="PARTNER EMAIL"><input type="email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        ) : (
          <Field label="USERNAME"><input className="login-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="CoreAdmin" required /></Field>
        )}
        <Field label="PASSWORD"><input type="password" className="login-input" value={pass} onChange={(e) => setPass(e.target.value)} required /></Field>
        {error && <Err msg={error} />}
        <RememberMe on={remember} onChange={setRemember} />
        <SubmitBtn loading={loading} label="Sign in" />
      </form>
    </div>
  );
}

function BusinessPortalLinks() {
  const partner = offsiteLinkProps('https://onboardvendor.ylttravels.com/signin');
  const agent = offsiteLinkProps('https://agent.ylttravels.com');
  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-bold tracking-widest text-navy-500">BUSINESS LOGIN</p>
      <div className="grid grid-cols-2 gap-2">
        <a {...partner} className="rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition hover:border-navy-700 hover:text-navy-800" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          Partner
        </a>
        <a {...agent} className="rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition hover:border-navy-700 hover:text-navy-800" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          Agent
        </a>
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Opens in a new tab. Customer login stays here.</p>
    </div>
  );
}

function RememberMe({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-navy-700" />
      Keep me signed in
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold tracking-widest text-navy-500">{label}</p>
      {children}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{msg}</div>;
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-2.5 disabled:opacity-40">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </button>
  );
}
