import { useState } from 'react';
import { Building2, Upload, FileText, Banknote, ShieldCheck, Save } from 'lucide-react';
import { useErpStore, type ErpPartnerProfile } from '../../store/erpStore';
import { Card, StatCard, Badge, ModuleHeader, Field, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

export default function PartnerProfileBranding() {
  const { profile, insert, update, logAction, loading } = useErpStore();
  const [tab, setTab] = useState<'company' | 'brand' | 'documents' | 'banking'>('company');
  const [saved, setSaved] = useState(false);

  if (loading && !profile) return <ErpLoader label="Loading profile…" />;

  const p = profile;
  const [f, setF] = useState({
    company_name: p?.company_name ?? '', legal_name: p?.legal_name ?? '', gst_number: p?.gst_number ?? '',
    pan_number: p?.pan_number ?? '', contact_email: p?.contact_email ?? '', contact_phone: p?.contact_phone ?? '',
    address: p?.address ?? '', city: p?.city ?? '', state: p?.state ?? '', pincode: p?.pincode ?? '',
    logo_url: p?.logo_url ?? '', brand_color: p?.brand_color ?? '#cd2c40', website_url: p?.website_url ?? '',
    description: p?.description ?? '', bank_name: p?.bank_name ?? '', bank_account_number: p?.bank_account_number ?? '',
    bank_ifsc: p?.bank_ifsc ?? '', bank_branch: p?.bank_branch ?? '', upi_id: p?.upi_id ?? '',
  });

  async function save() {
    if (profile) { await update('erp_partner_profile', profile.id, f); await logAction('update_profile', 'erp_partner_profile', profile.id, f); }
    else { await insert('erp_partner_profile', f); await logAction('create_profile', 'erp_partner_profile', '', f); }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={["Account", "Partner Profile & Branding"]}
        title="Partner Profile & Branding"
        description="Company details, brand assets, documents & settlement info."
        actions={<RippleButton className="text-sm" onClick={save}><Save className="h-4 w-4" /> {saved ? 'Saved!' : 'Save Profile'}</RippleButton>}
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Company" value={f.company_name || 'Not set'} icon={Building2} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="GST Number" value={f.gst_number || 'Not set'} icon={FileText} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Bank" value={f.bank_name || 'Not set'} icon={Banknote} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Brand Color" value={f.brand_color} icon={ShieldCheck} tone="amber" /></div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['company', 'brand', 'documents', 'banking'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'company' ? 'Company Profile' : t === 'brand' ? 'Brand Assets' : t === 'documents' ? 'Document Vault' : 'Banking & Settlement'}</button>
        ))}
      </div>

      {tab === 'company' && (
        <Card>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company Name"><input className={inputCls} value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></Field>
              <Field label="Legal Name"><input className={inputCls} value={f.legal_name} onChange={(e) => setF({ ...f, legal_name: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="GST Number"><input className={inputCls} value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value })} /></Field>
              <Field label="PAN Number"><input className={inputCls} value={f.pan_number} onChange={(e) => setF({ ...f, pan_number: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Email"><input className={inputCls} value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></Field>
              <Field label="Contact Phone"><input className={inputCls} value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></Field>
            </div>
            <Field label="Address"><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City"><input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
              <Field label="State"><input className={inputCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
              <Field label="Pincode"><input className={inputCls} value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value })} /></Field>
            </div>
            <Field label="Description"><textarea className={inputCls} rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          </div>
        </Card>
      )}

      {tab === 'brand' && (
        <Card>
          <div className="space-y-4">
            <Field label="Logo URL"><input className={inputCls} value={f.logo_url} onChange={(e) => setF({ ...f, logo_url: e.target.value })} placeholder="https://…" /></Field>
            {f.logo_url && <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}><img src={f.logo_url} alt="Logo preview" className="h-20 rounded-lg" /></div>}
            <Field label="Brand Color"><div className="flex items-center gap-3"><input type="color" className="h-10 w-16 rounded-lg border" style={{ borderColor: 'var(--border)' }} value={f.brand_color} onChange={(e) => setF({ ...f, brand_color: e.target.value })} /><input className={inputCls} value={f.brand_color} onChange={(e) => setF({ ...f, brand_color: e.target.value })} /></div></Field>
            <div className="rounded-xl p-4" style={{ backgroundColor: f.brand_color }}><p className="font-display text-lg font-bold text-white">Brand Preview — {f.company_name}</p></div>
            <Field label="Website URL"><input className={inputCls} value={f.website_url} onChange={(e) => setF({ ...f, website_url: e.target.value })} /></Field>
          </div>
        </Card>
      )}

      {tab === 'documents' && (
        <Card>
          <div className="space-y-3">
            {['GST Certificate', 'PAN Card', 'Business Registration', 'Insurance Certificate', 'Transport License'].map((doc) => (
              <div key={doc} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                <FileText className="h-5 w-5 text-crimson-500" />
                <div className="flex-1"><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{doc}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Upload required</p></div>
                <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--bg-raised)]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}><Upload className="h-3.5 w-3.5" /> Upload</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'banking' && (
        <Card>
          <div className="space-y-3">
            <Field label="Bank Name"><input className={inputCls} value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Account Number"><input className={inputCls} value={f.bank_account_number} onChange={(e) => setF({ ...f, bank_account_number: e.target.value })} /></Field>
              <Field label="IFSC Code"><input className={inputCls} value={f.bank_ifsc} onChange={(e) => setF({ ...f, bank_ifsc: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Branch"><input className={inputCls} value={f.bank_branch} onChange={(e) => setF({ ...f, bank_branch: e.target.value })} /></Field>
              <Field label="UPI ID"><input className={inputCls} value={f.upi_id} onChange={(e) => setF({ ...f, upi_id: e.target.value })} /></Field>
            </div>
          </div>
        </Card>
      )}


    </div>
  );
}
