import { useEffect, useState } from 'react';
import {
  Plus, Trash2, Pencil, Save, X, Image as ImageIcon, AlertCircle, Loader2, Check,
  Upload, User as UserIcon, Mail, Shield, Users, Send, Briefcase, Edit2, BadgeCheck,
  FolderOpen, Download, FileText, Folder, File as FileIcon, KeyRound, Copy, RefreshCw,
} from 'lucide-react';
import type { Director } from '../types';
import { fetchDirectors, saveDirector, deleteDirector } from '../lib/cms';
// Email templates are managed via the Hostinger PHP API (email-templates.php).
import { useNav } from '../store/nav';
import { useAuth } from '../lib/auth';
import LoginModal from './LoginModal';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

type Draft = { id: string; name: string; role: string; bio: string; image_url: string | null; linkedin_url: string | null; order_index: number };

type Tab = 'directors' | 'email' | 'partners' | 'employees' | 'templates' | 'files';

interface SmtpSettings {
  smtp_host: string; smtp_port: number; smtp_user: string; smtp_password: string;
  smtp_from_email: string; smtp_from_name: string; smtp_secure: boolean; email_enabled: boolean;
}

function blankDraft(): Draft {
  return { id: '', name: '', role: '', bio: '', image_url: null, linkedin_url: null, order_index: 0 };
}

export default function AdminPanel() {
  const { go } = useNav();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('directors');
  const [loginOpen, setLoginOpen] = useState(false);

  if (!user) {
    return (
      <div className="container-fluid py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-crimson-600/15 text-crimson-400"><UserIcon className="h-8 w-8" /></div>
          <h1 className="mt-4 font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Login Required</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in to manage the Board of Directors and email settings.</p>
          <button onClick={() => setLoginOpen(true)} className="btn-primary mt-6">Sign In</button>
        </div>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[var(--bg-page)]">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-[var(--bg-surface)] lg:flex lg:flex-col" style={{ borderColor: 'var(--border)' }}>
        <div className="flex h-16 items-center border-b px-4" style={{ borderColor: 'var(--border)' }}>
          <span className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Admin Panel</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <SideBtn active={tab === 'directors'} onClick={() => setTab('directors')} icon={<Users className="h-4 w-4" />} label="Directors" />
          <SideBtn active={tab === 'email'} onClick={() => setTab('email')} icon={<Mail className="h-4 w-4" />} label="Email & OTP" />
          <SideBtn active={tab === 'partners'} onClick={() => setTab('partners')} icon={<Briefcase className="h-4 w-4" />} label="Agent Partners" />
          <SideBtn active={tab === 'employees'} onClick={() => setTab('employees')} icon={<Shield className="h-4 w-4" />} label="Employees" />
          <SideBtn active={tab === 'templates'} onClick={() => setTab('templates')} icon={<Mail className="h-4 w-4" />} label="Email Templates" />
          <SideBtn active={tab === 'files'} onClick={() => setTab('files')} icon={<FolderOpen className="h-4 w-4" />} label="File Manager" />
        </nav>
      </aside>

      {/* Mobile tab strip */}
      <div className="flex w-full flex-col lg:hidden">
        <div className="flex items-center justify-between border-b bg-[var(--bg-surface)] px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <h1 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Admin Panel</h1>
        </div>
        <div className="flex gap-1 overflow-x-auto bg-[var(--bg-raised)] p-1">
          <TabBtn active={tab === 'directors'} onClick={() => setTab('directors')} icon={<Users className="h-4 w-4" />} label="Directors" />
          <TabBtn active={tab === 'email'} onClick={() => setTab('email')} icon={<Mail className="h-4 w-4" />} label="Email & OTP" />
          <TabBtn active={tab === 'partners'} onClick={() => setTab('partners')} icon={<Briefcase className="h-4 w-4" />} label="Partners" />
          <TabBtn active={tab === 'employees'} onClick={() => setTab('employees')} icon={<Shield className="h-4 w-4" />} label="Employees" />
          <TabBtn active={tab === 'templates'} onClick={() => setTab('templates')} icon={<Mail className="h-4 w-4" />} label="Templates" />
          <TabBtn active={tab === 'files'} onClick={() => setTab('files')} icon={<FolderOpen className="h-4 w-4" />} label="Files" />
        </div>
        <div className="container-fluid py-6">
          {tab === 'directors' && <DirectorsTab />}
          {tab === 'email' && <EmailTab />}
          {tab === 'partners' && <PartnersTab />}
          {tab === 'employees' && <EmployeesTab />}
          {tab === 'templates' && <EmailTemplatesTab />}
          {tab === 'files' && <FilesTab />}
        </div>
      </div>

      {/* Main content (desktop) */}
      <div className="hidden flex-1 lg:flex lg:flex-col">
        <div className="container-fluid py-6">
          {tab === 'directors' && <DirectorsTab />}
          {tab === 'email' && <EmailTab />}
          {tab === 'partners' && <PartnersTab />}
          {tab === 'employees' && <EmployeesTab />}
          {tab === 'templates' && <EmailTemplatesTab />}
          {tab === 'files' && <FilesTab />}
        </div>
      </div>
    </div>
  );
}

function SideBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-crimson-600/20 text-crimson-600' : 'hover:bg-[var(--bg-raised)]'}`} style={!active ? { color: 'var(--text-secondary)' } : undefined}>
      {icon} {label}
    </button>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${active ? 'bg-crimson-600 text-white' : 'hover:bg-[var(--bg-surface)]'}`} style={!active ? { color: 'var(--text-secondary)' } : undefined}>
      {icon} {label}
    </button>
  );
}

// ---------------- Directors tab ----------------

function DirectorsTab() {
  const [directors, setDirectors] = useState<Director[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setDirectors(await fetchDirectors());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startAdd() { setEditing(blankDraft()); setError(null); setSuccess(null); }
  function startEdit(d: Director) {
    setEditing({ id: d.id, name: d.name, role: d.role, bio: d.bio, image_url: d.image_url, linkedin_url: d.linkedin_url, order_index: d.order_index });
    setError(null); setSuccess(null);
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.role.trim()) { setError('Name and role are required.'); return; }
    setSaving(true); setError(null);
    const id = editing.id || crypto.randomUUID();
    const { error: e } = await saveDirector({ id, name: editing.name, role: editing.role, bio: editing.bio, image_url: editing.image_url, linkedin_url: editing.linkedin_url, order_index: editing.order_index });
    setSaving(false);
    if (e) { setError(e); return; }
    setSuccess('Director saved successfully.');
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    const { error: e } = await deleteDirector(id);
    if (e) { setError(e); return; }
    await load();
  }

  function handleFileUpload(file: File, cb: (dataUrl: string) => void) {
    if (file.size > 1.5 * 1024 * 1024) { setError('Image too large. Please use an image under 1.5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.onerror = () => setError('Could not read the image file.');
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Board of Directors — upload photo files or paste image URLs.</p>
        <button onClick={startAdd} className="btn-primary text-xs"><Plus className="h-4 w-4" /> Add Director</button>
      </div>

      {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {success && <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600"><Check className="h-4 w-4" /> {success}</div>}

      <div className="mt-6">
        {loading ? (
          <div className="surface p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
        ) : directors.length === 0 ? (
          <div className="surface p-8 text-center">
            <ImageIcon className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No directors yet. Click "Add Director" to create one.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {directors.map((d) => (
              <div key={d.id} className="surface-raised p-5">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--border)]">
                    {d.image_url ? <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center bg-[var(--bg-raised)]" style={{ color: 'var(--text-muted)' }}><ImageIcon className="h-6 w-6" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
                    <p className="text-xs text-crimson-600">{d.role}</p>
                    {d.bio && <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{d.bio}</p>}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => startEdit(d)} className="btn-ghost flex-1 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => remove(d.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-[var(--bg-surface)] shadow-card animate-scale-in" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editing.id ? 'Edit Director' : 'Add Director'}</h2>
              <button onClick={() => setEditing(null)} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--border)]">
                  {editing.image_url ? <img src={editing.image_url} alt="preview" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center bg-[var(--bg-raised)]" style={{ color: 'var(--text-muted)' }}><ImageIcon className="h-7 w-7" /></div>}
                </div>
                <div className="flex-1">
                  <label className="label-text flex items-center gap-1.5"><ImageIcon className="h-3 w-3" /> Photo</label>
                  <div className="mt-1.5 flex gap-2">
                    <label className="btn-ghost flex-1 cursor-pointer text-xs">
                      <Upload className="h-3.5 w-3.5" /> Upload File
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, (dataUrl) => setEditing({ ...editing, image_url: dataUrl })); }} />
                    </label>
                    {editing.image_url && <button onClick={() => setEditing({ ...editing, image_url: null })} className="btn-ghost text-xs"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                  <input className="input-field mt-2 text-xs" value={editing.image_url ?? ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value || null })} placeholder="Or paste an image URL (https://...)" />
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Upload a photo file (stored as base64) or paste a hosted image URL.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="label-text">Name</span><input className="input-field mt-1.5" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
                <label className="block"><span className="label-text">Role</span><input className="input-field mt-1.5" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} /></label>
              </div>
              <label className="block"><span className="label-text">Bio</span><textarea className="input-field mt-1.5" rows={3} value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="label-text">LinkedIn URL</span><input className="input-field mt-1.5" value={editing.linkedin_url ?? ''} onChange={(e) => setEditing({ ...editing, linkedin_url: e.target.value || null })} placeholder="https://linkedin.com/in/..." /></label>
                <label className="block"><span className="label-text">Display Order</span><input type="number" className="input-field mt-1.5" value={editing.order_index} onChange={(e) => setEditing({ ...editing, order_index: +e.target.value })} /></label>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={save} disabled={saving} className="btn-primary w-full disabled:opacity-40">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Director
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------- Email & OTP tab ----------------

function EmailTab() {
  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/app-settings.php`);
      const data = await res.json();
      setSettings(data);
    } catch { setError('Could not load settings.'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${API}/app-settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Save failed.'); }
      else { setSuccess('Email settings saved.'); setSettings(data); }
    } catch { setError('Network error.'); }
    setSaving(false);
  }

  async function sendTest() {
    setTesting(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${API}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_smtp', to: testEmail || settings?.smtp_user || '' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Test failed.'); }
      else { setSuccess('Test email sent. Check your inbox.'); }
    } catch { setError('Network error.'); }
    setTesting(false);
  }

  if (loading) return <div className="surface p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;
  if (!settings) return <div className="surface p-8 text-center text-sm text-red-500">Could not load email settings.</div>;

  const s = settings;
  const set = (patch: Partial<SmtpSettings>) => setSettings({ ...s, ...patch });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}><Mail className="h-5 w-5 text-crimson-600" /> SMTP Configuration</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={s.email_enabled} onChange={(e) => set({ email_enabled: e.target.checked })} className="h-4 w-4 accent-crimson-500" />
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Email enabled</span>
          </label>
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>When enabled, OTP login emails and booking confirmation tickets (with PDF) are sent through this SMTP server.</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="block"><span className="label-text">SMTP Host</span><input className="input-field mt-1.5 text-sm" value={s.smtp_host} onChange={(e) => set({ smtp_host: e.target.value })} placeholder="smtp.hostinger.com" /></label>
          <label className="block"><span className="label-text">Port</span><input type="number" className="input-field mt-1.5 text-sm" value={s.smtp_port} onChange={(e) => set({ smtp_port: +e.target.value })} placeholder="465" /></label>
          <label className="block"><span className="label-text">Username</span><input className="input-field mt-1.5 text-sm" value={s.smtp_user} onChange={(e) => set({ smtp_user: e.target.value })} placeholder="no-reply@ylttravels.com" /></label>
          <label className="block"><span className="label-text">Password</span><input type="password" className="input-field mt-1.5 text-sm" value={s.smtp_password} onChange={(e) => set({ smtp_password: e.target.value })} placeholder="••••••••" /></label>
          <label className="block"><span className="label-text">From Email</span><input className="input-field mt-1.5 text-sm" value={s.smtp_from_email} onChange={(e) => set({ smtp_from_email: e.target.value })} placeholder="no-reply@ylttravels.com" /></label>
          <label className="block"><span className="label-text">From Name</span><input className="input-field mt-1.5 text-sm" value={s.smtp_from_name} onChange={(e) => set({ smtp_from_name: e.target.value })} placeholder="YLT Travels" /></label>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={s.smtp_secure} onChange={(e) => set({ smtp_secure: e.target.checked })} className="h-4 w-4 accent-crimson-500" />
          Use SSL/TLS (uncheck for STARTTLS on port 587)
        </label>

        {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"><AlertCircle className="h-4 w-4" /> {error}</div>}
        {success && <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600"><Check className="h-4 w-4" /> {success}</div>}

        <button onClick={saveSettings} disabled={saving} className="btn-primary mt-5 text-xs disabled:opacity-40">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
        </button>
      </div>

      <div className="surface p-6">
        <h3 className="flex items-center gap-2 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}><Send className="h-4 w-4 text-emerald-500" /> Send Test Email</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Verify your SMTP config works before enabling OTP login.</p>
        <label className="mt-4 block"><span className="label-text">Send to</span><input type="email" className="input-field mt-1.5 text-sm" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" /></label>
        <button onClick={sendTest} disabled={testing || !s.email_enabled} className="btn-ghost mt-4 w-full text-xs disabled:opacity-40">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Test Email
        </button>
        {!s.email_enabled && <p className="mt-2 text-xs text-amber-600">Enable email in the settings to send tests.</p>}

        <div className="divider my-5" />
        <div className="rounded-lg border bg-[var(--bg-raised)] p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}><Shield className="h-3.5 w-3.5 text-crimson-600" /> OTP Login Status</p>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {s.email_enabled && s.smtp_password
              ? <span className="text-emerald-600">Active — customers can log in with email OTP.</span>
              : <span className="text-amber-600">Disabled — configure SMTP and enable email to activate OTP login.</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

interface Partner {
  id: string; email: string; name: string; agency_name: string | null;
  phone: string | null; city: string | null; status: string; commission_rate: number; created_at: string;
}

function PartnersTab() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ email: '', password: '', name: '', agency_name: '', phone: '', city: '', commission_rate: 0.08 });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'partners_list' }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Load failed.'); }
      else { setPartners(data.partners ?? []); }
    } catch { setError('Network error.'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!draft.email || !draft.password || !draft.name) { setError('Email, password, and name are required.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'partner_create', ...draft }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Create failed.'); }
      else { setShowAdd(false); setDraft({ email: '', password: '', name: '', agency_name: '', phone: '', city: '', commission_rate: 0.08 }); load(); }
    } catch { setError('Network error.'); }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this agent partner?')) return;
    try {
      await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'partner_delete', id }) });
      load();
    } catch { setError('Network error.'); }
  }

  async function toggleStatus(p: Partner) {
    const next = p.status === 'active' ? 'suspended' : 'active';
    try {
      await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'partner_update', id: p.id, status: next }) });
      load();
    } catch { setError('Network error.'); }
  }

  if (loading) return <div className="surface p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}><Briefcase className="h-5 w-5 text-crimson-600" /> Agent Partners</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Create and manage agents who can log into the Operator ERP portal.</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-xs"><Plus className="h-4 w-4" /> Add Partner</button>
        </div>
        {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"><AlertCircle className="h-4 w-4" /> {error}</div>}
        <div className="mt-5 overflow-x-auto">
          {partners.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No partners yet. Click "Add Partner" to create one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="pb-3 pr-4 font-medium">Name</th><th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Agency</th><th className="pb-3 pr-4 font-medium">City</th>
                <th className="pb-3 pr-4 font-medium">Comm.</th><th className="pb-3 pr-4 font-medium">Status</th><th className="pb-3 font-medium"></th>
              </tr></thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{p.agency_name ?? '—'}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{p.city ?? '—'}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{(p.commission_rate * 100).toFixed(0)}%</td>
                    <td className="py-3 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs ${p.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>{p.status}</span></td>
                    <td className="py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => toggleStatus(p)} className="rounded-lg p-1.5 transition hover:bg-[var(--bg-raised)]" title={p.status === 'active' ? 'Suspend' : 'Activate'} style={{ color: 'var(--text-muted)' }}><Shield className="h-4 w-4" /></button>
                        <button onClick={() => remove(p.id)} className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Agent Partner</h3>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block"><span className="label-text">Name *</span><input className="input-field mt-1.5 text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ramesh Kumar" /></label>
              <label className="block"><span className="label-text">Email *</span><input type="email" className="input-field mt-1.5 text-sm" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="agent@ylttravels.com" /></label>
              <label className="block"><span className="label-text">Password *</span><input type="password" className="input-field mt-1.5 text-sm" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder="Min 6 characters" /></label>
              <label className="block"><span className="label-text">Agency Name</span><input className="input-field mt-1.5 text-sm" value={draft.agency_name} onChange={(e) => setDraft({ ...draft, agency_name: e.target.value })} placeholder="YLT Travels" /></label>
              <label className="block"><span className="label-text">Phone</span><input className="input-field mt-1.5 text-sm" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="9876543210" /></label>
              <label className="block"><span className="label-text">City</span><input className="input-field mt-1.5 text-sm" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Hyderabad" /></label>
              <label className="block"><span className="label-text">Commission Rate</span><input type="number" step="0.01" className="input-field mt-1.5 text-sm" value={draft.commission_rate} onChange={(e) => setDraft({ ...draft, commission_rate: +e.target.value })} placeholder="0.08" /></label>
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button onClick={create} disabled={saving} className="btn-primary mt-5 w-full text-sm disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Partner</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Employees tab ----------------

interface Employee {
  id: string; email: string; name: string; role: string; phone: string | null; status: string; created_at: string;
}

function genPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let out = '';
  const arr = new Uint32Array(len);
  (window.crypto || { getRandomValues: (a: any) => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 4294967296); return a; } }).getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ email: '', password: '', name: '', role: 'operator', phone: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetEmp, setResetEmp] = useState<Employee | null>(null);
  const [resetPass, setResetPass] = useState('');
  const [resetCopied, setResetCopied] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'employees_list' }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Load failed.'); }
      else { setEmployees(data.employees ?? []); }
    } catch { setError('Network error.'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() {
    setDraft({ email: '', password: genPassword(), name: '', role: 'operator', phone: '' });
    setCopied(false);
    setShowAdd(true);
  }

  async function create() {
    if (!draft.email || !draft.password || !draft.name) { setError('Email, password, and name are required.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'employee_create', ...draft }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Create failed.'); }
      else { setShowAdd(false); setDraft({ email: '', password: '', name: '', role: 'operator', phone: '' }); load(); }
    } catch { setError('Network error.'); }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this employee?')) return;
    try {
      await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'employee_delete', id }) });
      load();
    } catch { setError('Network error.'); }
  }

  function openReset(emp: Employee) {
    setResetEmp(emp);
    setResetPass(genPassword());
    setResetCopied(false);
  }

  async function doReset() {
    if (!resetEmp || !resetPass) return;
    setResetSaving(true);
    try {
      const res = await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'employee_reset_password', id: resetEmp.id, password: resetPass }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Reset failed.'); }
      else { setResetEmp(null); }
    } catch { setError('Network error.'); }
    setResetSaving(false);
  }

  if (loading) return <div className="surface p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}><Shield className="h-5 w-5 text-crimson-600" /> Employees</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Create YLT internal staff (admin, operator, manager) who can log in via the Admin tab. Passwords are auto-generated by the system.</p>
          </div>
          <button onClick={openAdd} className="btn-primary text-xs"><Plus className="h-4 w-4" /> Add Employee</button>
        </div>
        {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"><AlertCircle className="h-4 w-4" /> {error}</div>}
        <div className="mt-5 overflow-x-auto">
          {employees.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No employees yet. Click "Add Employee" to create one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="pb-3 pr-4 font-medium">Name</th><th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Role</th><th className="pb-3 pr-4 font-medium">Phone</th>
                <th className="pb-3 pr-4 font-medium">Status</th><th className="pb-3 font-medium"></th>
              </tr></thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-primary)' }}>{e.name}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{e.email}</td>
                    <td className="py-3 pr-4"><span className="rounded-full bg-crimson-600/15 px-2 py-0.5 text-xs text-crimson-600">{e.role}</span></td>
                    <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{e.phone ?? '—'}</td>
                    <td className="py-3 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs ${e.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>{e.status}</span></td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openReset(e)} title="Reset password" className="rounded-lg p-1.5 text-crimson-600 transition hover:bg-crimson-600/10"><KeyRound className="h-4 w-4" /></button>
                        <button onClick={() => remove(e.id)} title="Delete" className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Employee</h3>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block"><span className="label-text">Name *</span><input className="input-field mt-1.5 text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" /></label>
              <label className="block"><span className="label-text">Email *</span><input type="email" className="input-field mt-1.5 text-sm" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="staff@ylttravels.com" /></label>
              <label className="block col-span-2">
                <span className="label-text">Generated Password *</span>
                <div className="mt-1.5 flex gap-2">
                  <input readOnly className="input-field flex-1 font-mono text-sm" value={draft.password} />
                  <button type="button" onClick={() => setDraft({ ...draft, password: genPassword() })} title="Regenerate" className="btn-ghost shrink-0 text-sm"><RefreshCw className="h-4 w-4" /></button>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(draft.password); setCopied(true); setTimeout(() => setCopied(false), 1500); }} title="Copy" className="btn-ghost shrink-0 text-sm">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Share this password with the employee. It will not be shown again.</p>
              </label>
              <label className="block"><span className="label-text">Role</span>
                <select className="input-field mt-1.5 text-sm" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                  <option value="marketing">Marketing</option>
                  <option value="operator">Operator</option>
                  <option value="manager">Manager</option>
                </select>
              </label>
              <label className="block"><span className="label-text">Phone</span><input className="input-field mt-1.5 text-sm" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="9876543210" /></label>
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button onClick={create} disabled={saving} className="btn-primary mt-5 w-full text-sm disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Employee</button>
          </div>
        </div>
      )}

      {resetEmp && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setResetEmp(null)}>
          <div className="w-full max-w-md rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Reset Password</h3>
              <button onClick={() => setResetEmp(null)} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Set a new password for <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{resetEmp.name}</span> ({resetEmp.email}).</p>
            <label className="mt-4 block">
              <span className="label-text">New Generated Password</span>
              <div className="mt-1.5 flex gap-2">
                <input readOnly className="input-field flex-1 font-mono text-sm" value={resetPass} />
                <button type="button" onClick={() => setResetPass(genPassword())} title="Regenerate" className="btn-ghost shrink-0 text-sm"><RefreshCw className="h-4 w-4" /></button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(resetPass); setResetCopied(true); setTimeout(() => setResetCopied(false), 1500); }} title="Copy" className="btn-ghost shrink-0 text-sm">{resetCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Share this new password with the employee.</p>
            </label>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button onClick={doReset} disabled={resetSaving} className="btn-primary mt-5 w-full text-sm disabled:opacity-40">{resetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Reset Password</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Email Templates tab ----------------

interface EmailTemplate {
  id: string; key: string; name: string; description: string; subject: string; body_html: string;
  available_variables: string[]; is_active: boolean; updated_at: string;
}

function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/email-templates.php`);
      const rows = await res.json();
      if (!res.ok || rows.error) { setError(rows.error ?? 'Load failed.'); setTemplates([]); }
      else if (Array.isArray(rows)) {
        setTemplates(rows.map((r: any) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description ?? '',
          subject: r.subject,
          body_html: r.body_html,
          available_variables: Array.isArray(r.available_variables) ? r.available_variables : [],
          is_active: !!r.is_active,
          updated_at: r.updated_at,
        })));
      }
    } catch { setError('Network error.'); setTemplates([]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API}/email-templates.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: editing.id,
          name: editing.name,
          description: editing.description,
          subject: editing.subject,
          body_html: editing.body_html,
          is_active: editing.is_active,
        }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok || data.error) { setError(data.error ?? 'Save failed.'); return; }
      setEditing(null);
      load();
    } catch { setSaving(false); setError('Network error.'); }
  }

  if (loading) return <div className="surface p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}><Mail className="h-5 w-5 text-crimson-600" /> Email Templates</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Edit the subject and HTML body for each email type. Use <code className="rounded bg-[var(--bg-raised)] px-1 py-0.5 text-crimson-600">{'{{variable}}'}</code> placeholders for dynamic data. Changes apply immediately to all outgoing emails.</p>
        {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"><AlertCircle className="h-4 w-4" /> {error}</div>}

        <div className="mt-5 space-y-3">
          {templates.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No email templates found. Run database setup to seed defaults.</p>
          ) : templates.map((t) => (
            <div key={t.id} className="rounded-xl border bg-[var(--bg-raised)] p-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${t.is_active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>{t.is_active ? 'Active' : 'Disabled'}</span>
                    <code className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-crimson-600">{t.key}</code>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Subject: <span style={{ color: 'var(--text-secondary)' }}>{t.subject}</span></p>
                  {t.available_variables && t.available_variables.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.available_variables.map((v) => (
                        <span key={v} className="rounded-md bg-crimson-600/10 px-1.5 py-0.5 text-[10px] font-medium text-crimson-600">{'{{' + v + '}}'}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setEditing({ ...t })} className="btn-ghost text-xs"><Edit2 className="h-3.5 w-3.5" /> Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Edit Template</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{editing.key} · Last updated {new Date(editing.updated_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setEditing(null)} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block"><span className="label-text">Template Name</span><input className="input-field mt-1.5 text-sm" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <label className="block"><span className="label-text">Description</span><input className="input-field mt-1.5 text-sm" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
              <label className="block"><span className="label-text">Subject Line</span><input className="input-field mt-1.5 text-sm" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></label>
              {editing.available_variables && editing.available_variables.length > 0 && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-3">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Available Variables (insert in subject or body as {'{{variable}}'}):</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {editing.available_variables.map((v) => (
                      <button key={v} onClick={() => setEditing({ ...editing, body_html: editing.body_html + '{{' + v + '}}' })} className="rounded-md bg-crimson-600/10 px-2 py-1 text-xs font-medium text-crimson-600 transition hover:bg-crimson-600/20">{'{{' + v + '}}'}</button>
                    ))}
                  </div>
                </div>
              )}
              <label className="block"><span className="label-text">HTML Body</span><textarea rows={14} className="input-field mt-1.5 font-mono text-xs" value={editing.body_html} onChange={(e) => setEditing({ ...editing, body_html: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Active (inactive templates won't be used for sending)
              </label>
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Template</button>
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- File Manager tab ----------------

interface EmpFile {
  id: string; uploaded_by_email: string; uploaded_by_name: string;
  filename: string; mime_type: string; size_bytes: number;
  folder: string; description: string; created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', sales: 'Sales', support: 'Support', marketing: 'Marketing', operator: 'Operator', manager: 'Manager',
};

function FilesTab() {
  const { user } = useAuth();
  const [files, setFiles] = useState<EmpFile[]>([]);
  const [folders, setFolders] = useState<{ folder: string; count: number; size: string }[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [draft, setDraft] = useState({ filename: '', mime_type: '', size_bytes: 0, folder: 'General', description: '', file_data: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [filesRes, foldersRes] = await Promise.all([
        fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'files_list', folder: activeFolder }) }),
        fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'files_folders' }) }),
      ]);
      const fData = await filesRes.json();
      const foData = await foldersRes.json();
      if (!filesRes.ok || fData.error) { setError(fData.error ?? 'Load failed.'); }
      else { setFiles(fData.files ?? []); }
      if (foldersRes.ok && foData.folders) {
        setFolders(foData.folders.map((f: any) => ({ folder: f.folder, count: Number(f.count), size: formatSize(Number(f.size)) })));
      }
    } catch { setError('Network error.'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [activeFolder]);

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { setError('File too large. Max 6MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      setDraft({ ...draft, filename: file.name, mime_type: file.type || 'application/octet-stream', size_bytes: file.size, file_data: base64 });
    };
    reader.readAsDataURL(file);
  }

  async function upload() {
    if (!draft.filename || !draft.file_data) { setError('Choose a file first.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'file_upload', ...draft, uploaded_by_email: user?.email ?? '', uploaded_by_name: user?.name ?? '' }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Upload failed.'); }
      else { setShowUpload(false); setDraft({ filename: '', mime_type: '', size_bytes: 0, folder: 'General', description: '', file_data: '' }); load(); }
    } catch { setError('Network error.'); }
    setSaving(false);
  }

  async function download(f: EmpFile) {
    try {
      const res = await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'file_download', id: f.id }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Download failed.'); return; }
      const link = document.createElement('a');
      link.href = `data:${data.mime_type};base64,${data.file_data}`;
      link.download = data.filename;
      link.click();
    } catch { setError('Network error.'); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this file?')) return;
    try {
      await fetch(`${API}/auth.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'file_delete', id }) });
      load();
    } catch { setError('Network error.'); }
  }

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}><FolderOpen className="h-5 w-5 text-crimson-600" /> File Manager</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Shared file storage for all YLT employees. Upload, organize into folders, download, and delete files.</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary text-xs"><Upload className="h-4 w-4" /> Upload File</button>
        </div>
        {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"><AlertCircle className="h-4 w-4" /> {error}</div>}

        {/* Folder sidebar */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[200px_1fr]">
          <div className="space-y-1.5">
            <button onClick={() => setActiveFolder('')} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${activeFolder === '' ? 'bg-crimson-600/20 text-crimson-600' : 'hover:bg-[var(--bg-raised)]'}`} style={activeFolder === '' ? undefined : { color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-2"><FolderOpen className="h-4 w-4" /> All Files</span>
            </button>
            {folders.map((f) => (
              <button key={f.folder} onClick={() => setActiveFolder(f.folder)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${activeFolder === f.folder ? 'bg-crimson-600/20 text-crimson-600' : 'hover:bg-[var(--bg-raised)]'}`} style={activeFolder === f.folder ? undefined : { color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-2 truncate"><Folder className="h-4 w-4" /> {f.folder}</span>
                <span className="text-[10px] opacity-70">{f.count}</span>
              </button>
            ))}
          </div>

          <div>
            {loading ? (
              <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
            ) : files.length === 0 ? (
              <div className="grid place-items-center py-12 text-center">
                <FileIcon className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
                <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No files {activeFolder ? 'in this folder' : 'uploaded yet'}.</p>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {files.map((f) => (
                  <div key={f.id} className="group rounded-xl border bg-[var(--bg-raised)] p-4 transition hover:border-crimson-500/30" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-crimson-600/10 text-crimson-600"><FileText className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.filename}</p>
                        <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatSize(f.size_bytes)} · {f.mime_type.split('/')[1]?.toUpperCase() ?? 'FILE'}</p>
                        <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.folder} · {new Date(f.created_at).toLocaleDateString()}</p>
                        {f.uploaded_by_name && <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>by {f.uploaded_by_name}</p>}
                      </div>
                    </div>
                    {f.description && <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{f.description}</p>}
                    <div className="mt-3 flex gap-1.5">
                      <button onClick={() => download(f)} className="btn-ghost flex-1 text-xs"><Download className="h-3.5 w-3.5" /> Download</button>
                      <button onClick={() => remove(f.id)} className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowUpload(false)}>
          <div className="w-full max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Upload File</h3>
              <button onClick={() => setShowUpload(false)} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="label-text">File (max 6MB)</span>
                <input type="file" onChange={onFilePicked} className="mt-1.5 block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-crimson-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white" />
              </label>
              {draft.filename && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Selected: {draft.filename} ({formatSize(draft.size_bytes)})</p>}
              <label className="block"><span className="label-text">Folder</span><input className="input-field mt-1.5 text-sm" value={draft.folder} onChange={(e) => setDraft({ ...draft, folder: e.target.value })} placeholder="General" /></label>
              <label className="block"><span className="label-text">Description (optional)</span><input className="input-field mt-1.5 text-sm" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What is this file?" /></label>
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button onClick={upload} disabled={saving || !draft.file_data} className="btn-primary mt-5 w-full text-sm disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
