// app/expenses/page.tsx
//
// Expense ledger page. Lists expenses from the ERP CRUD endpoint and supports
// creating new expense entries.

"use client";

import { useEffect, useState } from "react";
import { listExpenses, createExpense, deleteExpense } from "../../lib/api/expenses";

interface ExpenseRow {
  id: string;
  operator_id?: number;
  category?: string;
  amount?: number;
  currency?: string;
  incurred_at?: string;
  status?: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "fuel", amount: "", currency: "INR", status: "pending" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listExpenses();
      setExpenses((res.rows as unknown as ExpenseRow[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await createExpense({
        category: form.category,
        amount: parseFloat(form.amount) || 0,
        currency: form.currency,
        status: form.status,
        incurred_at: new Date().toISOString().slice(0, 19),
      });
      setForm({ category: "fuel", amount: "", currency: "INR", status: "pending" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "delete failed");
    }
  };

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expense Ledger</h1>
          <p className="text-sm text-slate-500">Total: ₹{total.toLocaleString()}</p>
        </div>
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Expense"}
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="fuel">Fuel</option>
            <option value="maintenance">Maintenance</option>
            <option value="salary">Salary</option>
            <option value="toll">Toll</option>
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
          <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:col-span-2" onClick={handleCreate}>Save Expense</button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="p-3">Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="p-3 capitalize">{e.category || "—"}</td>
                  <td>₹{(e.amount || 0).toLocaleString()}</td>
                  <td>{e.incurred_at ? new Date(e.incurred_at).toLocaleDateString() : "—"}</td>
                  <td>{e.status || "—"}</td>
                  <td><button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(e.id)}>Delete</button></td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">No expenses recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
