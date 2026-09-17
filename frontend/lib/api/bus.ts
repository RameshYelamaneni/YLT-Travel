// lib/api/bus.ts
//
// Typed client for the bus search and seat-lock endpoints. UI components
// import these functions instead of calling fetch directly, so the API
// surface is strongly typed and centralized.

import { request, buildQuery } from "./client";
import type {
  SearchRequest,
  SearchResponse,
  LockSeatRequest,
  LockSeatResponse,
} from "../types";

export async function searchTrips(
  params: SearchRequest,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const qs = buildQuery({
    source: params.source,
    destination: params.destination,
    date: params.date,
    passengers: params.passengers,
  });
  return request<SearchResponse>(`/bus/search${qs}`, { signal });
}

export async function lockSeat(
  req: LockSeatRequest,
  signal?: AbortSignal,
): Promise<LockSeatResponse> {
  return request<LockSeatResponse>("/bus/lock-seat", {
    method: "POST",
    body: JSON.stringify(req),
    signal,
  });
}
