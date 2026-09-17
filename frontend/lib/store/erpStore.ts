// lib/store/erpStore.ts
//
// Zustand store that owns the single DashboardPayload object returned by
// GET /api/v1/erp/dashboard/sync. The store is the ONLY source of truth for
// ERP dashboard data; UI components read selectors from it and never mutate
// state directly. This is what lets one backend round-trip drive the whole
// dashboard instead of 26 separate client-side fetches.

import { create } from "zustand";
import { getDashboard } from "../api/erp";
import type {
  DashboardPayload,
  ErpBus,
  ErpSeatInventory,
  ErpSeatLock,
  ErpLiveTrip,
  ErpEmployee,
  ErpExpense,
  ModuleStatus,
} from "../types";

interface ErpState {
  // The unified payload from the backend. null until the first load.
  payload: DashboardPayload | null;
  loading: boolean;
  error: string | null;
  // Monotonic counter bumped on every successful refresh; components can
  // subscribe to it to trigger re-renders or polling re-fetches.
  lastRefreshedAt: number;

  // Actions
  loadDashboard: (operatorId: number) => Promise<void>;
  refreshLocks: (operatorId: number) => Promise<void>;
  clear: () => void;
}

export const useErpStore = create<ErpState>((set, get) => ({
  payload: null,
  loading: false,
  error: null,
  lastRefreshedAt: 0,

  loadDashboard: async (operatorId: number) => {
    set({ loading: true, error: null });
    try {
      const payload = await getDashboard(operatorId);
      set({
        payload,
        loading: false,
        lastRefreshedAt: Date.now(),
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "dashboard load failed",
      });
    }
  },

  // refreshLocks re-fetches the whole dashboard (the backend returns seat
  // locks as part of the unified payload). In a future iteration this could
  // be a dedicated /erp/seat-locks endpoint that patches only that slice.
  refreshLocks: async (operatorId: number) => {
    // Reuse loadDashboard; the lock slice is part of the unified payload.
    await get().loadDashboard(operatorId);
  },

  clear: () => set({ payload: null, loading: false, error: null, lastRefreshedAt: 0 }),
}));

// --- Selectors ---
//
// Selector helpers keep components lean: they read a slice of the payload
// and return a stable empty array when nothing is loaded yet, so components
// can always map over the result without null-checks.

export const selectBuses = (s: ErpState): ErpBus[] => s.payload?.buses ?? [];
export const selectSeatInventory = (s: ErpState): ErpSeatInventory[] =>
  s.payload?.seatInventory ?? [];
export const selectSeatLocks = (s: ErpState): ErpSeatLock[] => s.payload?.seatLocks ?? [];
export const selectLiveTrips = (s: ErpState): ErpLiveTrip[] => s.payload?.liveTrips ?? [];
export const selectEmployees = (s: ErpState): ErpEmployee[] => s.payload?.employees ?? [];
export const selectExpenses = (s: ErpState): ErpExpense[] => s.payload?.expenses ?? [];
export const selectModuleStatus = (s: ErpState): Record<string, ModuleStatus> =>
  s.payload?.moduleStatus ?? {};
