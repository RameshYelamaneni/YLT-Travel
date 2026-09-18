import { useEffect, useState } from 'react';
import { MapPin, Send, Upload } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Job {
  id: string;
  title: string;
  location: string;
  department: string;
  employment_type: string;
  description: string;
  requirements?: string;
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_BYTES = 6 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function allowedFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return /\.(pdf|jpe?g|png|webp|docx?)$/.test(n);
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState<Job | null>(null);
  const [f, setF] = useState({ name: '', email: '', phone: '', cover_note: '' });
  const [resume, setResume] = useState<File | null>(null);
  const [idProof, setIdProof] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/ops.php?resource=jobs');
        const data = await res.json().catch(() => ({}));
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      } catch {
        setJobs([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  function pickFile(file: File | undefined, kind: 'resume' | 'id'): void {
    setErr(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setErr('Each file must be 6MB or smaller.');
      return;
    }
    if (!allowedFile(file)) {
      setErr('Use PDF, JPG, PNG, WebP, DOC, or DOCX.');
      return;
    }
    if (kind === 'resume') setResume(file);
    else setIdProof(file);
  }

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!open) return;
    if (!resume || !idProof) {
      setErr('Resume and ID proof are required.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch('/api/ops.php?resource=apply', {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          job_id: open.id,
          resume_data: await fileToDataUrl(resume),
          resume_name: resume.name,
          id_proof_data: await fileToDataUrl(idProof),
          id_proof_name: idProof.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setErr(data.error || 'Could not send application.');
        return;
      }
      setOpen(null);
      setF({ name: '', email: '', phone: '', cover_note: '' });
      setResume(null);
      setIdProof(null);
      setToast('Application received. YLT Careers will contact you on this email.');
    } catch {
      setErr('Could not send application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-fluid py-12">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-crimson-700">YLT Travels</p>
      <h1 className="font-display text-3xl font-bold">Careers at YLT Travels</h1>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
        These are company roles at YLT Travels. Open listings are posted by YLT Admin. The list stays empty until a role is published — we do not invent jobs.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {jobs.map((j) => (
          <article key={j.id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <h2 className="font-display text-lg font-bold">{j.title}</h2>
            <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="h-3 w-3" /> {j.location || 'India'} · {j.department} · {j.employment_type}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>{j.description}</p>
            {j.requirements ? (
              <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}><span className="font-semibold">Requirements:</span> {j.requirements}</p>
            ) : null}
            <button className="btn-primary mt-4 text-sm" onClick={() => { setOpen(j); setErr(null); }}>Apply</button>
          </article>
        ))}
      </div>
      {!jobs.length && (
        <p className="mt-8 rounded-2xl border p-6 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          No open YLT Travels roles right now. Check back soon.
        </p>
      )}

      {open && (
        <div className="erp-overlay-enter erp-backdrop fixed inset-0 z-50 grid place-items-center p-4" onClick={() => !busy && setOpen(null)}>
          <form className="erp-modal-enter erp-modal-card w-full max-w-md space-y-3 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => void apply(e)}>
            <h3 className="font-display text-lg font-bold">Apply · {open.title}</h3>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className="w-full rounded-lg border px-3 py-2 text-sm" type="email" placeholder="Email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <textarea className="min-h-[80px] w-full rounded-lg border px-3 py-2 text-sm" placeholder="Cover note / resume summary (optional)" value={f.cover_note} onChange={(e) => setF({ ...f, cover_note: e.target.value })} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Resume <span className="text-crimson-700">*</span></span>
              <span className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">{resume ? resume.name : 'PDF, Word, or image'}</span>
                <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0], 'resume'); e.target.value = ''; }} />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">ID proof (Aadhaar / PAN / passport) <span className="text-crimson-700">*</span></span>
              <span className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">{idProof ? idProof.name : 'PDF, Word, or image'}</span>
                <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0], 'id'); e.target.value = ''; }} />
              </span>
            </label>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>PDF, JPG, PNG, WebP, DOC, or DOCX · max 6MB each.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost text-sm" disabled={busy} onClick={() => setOpen(null)}>Close</button>
              <button type="submit" className="btn-primary text-sm disabled:opacity-50" disabled={busy}><Send className="h-4 w-4" /> {busy ? 'Sending…' : 'Send'}</button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="erp-modal-card fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-lg" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
