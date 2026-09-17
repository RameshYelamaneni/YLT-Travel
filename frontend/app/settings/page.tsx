// app/settings/page.tsx
//
// App settings management page. Edits the single app_settings row (payment
// details, SMTP config, email toggle).

"use client";

import { useEffect, useState } from "react";
import { request } from "../../lib/api/client";
import type { AppSettings } from "../../lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const s = await request<AppSettings>("/settings");
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await request("/settings", { method: "POST", body: JSON.stringify(settings) });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading settings...</p>;
  if (!settings) return <p className="text-red-500">Failed to load settings.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">Settings saved.</div>}

      <Section title="Payment (UPI)">
        <Input label="UPI ID" value={settings.upiId || ""} onChange={(v) => setSettings({ ...settings, upiId: v })} />
        <Input label="UPI Name" value={settings.upiName || ""} onChange={(v) => setSettings({ ...settings, upiName: v })} />
        <Input label="UPI QR URL" value={settings.upiQrUrl || ""} onChange={(v) => setSettings({ ...settings, upiQrUrl: v })} />
      </Section>

      <Section title="Bank Details">
        <Input label="Bank Name" value={settings.bankName || ""} onChange={(v) => setSettings({ ...settings, bankName: v })} />
        <Input label="Account Name" value={settings.accountName || ""} onChange={(v) => setSettings({ ...settings, accountName: v })} />
        <Input label="Account Number" value={settings.accountNumber || ""} onChange={(v) => setSettings({ ...settings, accountNumber: v })} />
        <Input label="IFSC" value={settings.ifsc || ""} onChange={(v) => setSettings({ ...settings, ifsc: v })} />
        <Input label="Branch" value={settings.branch || ""} onChange={(v) => setSettings({ ...settings, branch: v })} />
      </Section>

      <Section title="SMTP / Email">
        <Input label="SMTP Host" value={settings.smtpHost || ""} onChange={(v) => setSettings({ ...settings, smtpHost: v })} />
        <Input label="SMTP Port" type="number" value={String(settings.smtpPort)} onChange={(v) => setSettings({ ...settings, smtpPort: parseInt(v) || 465 })} />
        <Input label="SMTP User" value={settings.smtpUser || ""} onChange={(v) => setSettings({ ...settings, smtpUser: v })} />
        <Input label="SMTP Password" type="password" value={settings.smtpPassword || ""} onChange={(v) => setSettings({ ...settings, smtpPassword: v })} />
        <Input label="From Email" value={settings.smtpFromEmail || ""} onChange={(v) => setSettings({ ...settings, smtpFromEmail: v })} />
        <Input label="From Name" value={settings.smtpFromName || ""} onChange={(v) => setSettings({ ...settings, smtpFromName: v })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.smtpSecure} onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })} />
          SMTP Secure (TLS)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.emailEnabled} onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })} />
          Email Enabled
        </label>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      <input className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
