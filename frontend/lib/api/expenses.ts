// lib/api/expenses.ts
//
// Typed client for ERP expense and payment endpoints. Expenses are managed
// via the generic ERP CRUD endpoint (/erp/table/erp_expenses).

import { request, buildQuery } from "./client";
import type { Payment } from "../types";

export async function listExpenses(): Promise<{ rows: Record<string, unknown>[] }> {
  return request("/erp/table/erp_expenses");
}

export async function createExpense(fields: Record<string, unknown>): Promise<{ ok: boolean }> {
  return request("/erp/table/erp_expenses", {
    method: "POST",
    body: JSON.stringify(fields),
  });
}

export async function updateExpense(id: string, fields: Record<string, unknown>): Promise<{ ok: boolean }> {
  return request(`/erp/table/erp_expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(fields),
  });
}

export async function deleteExpense(id: string): Promise<{ ok: boolean }> {
  return request(`/erp/table/erp_expenses/${id}`, { method: "DELETE" });
}

// --- Payments ---

export async function listPayments(): Promise<{ payments: Payment[] }> {
  return request("/payments");
}

export async function submitPayment(data: { pnr: string; utr: string; bookingId?: string; amount?: number; method?: string; submittedBy?: string; note?: string }): Promise<Payment> {
  return request<Payment>("/payments/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function setPaymentStatus(id: string, status: "verified" | "rejected"): Promise<{ ok: boolean }> {
  return request("/payments/set-status", {
    method: "POST",
    body: JSON.stringify({ id, status }),
  });
}
