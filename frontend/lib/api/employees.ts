// lib/api/employees.ts
//
// Typed client for employee file management endpoints.

import { request, buildQuery } from "./client";
import type { EmployeeFile } from "../types";

export async function listFiles(folder?: string): Promise<{ files: EmployeeFile[] }> {
  return request(`/employees/files${buildQuery({ folder })}`);
}

export async function listFolders(): Promise<{ folders: { folder: string; count: number; size: number }[] }> {
  return request("/employees/files/folders");
}

export async function uploadFile(file: File, folder: string, description?: string, byEmail?: string, byName?: string): Promise<{ ok: boolean; id: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder || "General");
  if (description) formData.append("description", description);
  if (byEmail) formData.append("uploaded_by_email", byEmail);
  if (byName) formData.append("uploaded_by_name", byName);

  const res = await fetch("/api/v1/employees/files", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "upload failed");
  }
  return res.json();
}

export async function deleteFile(id: string): Promise<{ ok: boolean }> {
  return request(`/employees/files/${id}`, { method: "DELETE" });
}
