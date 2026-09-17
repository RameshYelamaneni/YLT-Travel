// app/directors/page.tsx
//
// Board of directors management page. Lists, creates, and deletes directors.

"use client";

import { useEffect, useState } from "react";
import { listDirectors, upsertDirector, deleteDirector } from "../../lib/api/directors";
import type { Director } from "../../lib/types";

export default function DirectorsPage() {
  const [directors, setDirectors] = useState<Director[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", title: "", bio: "", imageUrl: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listDirectors();
      setDirectors(res.directors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await upsertDirector({
        fullName: form.fullName,
        title: form.title,
        bio: form.bio || undefined,
        imageUrl: form.imageUrl || undefined,
      });
      setForm({ fullName: "", title: "", bio: "", imageUrl: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this director?")) return;
    try {
      await deleteDirector(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Board of Directors</h1>
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Director"}
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700" onClick={handleCreate}>Save</button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directors.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-4">
              {d.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.imageUrl} alt={d.fullName} className="mb-3 h-32 w-32 rounded-full object-cover" />
              )}
              <div className="font-medium">{d.fullName}</div>
              <div className="text-sm text-brand-600">{d.title}</div>
              {d.bio && <p className="mt-2 text-sm text-slate-500 line-clamp-3">{d.bio}</p>}
              <button className="mt-3 text-sm text-red-500 hover:text-red-700" onClick={() => handleDelete(d.id)}>Delete</button>
            </div>
          ))}
          {directors.length === 0 && <p className="text-slate-500">No directors yet.</p>}
        </div>
      )}
    </div>
  );
}
