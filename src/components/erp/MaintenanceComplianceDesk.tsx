import { useState } from 'react';
import { Wrench, ShieldCheck, Calendar, Plus, Trash2, AlertTriangle, FileText, Package } from 'lucide-react';
import { useErpStore, fmtINR, expiringCompliance, type ErpMaintenanceLog } from '../../store/erpStore';
import { Card, StatCard, Badge, Modal, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

const today = new Date().toISOString().slice(0, 10);

export default function MaintenanceComplianceDesk() {
  const { buses, maintenanceLogs, partReplacements, compliance, insert, remove, logAction, loading } = useErpStore();
  const [tab, setTab] = useState<'calendar' | 'logs' | 'parts' | 'compliance'>('calendar');
  const [addingLog, setAddingLog] = useState(false);
  const [addingPart, setAddingPart] = useState(false);

  if (loading && !buses.length) return <ErpLoader label="Loading maintenance desk…" />;

  const upcomingMaint = buses.filter((b) => b.next_maintenance && b.next_maintenance <= new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const expiringComp = expiringCompliance(compliance, 30);
  const totalMaintCost = maintenanceLogs.reduce((s, m) => s + m.cost, 0);
  const totalPartsCost = partReplacements.reduce((s, p) => s + p.total_cost, 0);

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={["Reliability", "Maintenance & Compliance Desk"]}
        title="Maintenance & Compliance Desk"
        description="Service logs, part replacements, permit & insurance tracking."
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Service Logs" value={String(maintenanceLogs.length)} icon={Wrench} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Parts Replaced" value={String(partReplacements.length)} icon={Package} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Upcoming Maint." value={String(upcomingMaint.length)} sub="Next 14 days" icon={Calendar} tone="amber" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Compliance Alerts" value={String(expiringComp.length)} sub="Expiring 30 days" icon={AlertTriangle} tone="amber" /></div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['calendar', 'logs', 'parts', 'compliance'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'calendar' ? 'Maintenance Calendar' : t === 'logs' ? 'Service Logs' : t === 'parts' ? 'Part Replacements' : 'Permit & Insurance'}</button>
        ))}
      </div>

      {tab === 'calendar' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Maintenance Calendar</h3>
          {upcomingMaint.length ? (
            <div className="space-y-2">
              {upcomingMaint.map((b) => {
                const overdue = b.next_maintenance! <= today;
                return (
                  <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    <Calendar className={`h-4 w-4 ${overdue ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Next maintenance: {b.next_maintenance}</p>
                    </div>
                    <Badge tone={overdue ? 'red' : 'amber'}>{overdue ? 'Overdue' : 'Due Soon'}</Badge>
                  </div>
                );
              })}
            </div>
          ) : <EmptyStateCard icon={Calendar} title="No upcoming maintenance" description="No maintenance scheduled in the next 14 days. All vehicles are on track." />}
        </Card>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total service cost: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(totalMaintCost)}</span></p>
            <RippleButton className="text-sm" onClick={() => setAddingLog(true)}><Plus className="h-4 w-4" /> Add Service Log</RippleButton>
          </div>
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Service Logs</h3>
            {maintenanceLogs.length ? (
              <div className="space-y-2">
                {maintenanceLogs.slice(0, 30).map((m) => {
                  const bus = buses.find((b) => b.id === m.bus_id);
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                      <Wrench className="h-4 w-4 text-amber-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.service_type} — {bus?.name ?? 'Unknown'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.service_date} · {m.service_center ?? '—'} {m.odometer_km ? `· ${m.odometer_km.toLocaleString('en-IN')} km` : ''}{m.description ? ` · ${m.description}` : ''}</p>
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(m.cost)}</span>
                      <button onClick={() => { remove('erp_maintenance_logs', m.id); logAction('delete_maint_log', 'erp_maintenance_logs', m.id); }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyStateCard icon={Wrench} title="No service logs" description="Record maintenance and repairs to track service history." ctaLabel="Add Service Log" onCta={() => setAddingLog(true)} />}
          </Card>
          {addingLog && <MaintLogModal buses={buses} onClose={() => setAddingLog(false)} onSave={async (d) => { await insert('erp_maintenance_logs', d); await logAction('add_maint_log', 'erp_maintenance_logs', '', d); setAddingLog(false); }} />}
        </div>
      )}

      {tab === 'parts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total parts cost: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(totalPartsCost)}</span></p>
            <RippleButton className="text-sm" onClick={() => setAddingPart(true)}><Plus className="h-4 w-4" /> Add Part</RippleButton>
          </div>
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Part Replacement History</h3>
            {partReplacements.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>{['Bus', 'Part', 'Qty', 'Unit Cost', 'Total', 'Date', 'Warranty'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {partReplacements.slice(0, 30).map((p) => {
                      const bus = buses.find((b) => b.id === p.bus_id);
                      return (
                        <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>{bus?.name ?? '—'}</td>
                          <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{p.part_name}</td>
                          <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{p.quantity}</td>
                          <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>₹{fmtINR(p.unit_cost)}</td>
                          <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(p.total_cost)}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{p.replaced_date}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{p.warranty_expiry ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <EmptyStateCard icon={Package} title="No parts replaced" description="Track part replacements with cost and warranty information." ctaLabel="Add Part" onCta={() => setAddingPart(true)} />}
          </Card>
          {addingPart && <PartModal buses={buses} onClose={() => setAddingPart(false)} onSave={async (d) => { await insert('erp_part_replacements', d); await logAction('add_part', 'erp_part_replacements', '', d); setAddingPart(false); }} />}
        </div>
      )}

      {tab === 'compliance' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Permit Expiry & Insurance Tracking</h3>
          {compliance.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>{['Bus', 'Document', 'Number', 'Issue', 'Expiry', 'Status'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {compliance.map((c) => {
                    const bus = buses.find((b) => b.id === c.bus_id);
                    const expired = c.expiry_date <= today;
                    const soon = c.expiry_date <= new Date(Date.now() + c.alert_days * 86400000).toISOString().slice(0, 10);
                    return (
                      <tr key={c.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>{bus?.name ?? '—'}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{c.doc_type}</td>
                        <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{c.doc_number ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{c.issue_date ?? '—'}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{c.expiry_date}</td>
                        <td className="px-3 py-2.5"><Badge tone={expired ? 'red' : soon ? 'amber' : 'green'}>{expired ? 'Expired' : soon ? 'Expiring' : 'Valid'}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyStateCard icon={ShieldCheck} title="No compliance records" description="Add permits and insurance documents to track expiry and compliance." />}
        </Card>
      )}
    </div>
  );
}

function MaintLogModal({ buses, onClose, onSave }: { buses: any[]; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ bus_id: buses[0]?.id ?? '', service_date: today, service_type: 'General Service', odometer_km: 0, cost: 0, service_center: '', description: '', next_service_date: '' });
  return (
    <Modal open onClose={onClose} title="Add Service Log">
      <div className="space-y-3">
        <Field label="Bus"><select className={inputCls} value={f.bus_id} onChange={(e) => setF({ ...f, bus_id: e.target.value })}>{buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Service Date"><input type="date" className={inputCls} value={f.service_date} onChange={(e) => setF({ ...f, service_date: e.target.value })} /></Field>
          <Field label="Service Type"><select className={inputCls} value={f.service_type} onChange={(e) => setF({ ...f, service_type: e.target.value })}><option>General Service</option><option>Oil Change</option><option>Tyre Replacement</option><option>Brake Service</option><option>Engine Repair</option><option>AC Service</option></select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Odometer (km)"><input type="number" className={inputCls} value={f.odometer_km} onChange={(e) => setF({ ...f, odometer_km: +e.target.value })} /></Field>
          <Field label="Cost (₹)"><input type="number" className={inputCls} value={f.cost} onChange={(e) => setF({ ...f, cost: +e.target.value })} /></Field>
        </div>
        <Field label="Service Center"><input className={inputCls} value={f.service_center} onChange={(e) => setF({ ...f, service_center: e.target.value })} /></Field>
        <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Next Service Date"><input type="date" className={inputCls} value={f.next_service_date} onChange={(e) => setF({ ...f, next_service_date: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave(f)}>Save</RippleButton>
        </div>
      </div>
    </Modal>
  );
}

function PartModal({ buses, onClose, onSave }: { buses: any[]; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ bus_id: buses[0]?.id ?? '', part_name: '', part_number: '', quantity: 1, unit_cost: 0, replaced_date: today, warranty_expiry: '', notes: '' });
  const total = f.quantity * f.unit_cost;
  return (
    <Modal open onClose={onClose} title="Add Part Replacement">
      <div className="space-y-3">
        <Field label="Bus"><select className={inputCls} value={f.bus_id} onChange={(e) => setF({ ...f, bus_id: e.target.value })}>{buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Part Name"><input className={inputCls} value={f.part_name} onChange={(e) => setF({ ...f, part_name: e.target.value })} /></Field>
          <Field label="Part Number"><input className={inputCls} value={f.part_number} onChange={(e) => setF({ ...f, part_number: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity"><input type="number" className={inputCls} value={f.quantity} onChange={(e) => setF({ ...f, quantity: +e.target.value })} /></Field>
          <Field label="Unit Cost (₹)"><input type="number" className={inputCls} value={f.unit_cost} onChange={(e) => setF({ ...f, unit_cost: +e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Replaced Date"><input type="date" className={inputCls} value={f.replaced_date} onChange={(e) => setF({ ...f, replaced_date: e.target.value })} /></Field>
          <Field label="Warranty Expiry"><input type="date" className={inputCls} value={f.warranty_expiry} onChange={(e) => setF({ ...f, warranty_expiry: e.target.value })} /></Field>
        </div>
        <div className="rounded-lg bg-[var(--bg-raised)] p-3 text-sm"><div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Total Cost:</span><span className="font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtINR(total)}</span></div></div>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave({ ...f, total_cost: total })}>Save</RippleButton>
        </div>
      </div>
    </Modal>
  );
}
