// app/operator/bookings/page.tsx
//
// Operator bookings management page. Lists all bookings and supports lookup
// by PNR, phone, or email.

"use client";

import { useEffect, useState } from "react";
import { listAllBookings, lookupBookings } from "../../../lib/api/bookings";
import type { Booking } from "../../../lib/types";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAllBookings(200);
      setBookings(res.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const doLookup = async () => {
    if (!searchTerm.trim()) {
      loadAll();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await lookupBookings(searchTerm.trim());
      setBookings(res.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "lookup failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bookings</h1>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search by PNR, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doLookup()}
        />
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700" onClick={doLookup}>
          Search
        </button>
        <button className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100" onClick={loadAll}>
          Clear
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : bookings.length === 0 ? (
        <p className="text-slate-500">No bookings found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="p-3">PNR</th>
                <th>Route</th>
                <th>Date</th>
                <th>Seats</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="p-3 font-mono text-xs">{b.pnr}</td>
                  <td>{b.fromCity} → {b.toCity}</td>
                  <td>{b.travelDate} {b.departureTime}</td>
                  <td>{b.seats}</td>
                  <td>₹{b.totalAmount}</td>
                  <td>{b.status}</td>
                  <td>
                    <span className={b.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}>
                      {b.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
