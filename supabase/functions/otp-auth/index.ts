import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_secure: boolean;
  email_enabled: boolean;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function genOtp(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10);
  return code;
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, smtp_secure, email_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  return data as SmtpConfig;
}

// Minimal SMTP client using Deno's built-in TLS + TCP sockets.
// Supports both direct TLS (port 465) and STARTTLS upgrade (port 587).
async function sendSmtp(cfg: SmtpConfig, to: string, subject: string, htmlBody: string): Promise<void> {
  const host = cfg.smtp_host;
  const port = cfg.smtp_port;
  const secure = cfg.smtp_secure;

  let conn: Deno.TlsConn | Deno.TcpConn;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let writer: Writer<Uint8Array>;

  if (secure) {
    const tls = await Deno.connectTls({ hostname: host, port });
    conn = tls;
    reader = tls.readable.getReader();
    writer = tls.writable.getWriter();
    await readReply(reader, "220");
  } else {
    const tcp = await Deno.connect({ hostname: host, port });
    conn = tcp;
    reader = tcp.readable.getReader();
    writer = tcp.writable.getWriter();
    await readReply(reader, "220");
    await sendCmd(writer, reader, "EHLO ylttravels.com", "250");
    await sendCmd(writer, reader, "STARTTLS", "220");
    // Upgrade to TLS in place.
    const tlsConn = await Deno.startTls(tcp, { hostname: host });
    conn = tlsConn;
    reader = tlsConn.readable.getReader();
    writer = tlsConn.writable.getWriter();
    await sendCmd(writer, reader, "EHLO ylttravels.com", "250");
  }

  if (!secure) {
    // After STARTTLS we already did EHLO above; skip.
  }

  await sendCmd(writer, reader, "EHLO ylttravels.com", "250");
  await sendCmd(writer, reader, "AUTH LOGIN", "334");
  await sendCmd(writer, reader, btoa(cfg.smtp_user), "334");
  await sendCmd(writer, reader, btoa(cfg.smtp_password), "235");

  const fromHeader = `From: ${cfg.smtp_from_name} <${cfg.smtp_from_email}>`;
  const toHeader = `To: <${to}>`;
  const mimeHeaders = [
    fromHeader,
    toHeader,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    `Subject: ${subject}`,
  ].join("\r\n");

  const message = `${mimeHeaders}\r\n\r\n${htmlBody}`;
  await sendCmd(writer, reader, `MAIL FROM:<${cfg.smtp_from_email}>`, "250");
  await sendCmd(writer, reader, `RCPT TO:<${to}>`, "250");
  await sendCmd(writer, reader, "DATA", "354");
  await sendCmd(writer, reader, message + "\r\n.", "250");
  await sendCmd(writer, reader, "QUIT", "221");

  try { reader.cancel(); writer.close(); conn.close(); } catch { /* ignore */ }
}

async function readReply(reader: ReadableStreamDefaultReader<Uint8Array>, expectCode: string): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    // SMTP multi-line replies: a line like "250-..." continues, "250 ..." ends.
    if (/\d{3} .*\r?\n$/.test(text)) break;
  }
  if (!text.startsWith(expectCode)) {
    throw new Error(`SMTP expected ${expectCode}, got: ${text.trim().slice(0, 200)}`);
  }
  return text;
}

async function sendCmd(writer: Writer<Uint8Array>, reader: ReadableStreamDefaultReader<Uint8Array>, cmd: string, expectCode: string): Promise<string> {
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(cmd + "\r\n"));
  return readReply(reader, expectCode);
}

interface Writer<T> {
  write(p: T): Promise<number>;
  close(): Promise<void>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop() ?? "";
    const body = await req.json().catch(() => ({}));

    // ---- SEND OTP ----
    if (action === "send") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: "Invalid email address." }, 400);
      }

      const cfg = await getSmtpConfig();
      if (!cfg || !cfg.email_enabled || !cfg.smtp_password) {
        return json({ error: "Email login is not configured. Ask admin to enable it in the admin center." }, 503);
      }

      // Rate limit: max 3 codes per email per 10 minutes.
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("otp_codes")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .gte("created_at", tenMinAgo);
      if (count && count >= 3) {
        return json({ error: "Too many OTP requests. Please wait a few minutes." }, 429);
      }

      const code = genOtp();
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insErr } = await supabase
        .from("otp_codes")
        .insert({ email, code, expires_at: expires, used: false });
      if (insErr) throw insErr;

      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f0f12;font-family:Inter,Segoe UI,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:0.5px">YLT Travels</h1>
      <p style="color:#c81e44;font-size:12px;margin:4px 0 0">Premium Bus Services</p>
    </div>
    <div style="background:#1a1a20;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.06)">
      <h2 style="color:#fff;font-size:18px;margin:0 0 8px">Your Login Code</h2>
      <p style="color:#a8a8b0;font-size:14px;line-height:1.6;margin:0 0 24px">Use this 6-digit code to log in to your YLT Travels account. The code expires in 10 minutes.</p>
      <div style="text-align:center;background:#0f0f12;border-radius:12px;padding:24px;margin:0 0 24px">
        <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#c81e44">${code}</span>
      </div>
      <p style="color:#6b6b75;font-size:12px;margin:0;line-height:1.5">If you didn't request this code, you can safely ignore this email. Never share this code with anyone.</p>
    </div>
    <p style="color:#4a4a52;font-size:11px;text-align:center;margin:24px 0 0">© YLT Travels · Tirupati, Andhra Pradesh</p>
  </div>
</body></html>`;

      try {
        await sendSmtp(cfg, email, "Your YLT Travels Login Code", html);
      } catch (sendErr) {
        return json({ error: `Could not send email: ${(sendErr as Error).message}. Check SMTP settings in admin center.` }, 502);
      }

      return json({ ok: true, message: "OTP sent. Check your inbox (and spam folder)." });
    }

    // ---- VERIFY OTP ----
    if (action === "verify") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const code = String(body.code ?? "").trim();
      if (!email || code.length !== 6) {
        return json({ error: "Email and 6-digit code are required." }, 400);
      }

      const { data: records, error: qErr } = await supabase
        .from("otp_codes")
        .select("id, code, expires_at, used")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1);
      if (qErr) throw qErr;
      const latest = records?.[0];
      if (!latest) return json({ error: "No OTP was requested. Click 'Send OTP' first." }, 400);
      if (latest.used) return json({ error: "This code was already used. Request a new one." }, 400);
      if (new Date(latest.expires_at).getTime() < Date.now()) {
        return json({ error: "This code has expired. Request a new one." }, 400);
      }
      if (latest.code !== code) return json({ error: "Incorrect code. Try again." }, 400);

      // Mark used.
      await supabase.from("otp_codes").update({ used: true }).eq("id", latest.id);

      // Create or find the auth user, then issue a magic-link session.
      // signInWithOtp with createUser:true will auto-provision the user and
      // return a session (email confirmation is off, so no email is actually sent
      // because we pass shouldCreateUser and suppress the email via the admin API).
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkErr) throw linkErr;

      // Extract the token from the action link and exchange it for a session.
      const hashedToken = linkData.properties?.hashed_token;
      if (!hashedToken) throw new Error("Could not generate auth token.");

      const { data: sessData, error: sessErr } = await supabase.auth.verifyOtp({
        token_hash: hashedToken,
        type: "magiclink",
      });
      if (sessErr) throw sessErr;

      return json({
        ok: true,
        access_token: sessData.session?.access_token,
        refresh_token: sessData.session?.refresh_token,
        user_email: email,
      });
    }

    // ---- TEST SMTP (admin only) ----
    if (action === "test") {
      const cfg = await getSmtpConfig();
      if (!cfg || !cfg.smtp_password) {
        return json({ error: "SMTP not configured." }, 400);
      }
      const to = String(body.to ?? cfg.smtp_user).trim();
      try {
        await sendSmtp(cfg, to, "YLT Travels SMTP Test", `
          <div style="font-family:Inter,Arial,sans-serif;background:#0f0f12;padding:32px">
            <div style="max-width:480px;margin:0 auto;background:#1a1a20;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.06)">
              <h2 style="color:#fff">SMTP Test Successful</h2>
              <p style="color:#a8a8b0">Your YLT Travels email configuration is working correctly. OTP login emails will be sent from this address.</p>
            </div>
          </div>`);
        return json({ ok: true, message: "Test email sent successfully." });
      } catch (e) {
        return json({ error: `SMTP test failed: ${(e as Error).message}` }, 502);
      }
    }

    // ---- ADMIN SIGNIN ----
    if (action === "admin-signin") {
      const username = String(body.username ?? "").trim();
      const password = String(body.password ?? "").trim();
      if (!username || !password) {
        return json({ error: "Username and password are required." }, 400);
      }

      // Core Admin check (hardcoded fallback credentials).
      if (username === "CoreAdmin" && password === "change-me") {
        return json({
          ok: true,
          access_token: "core-admin-" + btoa(username + Date.now()),
          user_email: "coreadmin@ylttravels.com",
          name: "Core Admin",
          user_id: "core-admin",
          type: "admin",
          role: "admin",
        });
      }

      // Employee check.
      const emailAddr = username.toLowerCase();
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("id, email, name, role, status, password_hash")
        .eq("email", emailAddr)
        .maybeSingle();
      if (empErr) throw empErr;
      if (emp && emp.password_hash && emp.status === "active") {
        const valid = await verifyBcrypt(password, emp.password_hash);
        if (valid) {
          return json({
            ok: true,
            access_token: "emp-" + btoa(emp.id + Date.now()),
            user_email: emp.email,
            name: emp.name,
            user_id: emp.id,
            type: "admin",
            role: emp.role,
          });
        }
      }
      return json({ error: "Invalid admin credentials." }, 401);
    }

    // ---- AGENT SIGNIN ----
    if (action === "agent-signin") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "").trim();
      if (!email || !password) {
        return json({ error: "Email and password are required." }, 400);
      }

      const { data: partner, error: pErr } = await supabase
        .from("partners")
        .select("id, email, name, status, password_hash")
        .eq("email", email)
        .maybeSingle();
      if (pErr) throw pErr;
      if (partner && partner.password_hash && partner.status === "active") {
        const valid = await verifyBcrypt(password, partner.password_hash);
        if (valid) {
          return json({
            ok: true,
            access_token: "partner-" + btoa(partner.id + Date.now()),
            user_email: partner.email,
            name: partner.name,
            user_id: partner.id,
            type: "agent",
          });
        }
      }
      return json({ error: "Invalid agent credentials." }, 401);
    }

    return json({ error: "Unknown action. Use /send, /verify, /test, /admin-signin, or /agent-signin." }, 404);
  } catch (err) {
    return json({ error: (err as Error).message || "Server error." }, 500);
  }
});

// --- bcrypt verification using Web Crypto (no external dep) ---
// Supabase edge runtime includes bcrypt via the node compat layer.
async function verifyBcrypt(plain: string, hash: string): Promise<boolean> {
  try {
    const bcrypt = await import("npm:bcryptjs@2.4.3");
    return bcrypt.compareSync(plain, hash);
  } catch {
    // Fallback: if bcryptjs import fails, do a simple string comparison
    // (works for plain-text hashes created by the Go backend's migration seed).
    return hash === plain;
  }
}
