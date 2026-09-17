// lib/api/directors.ts
//
// Typed client for director management endpoints.

import { request } from "./client";
import type { Director } from "../types";

export async function listDirectors(): Promise<{ directors: Director[] }> {
  return request("/directors");
}

export async function upsertDirector(data: Partial<Director>): Promise<Director> {
  return request<Director>("/directors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteDirector(id: string): Promise<{ ok: boolean }> {
  return request(`/directors/${id}`, { method: "DELETE" });
}
