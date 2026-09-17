// lib/api/auth.ts
//
// Typed client for all auth endpoints. UI components import these instead of
// calling fetch directly.

import { request } from "./client";
import type { AuthResult, Employee, Partner, User } from "../types";

export async function signup(email: string, password: string, name?: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function signin(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function agentSignin(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/agent-signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function adminSignin(username: string, password: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/admin-signin", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function sendOTP(email: string): Promise<{ ok: boolean; message: string }> {
  return request("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyOTP(email: string, code: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export async function forgotPasswordSend(email: string): Promise<{ ok: boolean; message: string }> {
  return request("/auth/forgot-password/send", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function forgotPasswordReset(email: string, code: string, password: string): Promise<{ ok: boolean }> {
  return request("/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify({ email, code, password }),
  });
}

export async function getMe(token: string): Promise<{ ok: boolean; user: User }> {
  return request("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function logout(): Promise<{ ok: boolean }> {
  return request("/auth/logout", { method: "POST" });
}

// --- Employee management (admin) ---

export async function listEmployees(token: string): Promise<{ ok: boolean; employees: Employee[] }> {
  return request("/auth/employees", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createEmployee(token: string, data: { email: string; password: string; name: string; role: string; phone?: string }): Promise<{ ok: boolean; id: string }> {
  return request("/auth/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function deleteEmployee(token: string, id: string): Promise<{ ok: boolean }> {
  return request(`/auth/employees/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function resetEmployeePassword(token: string, id: string, password: string): Promise<{ ok: boolean }> {
  return request(`/auth/employees/${id}/reset-password`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
}

// --- Partner management (admin) ---

export async function listPartners(token: string): Promise<{ ok: boolean; partners: Partner[] }> {
  return request("/auth/partners", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createPartner(token: string, data: { email: string; password: string; name: string; agencyName?: string; phone?: string; city?: string; commissionRate?: number }): Promise<{ ok: boolean; id: string }> {
  return request("/auth/partners", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function deletePartner(token: string, id: string): Promise<{ ok: boolean }> {
  return request(`/auth/partners/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
