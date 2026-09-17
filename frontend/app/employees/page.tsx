// app/employees/page.tsx
//
// Employee management page. Lists employees, supports creating new ones and
// resetting passwords. Also includes a file management section.

"use client";

import { useEffect, useState } from "react";
import { listEmployees, createEmployee, deleteEmployee, resetEmployeePassword } from "../../lib/api/auth";
import type { Employee } from "../../lib/types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "operator", phone: "" });
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) load(t);
  }, []);

  const load = async (t: string) => {
    setLoading(true);
    try {
      const res = await listEmployees(t);
      setEmployees(res.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!token) return;
    try {
      await createEmployee(token, {
        email: form.email, password: form.password, name: form.name, role: form.role, phone: form.phone,
      });
      setForm({ email: "", password: "", name: "", role: "operator", phone: "" });
      setShowForm(false);
      load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Delete this employee?")) return;
    try {
      await deleteEmployee(token, id);
      load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "delete failed");
    }
  };

  const handleReset = async (id: string) => {
    if (!token) return;
    const pw = prompt("Enter new password (min 6 chars):");
    if (!pw || pw.length < 6) return;
    try {
      await resetEmployeePassword(token, id, pw);
      alert("Password reset.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "reset failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Employee"}
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
            <option value="sales">Sales</option>
            <option value="support">Support</option>
            <option value="marketing">Marketing</option>
            <option value="manager">Manager</option>
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:col-span-2" onClick={handleCreate}>Create Employee</button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="p-3">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium">{e.name}</td>
                  <td>{e.email}</td>
                  <td>{e.role}</td>
                  <td>{e.status}</td>
                  <td>
                    <button className="mr-2 text-xs text-brand-600 hover:underline" onClick={() => handleReset(e.id)}>Reset PW</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(e.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-slate-400">No employees.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
