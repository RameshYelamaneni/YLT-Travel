import { useState } from 'react';
import { Download, Mail, Smartphone, Loader2 } from 'lucide-react';
import type { TicketData } from '../lib/ticket';
import {
  downloadAppleWallet, downloadGoogleWallet, printTicket,
  pkpassBytes, icsContent, googleWalletLink,
} from '../lib/ticket';
import { downloadTicketPdf, ticketPdfBase64 } from '../lib/ticketPdf';
import { apiFetch } from '../lib/api';

export default function TicketActions({ ticket, compact }: { ticket: TicketData; compact?: boolean }) {
  const [email, setEmail] = useState(ticket.contactEmail || '');
  const [busy, setBusy] = useState<'mail' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function sendMail() {
    if (!email.includes('@')) {
      setNote('Enter the email to receive the ticket.');
      return;
    }
    setBusy('mail');
    setNote(null);
    const { ok, message } = await emailTicket(ticket, email);
    setNote(ok ? (message || `Ticket emailed to ${email} with PDF and wallet files.`) : (message || 'Could not send email. Set SMTP in Admin → Email.'));
    setBusy(null);
  }

  const btn = compact ? 'text-xs text-navy-700 hover:text-navy-600' : 'btn-ghost text-xs';

  return (
    <div className={compact ? 'space-y-1' : 'mt-4 space-y-3'}>
      <div className={`flex flex-wrap justify-center gap-2 ${compact ? 'justify-end' : ''}`}>
        <button type="button" onClick={() => downloadTicketPdf(ticket)} className={btn}>
          <Download className="inline h-3.5 w-3.5" /> Download PDF
        </button>
        <button type="button" onClick={() => downloadAppleWallet(ticket)} className={btn}>
          <Smartphone className="inline h-3.5 w-3.5" /> Apple Wallet
        </button>
        <button type="button" onClick={() => downloadGoogleWallet(ticket)} className={btn}>
          <Smartphone className="inline h-3.5 w-3.5" /> Google Wallet
        </button>
        {!compact && (
          <button type="button" onClick={() => printTicket(ticket)} className={btn}>
            Print
          </button>
        )}
      </div>
      {!compact && (
        <div className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
          <input
            type="email"
            className="input-field flex-1 text-xs"
            placeholder="Email e-ticket"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" onClick={sendMail} disabled={busy === 'mail'} className="btn-primary text-xs disabled:opacity-40">
            {busy === 'mail' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            Email ticket
          </button>
        </div>
      )}
      {compact && (
        <button type="button" onClick={sendMail} className="text-xs text-navy-700 hover:text-navy-600">
          <Mail className="inline h-3.5 w-3.5" /> Email
        </button>
      )}
      {note && <p className="text-center text-[11px]" style={{ color: note.toLowerCase().includes('could not') ? '#b91c1c' : 'var(--text-secondary)' }}>{note}</p>}
    </div>
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function emailTicket(ticket: TicketData, to?: string): Promise<{ ok: boolean; message?: string }> {
  const dest = to || ticket.contactEmail;
  if (!dest?.includes('@')) return { ok: false, message: 'Email required.' };
  try {
    const pdf_b64 = ticketPdfBase64(ticket);
    const pkpass_b64 = bytesToBase64(pkpassBytes(ticket));
    const ics_b64 = bytesToBase64(new TextEncoder().encode(icsContent(ticket)));
    const res = await apiFetch('/api/tickets/email', {
      method: 'POST',
      body: JSON.stringify({
        action: 'ticket',
        to: dest,
        ticket,
        pdf_b64,
        pkpass_b64,
        ics_b64,
        apple_wallet_url: 'https://ylttravels.com',
        google_wallet_url: googleWalletLink(ticket),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) return { ok: false, message: data.message || data.error || 'Could not send ticket email. Set SMTP in Admin → Email.' };
    return { ok: true, message: data.message };
  } catch {
    return { ok: false, message: 'Could not send ticket email. Set SMTP in Admin → Email.' };
  }
}
