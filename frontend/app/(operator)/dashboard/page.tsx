// app/(operator)/dashboard/page.tsx
//
// Operator dashboard. Loads the unified payload from /erp/dashboard/sync via
// the Zustand store and renders each module from store selectors. One API
// call drives the whole screen — no per-module fetches.

"use client";

import { useEffect } from "react";
import {
  useErpStore,
  selectBuses,
  selectLiveTrips,
  selectSeatLocks,
  selectModuleStatus,
} from "../../../lib/store/erpStore";

export default function DashboardPage() {
  const payload = useErpStore((s) => s.payload);
  const loading = useErpStore((s) => s.loading);
  const error = useErpStore((s) => s.error);
  const loadDashboard = useErpStore((s) => s.loadDashboard);
  const lastRefreshedAt = useErpStore((s) => s.lastRefreshedAt);

  const buses = useErpStore(selectBuses);
  const liveTrips = useErpStore(selectLiveTrips);
  const seatLocks = useErpStore(selectSeatLocks);
  const moduleStatus = useErpStore(selectModuleStatus);

  useEffect(() => {
    // operatorId 1 for the demo; in production this comes from auth.
    loadDashboard(1);
    // Refresh every 15s to pick up live trip + lock changes.
    const id = setInterval(() => loadDashboard(1), 15000);
    return () => clearInterval(id);
  }, [loadDashboard]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Operator dashboard</h1>
        <div className="text-sm text-slate-500">
          {lastRefreshedAt
            ? `Last synced ${new Date(lastRefreshedAt).toLocaleTimeString()}`
            : "Not synced yet"}
        </div>
      </div>

      {loading && !payload && <p className="text-slate-500">Loading dashboard...</p>}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {payload && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Buses" value={buses.length} status={moduleStatus["buses"]} />
            <StatCard label="Live trips" value={liveTrips.length} status={moduleStatus["live_trips"]} />
            <StatCard label="Active seat locks" value={seatLocks.length} status={moduleStatus["seat_locks"]} />
            <StatCard
              label="Payload time"
              value={`${payload.elapsedMs}ms`}
              status="ok"
            />
          </div>

          <Section title="Live trips" status={moduleStatus["live_trips"]}>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1">Trip</th>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Sold</th>
                  <th>Locked</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {liveTrips.map((t) => (
                  <tr key={t.tripId} className="border-t border-slate-100">
                    <td className="py-1 font-mono text-xs">{t.tripId}</td>
                    <td>{t.source} → {t.destination}</td>
                    <td>{new Date(t.departureAt).toLocaleString()}</td>
                    <td>{t.seatsSold}/{t.seatsTotal}</td>
                    <td>{t.seatsLocked}</td>
                    <td>₹{t.grossRevenue.toLocaleString()}</td>
                  </tr>
                ))}
                {liveTrips.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-3 text-slate-400">
                      No live trips.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          <Section title="Fleet" status={moduleStatus["buses"]}>
            <div className="grid gap-2 sm:grid-cols-2">
              {buses.map((b) => (
                <div
                  key={b.id}
                  className="rounded-md border border-slate-200 p-3 text-sm"
                >
                  <div className="font-medium">
                    {b.registration} · {b.model}
                  </div>
                  <div className="text-slate-500">
                    {b.busType} · {b.capacity} seats · {b.status}
                  </div>
                </div>
              ))}
              {buses.length === 0 && (
                <p className="text-slate-400">No buses registered.</p>
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number | string;
  status?: string;
}) {
  const dot =
    status === "ok"
      ? "bg-green-500"
      : status === "degraded"
        ? "bg-amber-500"
        : status === "empty"
          ? "bg-slate-300"
          : "bg-slate-300";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Section({
  title,
  status,
  children,
}: {
  title: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        {status === "degraded" && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            degraded
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
