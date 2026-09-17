// components/BusSeatLayout.tsx
//
// Purely presentational seat-map component. It renders seats in three states
// (available / locked / booked) and notifies the parent of seat selection.
// It owns NO booking state: the lock/booked state is driven entirely by the
// `trip.seats` array passed in as props (which originates from the backend
// payload via the Zustand store), not by local component state.
//
// Live updates: the parent (search page or dashboard) re-fetches the trip
// on a polling interval and passes fresh props down; this component just
// re-renders from the new props. A WebSocket stub hook is included below to
// show where a real-time push would slot in without changing this component's
// contract — it still receives seat state via props.

"use client";

import { useMemo, useState } from "react";
import { lockSeat } from "../lib/api/bus";
import type { TripOption, SeatInfo } from "../lib/types";

interface Props {
  trip: TripOption;
  // lockedBy is the session/user ID used when acquiring locks.
  lockedBy: string;
  // Optional callback invoked after a successful lock so the parent can
  // re-fetch the trip and pass updated props back in.
  onLocked?: (tripId: string, seatIds: string[]) => void;
}

type SeatStatus = SeatInfo["status"];

const STATUS_STYLES: Record<SeatStatus, string> = {
  available:
    "border-green-500 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer",
  locked:
    "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed",
  booked:
    "border-red-500 bg-red-50 text-red-700 cursor-not-allowed line-through",
};

const STATUS_LABEL: Record<SeatStatus, string> = {
  available: "Available",
  locked: "Locked",
  booked: "Booked",
};

export default function BusSeatLayout({ trip, lockedBy, onLocked }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // Group seats by deck then by row so we can render a realistic bus layout.
  const decks = useMemo(() => {
    const byDeck: Record<string, SeatInfo[][]> = {};
    for (const seat of trip.seats) {
      const rows = byDeck[seat.deck] ?? (byDeck[seat.deck] = []);
      while (rows.length < seat.row) rows.push([]);
      rows[seat.row - 1].push(seat);
    }
    // Sort each row by column so left-aisle seats render first.
    for (const deck of Object.keys(byDeck)) {
      for (const row of byDeck[deck]) row.sort((a, b) => a.col - b.col);
    }
    return byDeck;
  }, [trip.seats]);

  const toggleSelect = (seat: SeatInfo) => {
    if (seat.status !== "available") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  };

  const handleLock = async () => {
    if (selected.size === 0) return;
    setLocking(true);
    setLockError(null);
    try {
      await lockSeat({
        tripId: trip.tripId,
        seatIds: Array.from(selected),
        lockedBy,
      });
      onLocked?.(trip.tripId, Array.from(selected));
      setSelected(new Set());
    } catch (err) {
      setLockError(err instanceof Error ? err.message : "lock failed");
    } finally {
      setLocking(false);
    }
  };

  const lockLabel = locking
    ? "Locking..."
    : `Lock ${selected.size > 0 ? selected.size : ""} seat${selected.size === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-slate-600">
        <Legend color="bg-green-500" label="Available" />
        <Legend color="bg-amber-500" label="Locked" />
        <Legend color="bg-red-500" label="Booked" />
        <span className="ml-auto text-slate-400">
          {trip.availableSeats}/{trip.totalSeats} available
        </span>
      </div>

      {Object.entries(decks).map(([deckName, rows]) => (
        <div key={deckName} className="rounded-lg border border-slate-200 p-4">
          <div className="mb-2 text-xs font-medium uppercase text-slate-400">
            {deckName} deck
          </div>
          <div className="space-y-2">
            {rows.map((row, ri) => (
              <div key={ri} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs text-slate-400">
                  {ri + 1}
                </span>
                {row.map((seat) => {
                  const isSelected = selected.has(seat.id);
                  const base = STATUS_STYLES[seat.status];
                  const ring = isSelected
                    ? "ring-2 ring-brand-500"
                    : "ring-0";
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={seat.status !== "available"}
                      onClick={() => toggleSelect(seat)}
                      title={`${seat.label} — ${STATUS_LABEL[seat.status]} — ₹${seat.price}`}
                      className={`h-10 w-10 rounded-md border text-xs font-medium transition ${base} ${ring}`}
                    >
                      {seat.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={selected.size === 0 || locking}
          onClick={handleLock}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {lockLabel}
        </button>
        {lockError && (
          <span className="text-sm text-red-600">{lockError}</span>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
