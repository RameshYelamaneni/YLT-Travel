// app/(customer)/search/page.tsx
//
// Customer-facing bus search page. Calls the typed searchTrips client and
// renders results. Pure rendering + store/api calls; no direct fetch.

"use client";

import { useEffect, useMemo, useState } from "react";
import { searchTrips } from "../../../lib/api/bus";
import type { SearchRequest, TripOption } from "../../../lib/types";
import BusSeatLayout from "../../../components/BusSeatLayout";

export default function SearchPage() {
  const [form, setForm] = useState<SearchRequest>({
    source: "Bangalore",
    destination: "Chennai",
    date: new Date().toISOString().slice(0, 10),
    passengers: 1,
  });
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripOption | null>(null);

  const runSearch = async () => {
    setLoading(true);
    setErrors({});
    try {
      const res = await searchTrips(form);
      setTrips(res.trips);
      setErrors(res.errors ?? {});
    } catch (err) {
      setErrors({ client: err instanceof Error ? err.message : "search failed" });
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial search on mount so the page isn't empty.
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => a.minPrice - b.minPrice),
    [trips],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Find a bus</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="From">
          <input
            className="input"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
        </Field>
        <Field label="To">
          <input
            className="input"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Passengers">
          <input
            type="number"
            min={1}
            className="input w-20"
            value={form.passengers}
            onChange={(e) =>
              setForm({ ...form, passengers: Number(e.target.value) || 1 })
            }
          />
        </Field>
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          onClick={runSearch}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Some suppliers returned errors (partial results shown):
          <ul className="ml-4 list-disc">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4">
        {sortedTrips.length === 0 && !loading && (
          <p className="text-slate-500">No trips found.</p>
        )}
        {sortedTrips.map((t) => (
          <article
            key={t.tripId}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
          >
            <div>
              <div className="font-medium">{t.operator.name}</div>
              <div className="text-sm text-slate-500">
                {t.busType} · {t.source} → {t.destination} ·{" "}
                {new Date(t.departureAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ({t.durationMins} min)
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-semibold">
                  ₹{t.minPrice}–₹{t.maxPrice}
                </div>
                <div className="text-xs text-slate-500">
                  {t.availableSeats}/{t.totalSeats} seats
                </div>
              </div>
              <button
                className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                onClick={() => setSelectedTrip(t)}
              >
                Select seats
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedTrip && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {selectedTrip.operator.name} — seat layout
            </h2>
            <button
              className="text-sm text-slate-500 hover:text-slate-700"
              onClick={() => setSelectedTrip(null)}
            >
              Close
            </button>
          </div>
          <BusSeatLayout trip={selectedTrip} lockedBy="session-demo" />
        </div>
      )}


    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
