import { useState } from 'react';
import { Shield, Key, History, Monitor, Plus, Trash2, Eye, EyeOff, Copy, Lock } from 'lucide-react';
import { useErpStore, type ErpRole } from '../../store/erpStore';
import { Card, StatCard, Badge, Modal, Field, ModuleHeader, EmptyStateCard, inputCls } from './ui';
import { RippleButton } from '../operator/RippleButton';
import { ErpLoader } from '../operator/ErpLoader';

export default function AccessSecurity() {
  const { roles, auditLogs, apiKeys, insert, remove, update, logAction, loading } = useErpStore();
  const [tab, setTab] = useState<'roles' | 'audit' | 'sessions' | 'apikeys'>('roles');
  const [addingRole, setAddingRole] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);

  if (loading && !roles.length) return <ErpLoader label="Loading security…" />;

  const totalUsers = roles.reduce((s, r) => s + r.user_count, 0);
  const activeKeys = apiKeys.filter((k) => k.status === 'active').length;

  return (
    <div className="space-y-5">
      <ModuleHeader
        breadcrumb={["Account", "Access & Security"]}
        title="Access & Security"
        description="Role-based access, audit logs, session monitoring & API keys."
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Roles Defined" value={String(roles.length)} icon={Shield} tone="crimson" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Total Users" value={String(totalUsers)} icon={Monitor} tone="blue" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Audit Events" value={String(auditLogs.length)} icon={History} tone="green" /></div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3"><StatCard label="Active API Keys" value={String(activeKeys)} icon={Key} tone="amber" /></div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['roles', 'audit', 'sessions', 'apikeys'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-crimson-500 text-crimson-600' : ''}`}
            style={tab === t ? undefined : { color: 'var(--text-muted)' }}>{t === 'roles' ? 'Role-based Access' : t === 'audit' ? 'Audit Logs' : t === 'sessions' ? 'Session Monitoring' : 'API Keys'}</button>
        ))}
      </div>

      {tab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <RippleButton className="text-sm" onClick={() => setAddingRole(true)}><Plus className="h-4 w-4" /> Add Role</RippleButton>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-crimson-500" />
                    <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{r.role_name}</h3>
                  </div>
                  <Badge tone="blue">{r.user_count} users</Badge>
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{r.description ?? 'No description'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(r.permissions as string[]).map((p) => <span key={p} className="rounded-md bg-crimson-500/10 px-2 py-0.5 text-[11px] font-medium text-crimson-600">{p}</span>)}
                </div>
                <div className="mt-3 flex justify-end border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => { remove('erp_roles', r.id); logAction('delete_role', 'erp_roles', r.id); }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </Card>
            ))}
          </div>
          {!roles.length && <EmptyStateCard icon={Shield} title="No roles defined" description="Create roles to manage access permissions for your team members." ctaLabel="Add Role" onCta={() => setAddingRole(true)} />}
          {addingRole && <RoleModal onClose={() => setAddingRole(false)} onSave={async (d) => { await insert('erp_roles', d); await logAction('add_role', 'erp_roles', '', d); setAddingRole(false); }} />}
        </div>
      )}

      {tab === 'audit' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Audit Logs</h3>
          {auditLogs.length ? (
            <div className="space-y-2">
              {auditLogs.slice(0, 50).map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <History className="h-4 w-4 text-crimson-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{log.action}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.entity_type ?? ''} · {log.user_name ?? 'System'} ({log.user_role ?? '—'}) · {new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  {log.entity_id && <Badge tone="gray">{log.entity_id.slice(0, 8)}</Badge>}
                </div>
              ))}
            </div>
          ) : <EmptyStateCard icon={History} title="No audit events" description="Audit logs will appear here as actions are performed across the system." />}
        </Card>
      )}

      {tab === 'sessions' && (
        <Card>
          <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>Session Monitoring</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
              <Monitor className="h-4 w-4 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Partner Admin</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active session · Started: {new Date().toLocaleString()}</p>
              </div>
              <Badge tone="green">Active</Badge>
            </div>
            <p className="px-2 text-xs" style={{ color: 'var(--text-muted)' }}>Session monitoring tracks all active logins and their activity in real-time.</p>
          </div>
        </Card>
      )}

      {tab === 'apikeys' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <RippleButton className="text-sm" onClick={() => setAddingKey(true)}><Plus className="h-4 w-4" /> Generate Key</RippleButton>
          </div>
          <Card>
            <h3 className="mb-4 font-display font-bold" style={{ color: 'var(--text-primary)' }}>API Keys</h3>
            {apiKeys.length ? (
              <div className="space-y-2">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    <Key className="h-4 w-4 text-crimson-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{k.key_name}</p>
                      <p className="flex items-center gap-1.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {showKey === k.id ? `${k.api_key_prefix}•••••••••••••••` : `${k.api_key_prefix}••••••••`}
                        <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="text-crimson-500">{showKey === k.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</button>
                        <button onClick={() => navigator.clipboard.writeText(k.api_key_prefix)} className="text-crimson-500"><Copy className="h-3 w-3" /></button>
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Created: {new Date(k.created_at).toLocaleDateString()}{k.expires_at ? ` · Expires: ${new Date(k.expires_at).toLocaleDateString()}` : ''}</p>
                    </div>
                    <Badge tone={k.status === 'active' ? 'green' : 'gray'}>{k.status}</Badge>
                    <button onClick={() => { remove('erp_api_keys', k.id); logAction('revoke_key', 'erp_api_keys', k.id); }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            ) : <EmptyStateCard icon={Key} title="No API keys generated" description="Generate API keys to enable third-party integrations and automation." ctaLabel="Generate Key" onCta={() => setAddingKey(true)} />}
          </Card>
          {addingKey && <KeyModal onClose={() => setAddingKey(false)} onSave={async (d) => { await insert('erp_api_keys', d); await logAction('generate_key', 'erp_api_keys', '', d); setAddingKey(false); }} />}
        </div>
      )}
    </div>
  );
}

function RoleModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ role_name: '', description: '', permissions: '' });
  return (
    <Modal open onClose={onClose} title="Add Role">
      <div className="space-y-3">
        <Field label="Role Name"><input className={inputCls} value={f.role_name} onChange={(e) => setF({ ...f, role_name: e.target.value })} /></Field>
        <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Permissions (comma-separated)"><input className={inputCls} placeholder="buses, crew, earnings" value={f.permissions} onChange={(e) => setF({ ...f, permissions: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave({ role_name: f.role_name, description: f.description, permissions: f.permissions.split(',').map((s) => s.trim()).filter(Boolean), user_count: 0 })}>Create</RippleButton>
        </div>
      </div>
    </Modal>
  );
}

function KeyModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ key_name: '', permissions: 'read', expires_days: 365 });
  const prefix = `ylt_${Math.random().toString(36).slice(2, 10)}`;
  return (
    <Modal open onClose={onClose} title="Generate API Key">
      <div className="space-y-3">
        <Field label="Key Name"><input className={inputCls} value={f.key_name} onChange={(e) => setF({ ...f, key_name: e.target.value })} /></Field>
        <Field label="Permissions"><select className={inputCls} value={f.permissions} onChange={(e) => setF({ ...f, permissions: e.target.value })}><option value="read">Read Only</option><option value="read,write">Read & Write</option><option value="all">Full Access</option></select></Field>
        <Field label="Expires (days)"><input type="number" className={inputCls} value={f.expires_days} onChange={(e) => setF({ ...f, expires_days: +e.target.value })} /></Field>
        <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600"><Lock className="mr-1 inline h-3 w-3" />Key prefix: {prefix}•••• — Copy the full key after generation. It won't be shown again.</div>
        <div className="flex justify-end gap-2 pt-2">
          <RippleButton variant="ghost" className="text-sm" onClick={onClose}>Cancel</RippleButton>
          <RippleButton className="text-sm" onClick={() => onSave({ key_name: f.key_name, api_key_prefix: prefix, permissions: f.permissions.split(','), status: 'active', expires_at: new Date(Date.now() + f.expires_days * 86400000).toISOString() })}>Generate</RippleButton>
        </div>
      </div>
    </Modal>
  );
}
