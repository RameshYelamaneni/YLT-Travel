import { useState } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { uploadPartnerImage } from '../../lib/partnerMedia';

const inputCls = 'w-full rounded-lg border bg-[var(--bg-raised)] px-3 py-2 text-sm outline-none focus:border-crimson-500';

export function PhotoField({
  label,
  url,
  onChange,
}: {
  label: string;
  url: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      onChange(await uploadPartnerImage(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-start gap-3">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)' }}>
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (
            <div className="grid h-full place-items-center" style={{ color: 'var(--text-muted)' }}><ImageIcon className="h-6 w-6" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex gap-2">
            <label className="btn-ghost cursor-pointer text-xs">
              <Upload className="h-3.5 w-3.5" /> {busy ? 'Uploading…' : 'Upload'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void onFile(f); }} />
            </label>
            {url && <button type="button" className="btn-ghost text-xs" onClick={() => onChange('')}><Trash2 className="h-3.5 w-3.5" /></button>}
          </div>
          <input className={inputCls + ' text-xs'} value={url} onChange={(e) => onChange(e.target.value)} placeholder="Or paste https://…" />
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>JPG, PNG, or WebP · max 6MB. Saved to your partner folder.</p>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
      </div>
    </div>
  );
}

export function GalleryField({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paste, setPaste] = useState('');

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true); setErr(null);
    try {
      const next = [...urls];
      for (const file of Array.from(list).slice(0, 8)) {
        next.push(await uploadPartnerImage(file));
      }
      onChange(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  function addPaste() {
    const u = paste.trim();
    if (!u) return;
    if (u.startsWith('data:')) { setErr('Paste a public URL, or upload the file.'); return; }
    onChange([...urls, u]);
    setPaste('');
    setErr(null);
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Gallery (optional)</span>
      {urls.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <div key={`${u}-${i}`} className="relative h-16 w-16 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button type="button" className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white" onClick={() => onChange(urls.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="btn-ghost cursor-pointer text-xs">
          <Upload className="h-3.5 w-3.5" /> {busy ? 'Uploading…' : 'Add photos'}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={busy} onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
        </label>
      </div>
      <div className="mt-1.5 flex gap-2">
        <input className={inputCls + ' text-xs'} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Or paste a photo URL" />
        <button type="button" className="btn-ghost shrink-0 text-xs" onClick={addPaste}>Add URL</button>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
