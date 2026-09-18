import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { YltLogo } from '../BrandLogo';
import { useNav } from '../../store/nav';
import { apiFetch } from '../../lib/api';
import { onboardTitle, parseOnboardKind, type OnboardKind } from '../../lib/onboardHost';
import { CITIES, field, label, passwordOk } from './onboardUi';

async function uploadOnboardFile(file: File): Promise<{ url: string; filename: string }> {
  if (file.size > 6 * 1024 * 1024) throw new Error('File too large. Max 6MB.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const res = await apiFetch('/api/uploads.php?resource=onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, file_data: base64, resource: 'onboard' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed.');
  return { url: String(data.url), filename: String(data.filename || file.name) };
}

const STEPS = ['Account', 'Business', 'Documents', 'Review'];

export default function PartnerRegistrationPage({ kind }: { kind: OnboardKind }) {
  const go = useNav((s) => s.go);
  const initial = useMemo(() => {
    const q = typeof window !== 'undefined' ? parseOnboardKind(new URLSearchParams(window.location.search).get('type')) : null;
    return q || kind;
  }, [kind]);
  const [type, setType] = useState<OnboardKind>(initial);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
    company: '', city: '', aadhaar: '', pan: '', gst: '',
    aadhaarName: '', panName: '', gstName: '',
    msme: '' as '' | 'yes' | 'no', corporate: '' as '' | 'yes' | 'no',
    terms: false, whatsapp: true,
  });

  const title = onboardTitle(type);

  async function pickFile(key: 'aadhaar' | 'pan' | 'gst', file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const uploaded = await uploadOnboardFile(file);
      const nameKey = key === 'aadhaar' ? 'aadhaarName' : key === 'pan' ? 'panName' : 'gstName';
      setForm((f) => ({ ...f, [key]: uploaded.url, [nameKey]: uploaded.filename }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    }
    setBusy(false);
  }

  function next() {
    setError('');
    if (step === 0) {
      if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 10) { setError('Full name and a valid mobile number are required.'); return; }
      if (form.email && !form.email.includes('@')) { setError('Enter a valid email, or leave it blank.'); return; }
      if (!passwordOk(form.password)) { setError('Password must be 8+ characters with uppercase, number, and special character.'); return; }
      if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    }
    if (step === 1) {
      if (!form.company.trim() || !form.city) { setError('Company name and city are required.'); return; }
      if (form.msme === '' || form.corporate === '') { setError('Select MSME and corporate entity options.'); return; }
    }
    if (step === 2) {
      if (!form.aadhaar && !form.pan && !form.gst) { setError('Upload GST, PAN, or Aadhaar.'); return; }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    setError('');
    if (!form.terms) { setError('Accept the terms to continue.'); return; }
    setBusy(true);
    const res = await apiFetch('/api/auth/onboard-signup', {
      method: 'POST',
      body: JSON.stringify({
        action: 'onboard-signup',
        partner_kind: type,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        agency_name: form.company.trim(),
        city: form.city,
        aadhaar_url: form.aadhaar,
        pan_url: form.pan,
        gst_url: form.gst,
        aadhaar_filename: form.aadhaarName,
        pan_filename: form.panName,
        gst_filename: form.gstName,
        msme: form.msme === 'yes',
        corporate: form.corporate === 'yes',
        whatsapp_optin: form.whatsapp,
        terms: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || data.error) { setError(String(data.error || 'Could not submit application.')); return; }
    setDone(String(data.message || 'Application submitted for review.'));
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" className="flex items-center gap-2" onClick={() => go({ name: 'onboard', kind: type === 'agent' ? 'agent' : type === 'insurance' ? 'insurance' : 'operator', screen: type === 'agent' || type === 'insurance' ? 'signin' : 'landing' })}>
            <YltLogo size={40} />
            <span className="font-display font-bold text-navy-900">YLT Travels</span>
          </button>
          <button type="button" className="text-sm font-semibold text-navy-800" onClick={() => go({ name: 'onboard', kind: type === 'agent' ? 'agent' : 'operator', screen: 'signin' })}>
            Sign in
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-300/50 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-navy-900">Join as {title}</h1>
          <p className="mt-1 text-sm text-slate-500">Application is stored as pending. {type === 'agent' ? 'Agent portal' : 'Partner ERP'} stays locked until YLT approves it.</p>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className={`rounded-full px-2 py-1 text-center text-[11px] font-bold ${i <= step ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
            ))}
          </div>

          {done ? (
            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Application under review</p>
              <p className="mt-1">{done}</p>
              <button type="button" className="mt-4 text-sm font-semibold text-navy-800" onClick={() => go({ name: 'onboard', kind: type === 'agent' ? 'agent' : 'operator', screen: 'signin' })}>Back to sign in</button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (step < 3) next(); else void submit(); }}>
              {step === 0 && (
                <>
                  <label className="block">
                    <span className={label}>Partner type *</span>
                    <select className={field} value={type} onChange={(e) => setType(e.target.value as OnboardKind)}>
                      <option value="operator">Bus operator</option>
                      <option value="agent">Travel agent</option>
                      <option value="hotel">Hotel partner</option>
                      <option value="insurance">Insurance partner</option>
                    </select>
                  </label>
                  <label className="block"><span className={label}>Full Name *</span><input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>
                  <label className="block"><span className={label}>Mobile No *</span><input className={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" /></label>
                  <label className="block"><span className={label}>Email</span><input className={field} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="For OTP and approval mail" /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><span className={label}>Password *</span><input className={field} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
                    <label className="block"><span className={label}>Confirm Password *</span><input className={field} type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></label>
                  </div>
                  <p className="text-xs text-slate-500">(Min. 8 characters. Must contain a number, an UPPERCASE letter and a special character)</p>
                </>
              )}
              {step === 1 && (
                <>
                  <label className="block"><span className={label}>Company Name *</span><input className={field} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Legal / trade name" /></label>
                  <label className="block">
                    <span className={label}>City *</span>
                    <select className={field} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                      <option value="">Select city</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <fieldset>
                    <legend className={label}>Are you an MSME? *</legend>
                    <div className="mt-2 flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={form.msme === 'yes'} onChange={() => setForm({ ...form, msme: 'yes' })} /> Yes</label><label className="flex items-center gap-2"><input type="radio" checked={form.msme === 'no'} onChange={() => setForm({ ...form, msme: 'no' })} /> No</label></div>
                  </fieldset>
                  <fieldset>
                    <legend className={label}>Are you a corporate entity? *</legend>
                    <div className="mt-2 flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={form.corporate === 'yes'} onChange={() => setForm({ ...form, corporate: 'yes' })} /> Yes</label><label className="flex items-center gap-2"><input type="radio" checked={form.corporate === 'no'} onChange={() => setForm({ ...form, corporate: 'no' })} /> No</label></div>
                  </fieldset>
                </>
              )}
              {step === 2 && (
                <>
                  <label className="block">
                    <span className={label}>GST certificate</span>
                    <input className={field} type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => void pickFile('gst', e.target.files?.[0])} />
                    {form.gst && <span className="text-xs text-emerald-600">Uploaded{form.gstName ? ` · ${form.gstName}` : ''}</span>}
                  </label>
                  <label className="block">
                    <span className={label}>PAN</span>
                    <input className={field} type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => void pickFile('pan', e.target.files?.[0])} />
                    {form.pan && <span className="text-xs text-emerald-600">Uploaded{form.panName ? ` · ${form.panName}` : ''}</span>}
                  </label>
                  <label className="block">
                    <span className={label}>Aadhaar (optional extra ID)</span>
                    <input className={field} type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => void pickFile('aadhaar', e.target.files?.[0])} />
                    {form.aadhaar && <span className="text-xs text-emerald-600">Uploaded{form.aadhaarName ? ` · ${form.aadhaarName}` : ''}</span>}
                  </label>
                  <p className="text-xs text-slate-500">Upload at least one of GST, PAN, or Aadhaar (PDF, image, or Word). Max 6MB each.</p>
                </>
              )}
              {step === 3 && (
                <>
                  <dl className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm">
                    <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="font-semibold">{title}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-semibold">{form.name}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Mobile</dt><dd className="font-semibold">{form.phone}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-semibold">{form.email || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Company</dt><dd className="font-semibold">{form.company}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">City</dt><dd className="font-semibold">{form.city}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">MSME</dt><dd className="font-semibold">{form.msme || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Corporate</dt><dd className="font-semibold">{form.corporate || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Documents</dt><dd className="font-semibold">{[form.gst && 'GST', form.pan && 'PAN', form.aadhaar && 'Aadhaar'].filter(Boolean).join(', ') || '—'}</dd></div>
                  </dl>
                  <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input type="checkbox" className="mt-1" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
                    <span>I accept all <button type="button" className="font-semibold text-navy-800" onClick={() => go({ name: 'help' })}>Terms &amp; Conditions</button>.</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input type="checkbox" className="mt-1" checked={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.checked })} />
                    Allow WhatsApp messages for this application
                  </label>
                </>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                {step > 0 && <button type="button" className="flex-1 rounded-lg border border-slate-200 py-3 text-sm font-semibold" onClick={() => { setError(''); setStep((s) => s - 1); }}>Back</button>}
                <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center rounded-lg bg-navy-800 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : step < 3 ? 'Continue' : 'Submit application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
