import { useState } from 'react';
import {
  X, Mail, Lock, User as UserIcon, Loader2,
  Zap, LogIn, UserPlus, KeyRound, ArrowLeft, Shield, Building2, Briefcase,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
}

type SubTab = 'otp' | 'signin' | 'signup';
type OtpStep = 'email' | 'code';
type ForgotStep = 'request' | 'verify';

export default function LoginModal({ open, onClose, message }: Props) {
  const { signIn, signUp, sendOtp, verifyOtp, forgotPasswordSend, forgotPasswordReset } = useAuth();

  const [subTab, setSubTab] = useState<SubTab>('otp');

  // OTP state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Sign In state
  const [siEmail, setSiEmail] = useState('');
  const [siPass, setSiPass] = useState('');
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState<string | null>(null);

  // Sign Up state
  const [suEmail, setSuEmail] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suName, setSuName] = useState('');
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState<string | null>(null);

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotPass, setForgotPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotDone, setForgotDone] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);

  if (!open) return null;

  function switchTab(t: SubTab) {
    setSubTab(t);
    setOtpError(null); setSiError(null); setSuError(null);
    setOtpStep('email');
  }

  function openForgot() {
    setForgotOpen(true);
    setForgotStep('request');
    setForgotEmail(siEmail || '');
    setForgotCode('');
    setForgotPass('');
    setForgotError(null);
    setForgotDone(false);
  }

  // OTP — step 1: send
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null); setOtpLoading(true);
    const { error } = await sendOtp(otpEmail);
    setOtpLoading(false);
    if (error) { setOtpError(error); return; }
    setOtpStep('code');
  }

  // OTP — step 2: verify
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null); setOtpLoading(true);
    const { error } = await verifyOtp(otpEmail, otpCode);
    setOtpLoading(false);
    if (error) { setOtpError(error); return; }
    onClose();
  }

  // Sign In
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSiError(null); setSiLoading(true);
    const { error } = await signIn(siEmail, siPass);
    setSiLoading(false);
    if (error) { setSiError(error); return; }
    onClose();
  }

  // Sign Up
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSuError(null); setSuLoading(true);
    const { error } = await signUp(suEmail, suPass, suName);
    setSuLoading(false);
    if (error) { setSuError(error); return; }
    onClose();
  }

  // Forgot password
  async function handleForgotSend(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null); setForgotLoading(true);
    const { error } = await forgotPasswordSend(forgotEmail);
    setForgotLoading(false);
    if (error) { setForgotError(error); return; }
    setForgotStep('verify');
  }

  async function handleForgotReset(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null); setForgotLoading(true);
    const { error } = await forgotPasswordReset(forgotEmail, forgotCode, forgotPass);
    setForgotLoading(false);
    if (error) { setForgotError(error); return; }
    setForgotDone(true);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border bg-[var(--bg-surface)] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)]" style={{ borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="bg-gradient-to-br from-[#6b0a1e] via-[#a01030] to-[#6b0a1e] px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">{forgotOpen ? 'Reset Password' : 'Login Portal'}</h2>
              <p className="mt-0 text-xs text-crimson-100/80">YLT Travels · Secure access</p>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-0">
          {forgotOpen ? (
            <div className="mt-5">
              {forgotDone ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">
                    Your password has been updated. You can now sign in with your new password.
                  </div>
                  <button
                    onClick={() => { setForgotOpen(false); setSubTab('signin'); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-600 to-crimson-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-crimson-900/40 transition hover:from-crimson-500 hover:to-crimson-600"
                  >
                    <LogIn className="h-4 w-4" /> Continue to Sign In
                  </button>
                </div>
              ) : forgotStep === 'request' ? (
                <form onSubmit={handleForgotSend} className="space-y-4">
                  <div className="rounded-xl border bg-[var(--bg-raised)] p-4 text-xs leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    Enter your account email and we'll send you a 6-digit verification code to reset your password.
                  </div>
                  <Field label="EMAIL ADDRESS" icon={<Mail className="h-3.5 w-3.5 text-crimson-400" />}>
                    <input type="email" className="login-input" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
                  </Field>
                  {forgotError && <Err msg={forgotError} />}
                  <SubmitBtn loading={forgotLoading} label="Send Reset Code" />
                  <button type="button" onClick={() => setForgotOpen(false)} className="flex w-full items-center justify-center gap-1.5 text-xs transition hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotReset} className="space-y-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-600">
                    A reset code was sent to <strong>{forgotEmail}</strong>. Check your inbox (and spam folder).
                  </div>
                  <Field label="6-DIGIT RESET CODE" icon={<KeyRound className="h-3.5 w-3.5 text-crimson-400" />}>
                    <input
                      className="login-input text-center text-2xl font-bold tracking-[0.5em]"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                      inputMode="numeric"
                      autoFocus
                    />
                  </Field>
                  <Field label="NEW PASSWORD" icon={<Lock className="h-3.5 w-3.5 text-crimson-400" />}>
                    <input type="password" className="login-input" value={forgotPass} onChange={(e) => setForgotPass(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
                  </Field>
                  {forgotError && <Err msg={forgotError} />}
                  <SubmitBtn loading={forgotLoading} label="Reset Password" />
                  <button type="button" onClick={() => { setForgotStep('request'); setForgotError(null); }} className="flex w-full items-center justify-center gap-1.5 text-xs transition hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Use a different email / resend code
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Sub-tabs */}
              <div className="mt-4 flex gap-1 rounded-xl bg-[var(--bg-raised)] p-1">
                <SubTabBtn active={subTab === 'otp'} onClick={() => switchTab('otp')} icon={<Zap className="h-3.5 w-3.5" />} label="OTP Login" filled />
                <SubTabBtn active={subTab === 'signin'} onClick={() => switchTab('signin')} icon={<LogIn className="h-3.5 w-3.5" />} label="Sign In" />
                <SubTabBtn active={subTab === 'signup'} onClick={() => switchTab('signup')} icon={<UserPlus className="h-3.5 w-3.5" />} label="Sign Up" />
              </div>

              <div className="mt-5">
                {subTab === 'otp' && (
                  <OtpPanel
                    step={otpStep}
                    email={otpEmail} setEmail={setOtpEmail}
                    code={otpCode} setCode={setOtpCode}
                    loading={otpLoading} error={otpError}
                    onSend={handleSendOtp} onVerify={handleVerifyOtp}
                    onBack={() => { setOtpStep('email'); setOtpCode(''); setOtpError(null); }}
                  />
                )}
                {subTab === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <Field label="EMAIL ADDRESS" icon={<Mail className="h-3.5 w-3.5 text-crimson-400" />}>
                      <input type="email" className="login-input" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
                    </Field>
                    <Field label="PASSWORD" icon={<Lock className="h-3.5 w-3.5 text-crimson-400" />}>
                      <input type="password" className="login-input" value={siPass} onChange={(e) => setSiPass(e.target.value)} placeholder="Your password" required />
                    </Field>
                    <div className="flex justify-end">
                      <button type="button" onClick={openForgot} className="flex items-center gap-1 text-xs font-medium text-crimson-600 transition hover:text-crimson-500">
                        <KeyRound className="h-3.5 w-3.5" /> Forgot password?
                      </button>
                    </div>
                    {siError && <Err msg={siError} />}
                    <SubmitBtn loading={siLoading} label="Sign In" />
                  </form>
                )}
                {subTab === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <Field label="FULL NAME" icon={<UserIcon className="h-3.5 w-3.5 text-crimson-400" />}>
                      <input className="login-input" value={suName} onChange={(e) => setSuName(e.target.value)} placeholder="Your name" required autoFocus />
                    </Field>
                    <Field label="EMAIL ADDRESS" icon={<Mail className="h-3.5 w-3.5 text-crimson-400" />}>
                      <input type="email" className="login-input" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} placeholder="you@example.com" required />
                    </Field>
                    <Field label="PASSWORD" icon={<Lock className="h-3.5 w-3.5 text-crimson-400" />}>
                      <input type="password" className="login-input" value={suPass} onChange={(e) => setSuPass(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
                    </Field>
                    {suError && <Err msg={suError} />}
                    <SubmitBtn loading={suLoading} label="Create Account" />
                  </form>
                )}
              </div>

              <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setStaffOpen((v) => !v)}
                  className="flex w-full items-center justify-center gap-1.5 text-xs transition hover:text-[var(--text-primary)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Shield className="h-3.5 w-3.5" /> Staff & Agent Login
                </button>
                {staffOpen && (
                  <div className="mt-3 space-y-3">
                    <StaffPanel onClose={onClose} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .login-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--bg-input);
          color: var(--text-primary);
          font-size: 0.9375rem;
          outline: none;
          transition: border 0.15s, box-shadow 0.15s;
        }
        .login-input:focus {
          border-color: #c81e44;
          box-shadow: 0 0 0 3px rgba(200,30,68,0.15);
        }
        .login-input::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  );
}

function SubTabBtn({ active, onClick, icon, label, filled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; filled?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition ${
        active
          ? filled
            ? 'bg-crimson-600 text-white'
            : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
          : 'hover:text-[var(--text-primary)]'
      }`} style={!active ? { color: 'var(--text-secondary)' } : undefined}
    >
      {icon} {label}
    </button>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-crimson-400">{icon}{label}</p>
      {children}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">{msg}</div>;
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-600 to-crimson-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-crimson-900/40 transition hover:from-crimson-500 hover:to-crimson-600 disabled:opacity-40"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </button>
  );
}

function OtpPanel({ step, email, setEmail, code, setCode, loading, error, onSend, onVerify, onBack }: {
  step: OtpStep;
  email: string; setEmail: (v: string) => void;
  code: string; setCode: (v: string) => void;
  loading: boolean; error: string | null;
  onSend: (e: React.FormEvent) => void;
  onVerify: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <>
      {step === 'email' ? (
        <form onSubmit={onSend} className="space-y-4">
          <Field label="EMAIL ADDRESS" icon={<Mail className="h-3.5 w-3.5 text-crimson-400" />}>
            <input type="email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </Field>
          {error && <Err msg={error} />}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-600 to-crimson-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-crimson-900/40 transition hover:from-crimson-500 hover:to-crimson-600 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /> Send OTP</>}
          </button>
          <p className="rounded-xl border bg-[var(--bg-raised)] p-4 text-xs leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            OTP Login: a 6-digit code is emailed to you — no password needed. New users are auto-registered. If the email doesn't arrive within a minute, check spam or use Sign In / Sign Up with a password instead.
          </p>
        </form>
      ) : (
        <form onSubmit={onVerify} className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-600">
            Code sent to <strong>{email}</strong>. Check your inbox (and spam folder).
          </div>
          <Field label="6-DIGIT OTP CODE" icon={<Zap className="h-3.5 w-3.5 text-crimson-400" />}>
            <input
              className="login-input text-center text-2xl font-bold tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              required
              inputMode="numeric"
              autoFocus
            />
          </Field>
          {error && <Err msg={error} />}
          <SubmitBtn loading={loading} label="Verify & Sign In" />
          <button type="button" onClick={onBack} className="w-full text-center text-xs transition hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }}>
            ← Use a different email / resend code
          </button>
        </form>
      )}
    </>
  );
}

function StaffPanel({ onClose }: { onClose: () => void }) {
  const { signInAgent, signInAdmin } = useAuth();
  const [mode, setMode] = useState<'agent' | 'employee'>('agent');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = mode === 'agent'
      ? await signInAgent(email, pass)
      : await signInAdmin(username, pass);
    setLoading(false);
    if (error) { setError(error); return; }
    onClose();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg bg-[var(--bg-raised)] p-1">
        <button onClick={() => { setMode('agent'); setError(null); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition ${mode === 'agent' ? 'bg-crimson-600 text-white' : ''}`} style={mode !== 'agent' ? { color: 'var(--text-secondary)' } : undefined}>
          <Building2 className="h-3.5 w-3.5" /> Agent / ERP
        </button>
        <button onClick={() => { setMode('employee'); setError(null); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition ${mode === 'employee' ? 'bg-crimson-600 text-white' : ''}`} style={mode !== 'employee' ? { color: 'var(--text-secondary)' } : undefined}>
          <Briefcase className="h-3.5 w-3.5" /> Employee
        </button>
      </div>
      <form onSubmit={handle} className="space-y-3">
        {mode === 'agent' ? (
          <Field label="AGENT EMAIL" icon={<Mail className="h-3.5 w-3.5 text-crimson-400" />}>
            <input type="email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@ylttravels.com" required autoFocus />
          </Field>
        ) : (
          <Field label="USERNAME OR EMAIL" icon={<UserIcon className="h-3.5 w-3.5 text-crimson-400" />}>
            <input className="login-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="CoreAdmin or you@ylttravels.com" required autoFocus />
          </Field>
        )}
        <Field label="PASSWORD" icon={<Lock className="h-3.5 w-3.5 text-crimson-400" />}>
          <input type="password" className="login-input" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Your password" required />
        </Field>
        {error && <Err msg={error} />}
        <SubmitBtn loading={loading} label={mode === 'agent' ? 'Sign In to ERP' : 'Sign In'} />
      </form>
    </div>
  );
}
