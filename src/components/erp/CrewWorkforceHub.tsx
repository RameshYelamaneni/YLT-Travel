import { useState } from 'react';
import { Users, Plus, Phone, ShieldCheck, Calendar, Star, Trash2, AlertTriangle, Clock, UserCircle } from 'lucide-react';
import { useErpStore, fmtINR, expiringLicenses, crewSlaAverage, type ErpCrew } from '../../store/erpStore';
import { Card, StatCard, Badge, Modal, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

const today = new Date().toISOString().slice(0, 10);

export default function CrewWorkforceHub() {
  const store = useErpStore();
  const crew = Array.isArray(store.crew) ? store.crew : [];
  const crewDocuments = Array.isArray(store.crewDocuments) ? store.crewDocuments : [];
  const shifts = Array.isArray(store.shifts) ? store.shifts : [];
  const slaScores = Array.isArray(store.slaScores) ? store.slaScores : [];
  const buses = Array.isArray(store.buses) ? store.buses : [];
  const { insert, update, remove, logAction, loading } = store;
  const [tab, setTab] = useState<'profiles' | 'documents' | 'shifts' | 'sla'>('profiles');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ErpCrew | null>(null);
  const [addingShift, setAddingShift] = useState(false);

  if (loading && !crew.length) return <ErpLoader label="Loading crew data…" />;

  const drivers = crew.filter((c) => c.role === 'driver');
  const helpers = crew.filter((c) => c.role === 'helper' || c.role === 'cleaner');
  const expiring = expiringLicenses(crew);
  const avgSla = crewSlaAverage(slaScores);

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={['Bus', 'Crew']}
        title="Crew & Workforce Hub"
        description="Driver and helper profiles, license tracking, shift scheduling, and SLA performance."
        actions={<RippleButton className="text-sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add Crew Member</RippleButton>}
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Drivers" value={String(drivers.length)} sub={`${drivers.filter((d) => d.status === 'active').length} active`} icon={Users} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Helpers/Attendants" value={String(helpers.length)} icon={UserCircle} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="License Expiring" value={String(expiring.length)} sub="Next 30 days" icon={AlertTriangle} tone="amber" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Avg SLA Score" value={`${avgSla}%`} icon={Star} tone="green" /></div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['profiles', 'documents', 'shifts', 'sla'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'sla' ? 'SLA Performance' : t === 'profiles' ? 'Driver & Helper Profiles' : t === 'documents' ? 'License & Documents' : 'Shift Scheduling'}</button>
        ))}
      </div>

      {tab === 'profiles' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {crew.map((c) => {
              const bus = buses.find((b) => b.id === c.assigned_vehicle_id);
              const licExpiring = c.license_expiry && c.license_expiry <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
              return (
                <Card key={c.id}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-crimson-600 text-lg font-bold text-white">{c.name.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
                        <Badge tone={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
                      </div>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{c.role}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><Phone className="h-3 w-3" />{c.phone ?? '—'}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-raised)] px-2 py-1.5">
                      <ShieldCheck className={`h-3.5 w-3.5 ${licExpiring ? 'text-red-500' : 'text-emerald-500'}`} />
                      <span style={{ color: 'var(--text-muted)' }}>License:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.license_expiry ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-raised)] px-2 py-1.5">
                      <Calendar className="h-3.5 w-3.5 text-blue-500" />
                      <span style={{ color: 'var(--text-muted)' }}>Joined:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.joined_date}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Assigned: {bus?.name ?? 'Unassigned'}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditing(c)} className="text-xs font-medium text-crimson-600">Edit</button>
                      <button onClick={() => { remove('erp_crew', c.id); logAction('delete_crew', 'erp_crew', c.id); }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          {!crew.length && <EmptyStateCard icon={Users} title="No crew members yet" description="Add drivers, helpers, and cleaners to manage profiles, licenses, and shifts." ctaLabel="Add Crew Member" onCta={() => setAdding(true)} />}
        </div>
      )}

      {tab === 'documents' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>License & Document Tracking</h3>
          {crewDocuments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>{['Crew', 'Document', 'Number', 'Issue', 'Expiry', 'Verified'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {crewDocuments.map((d) => {
                    const member = crew.find((c) => c.id === d.crew_id);
                    const expired = d.expiry_date && d.expiry_date <= today;
                    return (
                      <tr key={d.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>{member?.name ?? d.crew_id}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{d.doc_type}</td>
                        <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{d.doc_number ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{d.issue_date ?? '—'}</td>
                        <td className="px-3 py-2.5"><Badge tone={expired ? 'red' : 'green'}>{d.expiry_date ?? '—'}</Badge></td>
                        <td className="px-3 py-2.5"><Badge tone={d.verified ? 'green' : 'amber'}>{d.verified ? 'Verified' : 'Pending'}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyStateCard icon={ShieldCheck} title="No documents tracked" description="Upload licenses and certifications to track expiry and verification status." />}
        </Card>
      )}

      {tab === 'shifts' && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Shift Scheduling</h3>
            {shifts.length ? (
              <div className="space-y-2">
                {shifts.slice(0, 30).map((s) => {
                  const member = crew.find((c) => c.id === s.crew_id);
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                      <Clock className="h-4 w-4 text-crimson-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{member?.name ?? 'Unknown'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.shift_date} · {s.start_time}–{s.end_time}</p>
                      </div>
                      <Badge tone={s.status === 'scheduled' ? 'blue' : s.status === 'completed' ? 'green' : 'amber'}>{s.status}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyStateCard icon={Calendar} title="No shifts scheduled" description="Assign crew members to shifts and track attendance." ctaLabel="Schedule Shift" onCta={() => setAddingShift(true)} />}
          </Card>
          {addingShift && <ShiftModal crew={crew} buses={buses} onClose={() => setAddingShift(false)} onSave={async (d) => { await insert('erp_shifts', d); await logAction('add_shift', 'erp_shifts', '', d); setAddingShift(false); }} />}
        </div>
      )}

      {tab === 'sla' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>SLA Performance Tracking</h3>
          {slaScores.length ? (
            <div className="space-y-2">
              {slaScores.map((s) => {
                const member = crew.find((c) => c.id === s.crew_id);
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    <Star className={`h-4 w-4 ${s.overall_score >= 80 ? 'text-emerald-500' : s.overall_score >= 60 ? 'text-amber-500' : 'text-red-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{member?.name ?? 'Unknown'} · {s.period}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>On-time: {s.on_time_pct}% · Rating: {s.customer_rating}/5 · Cancellations: {s.cancellation_count}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold" style={{ color: s.overall_score >= 80 ? '#059669' : s.overall_score >= 60 ? '#f59e0b' : '#ef4444' }}>{Math.round(s.overall_score)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyStateCard icon={Star} title="No SLA scores recorded" description="SLA performance metrics will appear here once trips are completed." />}
        </Card>
      )}

      {(adding || editing) && (
        <CrewForm crew={editing} onClose={() => { setAdding(false); setEditing(null); }} onSave={async (d) => {
          if (editing) { await update('erp_crew', editing.id, d); await logAction('update_crew', 'erp_crew', editing.id, d); }
          else { await insert('erp_crew', d); await logAction('add_crew', 'erp_crew', '', d); }
          setAdding(false); setEditing(null);
        }} />
      )}
    </div>
  );
}

function CrewForm({ crew, onClose, onSave }: { crew: ErpCrew | null; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({
    name: crew?.name ?? '', phone: crew?.phone ?? '', role: crew?.role ?? 'driver',
    license_number: crew?.license_number ?? '', license_expiry: crew?.license_expiry ?? '',
    assigned_vehicle_id: crew?.assigned_vehicle_id ?? '', status: crew?.status ?? 'active',
    address: crew?.address ?? '', emergency_contact: crew?.emergency_contact ?? '',
    salary: crew?.salary ?? 0, joined_date: crew?.joined_date ?? today,
  });
  return (
    <Modal open onClose={onClose} title={crew ? 'Edit Crew Member' : 'Add Crew Member'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role"><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="driver">Driver</option><option value="helper">Helper</option><option value="cleaner">Cleaner</option></select></Field>
          <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="active">Active</option><option value="off">Off</option><option value="leave">On Leave</option></select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="License Number"><input className={inputCls} value={f.license_number} onChange={(e) => setF({ ...f, license_number: e.target.value })} /></Field>
          <Field label="License Expiry"><input type="date" className={inputCls} value={f.license_expiry} onChange={(e) => setF({ ...f, license_expiry: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Salary (₹/month)"><input type="number" className={inputCls} value={f.salary} onChange={(e) => setF({ ...f, salary: +e.target.value })} /></Field>
          <Field label="Joined Date"><input type="date" className={inputCls} value={f.joined_date} onChange={(e) => setF({ ...f, joined_date: e.target.value })} /></Field>
        </div>
        <Field label="Address"><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <Field label="Emergency Contact"><input className={inputCls} value={f.emergency_contact} onChange={(e) => setF({ ...f, emergency_contact: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave(f)}>Save</RippleButton>
        </div>
      </div>
    </Modal>
  );
}

function ShiftModal({ crew, buses, onClose, onSave }: { crew: ErpCrew[]; buses: any[]; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ crew_id: crew[0]?.id ?? '', shift_date: today, start_time: '08:00', end_time: '18:00', bus_id: '', notes: '' });
  return (
    <Modal open onClose={onClose} title="Schedule Shift">
      <div className="space-y-3">
        <Field label="Crew Member"><select className={inputCls} value={f.crew_id} onChange={(e) => setF({ ...f, crew_id: e.target.value })}>{crew.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}</select></Field>
        <Field label="Date"><input type="date" className={inputCls} value={f.shift_date} onChange={(e) => setF({ ...f, shift_date: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Time"><input type="time" className={inputCls} value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></Field>
          <Field label="End Time"><input type="time" className={inputCls} value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} /></Field>
        </div>
        <Field label="Bus (optional)"><select className={inputCls} value={f.bus_id} onChange={(e) => setF({ ...f, bus_id: e.target.value })}><option value="">None</option>{buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Notes"><input className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave({ ...f, status: 'scheduled' })}>Schedule</RippleButton>
        </div>
      </div>
    </Modal>
  );
}
