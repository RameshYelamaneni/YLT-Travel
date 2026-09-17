// lib/api/erp.ts
//
// Typed client for the ERP dashboard endpoint. The single getDashboard call
// replaces the 26 separate API calls the old frontend used to make per
// dashboard load — one round-trip, one unified payload.

import { request, buildQuery } from "./client";
import type { DashboardPayload } from "../types";

export async function getDashboard(
  operatorId: number,
  signal?: AbortSignal,
): Promise<DashboardPayload> {
  const qs = buildQuery({ operatorId });
  return request<DashboardPayload>(`/erp/dashboard/sync${qs}`, { signal });
}
