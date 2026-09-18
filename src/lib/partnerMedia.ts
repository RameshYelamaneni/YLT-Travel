import { apiFetch } from './api';
import { authToken } from './auth';

const MAX_BYTES = 6 * 1024 * 1024;

function staffHeaders(): Record<string, string> {
  const t = authToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}`, 'X-Authorization': `Bearer ${t}` } : {}),
  };
}

export async function uploadPartnerImage(file: File): Promise<string> {
  if (!authToken()) throw new Error('Sign in as a partner to upload photos.');
  if (file.size > MAX_BYTES) throw new Error('Image too large. Max 6MB.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const res = await apiFetch('/api/uploads.php', {
    method: 'POST',
    headers: staffHeaders(),
    body: JSON.stringify({
      filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_data: base64,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false || !data.url) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed.');
  }
  return String(data.url);
}

export function isStoredMediaUrl(url: string): boolean {
  const u = (url || '').trim();
  if (!u || u.startsWith('data:')) return false;
  return u.startsWith('/') || /^https?:\/\//i.test(u);
}
