// lib/api/bookings.ts
//
// Typed client for bus booking endpoints.

import { request, buildQuery } from "./client";
import type { Booking } from "../types";

export async function createBooking(data: Partial<Booking>): Promise<Booking> {
  return request<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getBooking(pnr: string): Promise<Booking> {
  return request<Booking>(`/bookings/${pnr}`);
}

export async function lookupBookings(term: string): Promise<{ bookings: Booking[] }> {
  return request(`/bookings${buildQuery({ lookup: term })}`);
}

export async function listUserBookings(user: string): Promise<{ bookings: Booking[] }> {
  return request(`/bookings${buildQuery({ user })}`);
}

export async function listAllBookings(limit?: number): Promise<{ bookings: Booking[] }> {
  return request(`/bookings${buildQuery({ all: "1", limit })}`);
}
