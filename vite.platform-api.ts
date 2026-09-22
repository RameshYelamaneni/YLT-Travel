import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { bitlaCrs } from './src/lib/inventory/mockBitla';
import type { Plugin } from 'vite';

const GO_API = { hostname: '127.0.0.1', port: 8080 };
let goAliveCache: { ok: boolean; at: number } = { ok: false, at: 0 };

function goProcessAlive(): Promise<boolean> {
  const now = Date.now();
  if (now - goAliveCache.at < 2500) return Promise.resolve(goAliveCache.ok);
  return new Promise((resolve) => {
    const req = http.request(
      { ...GO_API, path: '/api/health', method: 'GET', timeout: 700 },
      (res) => {
        res.resume();
        goAliveCache = { ok: (res.statusCode || 500) < 500, at: Date.now() };
        resolve(goAliveCache.ok);
      },
    );
    req.on('error', () => {
      goAliveCache = { ok: false, at: Date.now() };
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      goAliveCache = { ok: false, at: Date.now() };
      resolve(false);
    });
    req.end();
  });
}

function proxyToGo(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  return new Promise((resolve) => {
    const headers = { ...req.headers, host: `${GO_API.hostname}:${GO_API.port}` };
    const proxyReq = http.request(
      { ...GO_API, path: req.url, method: req.method, headers, timeout: 20000 },
      (proxyRes) => {
        res.statusCode = proxyRes.statusCode || 502;
        for (const [k, v] of Object.entries(proxyRes.headers)) {
          if (typeof v !== 'undefined') res.setHeader(k, v);
        }
        proxyRes.pipe(res);
        proxyRes.on('end', () => resolve(true));
      },
    );
    proxyReq.on('error', () => {
      goAliveCache = { ok: false, at: Date.now() };
      resolve(false);
    });
    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      goAliveCache = { ok: false, at: Date.now() };
      resolve(false);
    });
    req.pipe(proxyReq);
  });
}

export type PlatformSettings = {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_secure: boolean;
  email_enabled: boolean;
  payment_provider: 'razorpay' | 'stripe' | 'off';
  payments_enabled: boolean;
  razorpay_key_id: string;
  razorpay_secret: string;
  stripe_secret_key: string;
};

function filePath() {
  return path.join(process.cwd(), 'data', 'platform-settings.json');
}

function loadEnvFile(file: string, into: Record<string, string>) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!into[key]) into[key] = val;
    }
  } catch {
    /* optional */
  }
}

function mergeServerEnv(env: Record<string, string>): Record<string, string> {
  const out = { ...env };
  loadEnvFile(path.join(process.cwd(), '.env'), out);
  loadEnvFile(path.join(process.cwd(), 'backend', '.env'), out);
  const example: Record<string, string> = {};
  loadEnvFile(path.join(process.cwd(), 'backend', '.env.example'), example);
  delete example.OTP_DEV;
  for (const [k, v] of Object.entries(example)) {
    if (!out[k]) out[k] = v;
  }
  return out;
}

function defaults(env: Record<string, string>): PlatformSettings {
  const smtpUser = env.SMTP_USER || '';
  const smtpPass = env.SMTP_PASSWORD || '';
  return {
    smtp_host: env.SMTP_HOST || 'smtp.hostinger.com',
    smtp_port: Number(env.SMTP_PORT || 465) || 465,
    smtp_user: smtpUser,
    smtp_password: smtpPass,
    smtp_from_email: env.SMTP_FROM_EMAIL || 'noreply@ylttravels.com',
    smtp_from_name: env.SMTP_FROM_NAME || 'YLT Travels',
    smtp_secure: env.SMTP_SECURE !== '0' && env.SMTP_SECURE !== 'false',
    email_enabled: env.EMAIL_ENABLED === '1' || env.EMAIL_ENABLED === 'true' || Boolean(smtpUser && smtpPass),
    payment_provider: 'razorpay',
    payments_enabled: true,
    razorpay_key_id: env.RAZORPAY_KEY_ID || '',
    razorpay_secret: env.RAZORPAY_SECRET || env.RAZORPAY_KEY_SECRET || '',
    stripe_secret_key: env.STRIPE_SECRET_KEY || '',
  };
}

function read(env: Record<string, string>): PlatformSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath(), 'utf8')) as Partial<PlatformSettings>;
    return { ...defaults(env), ...raw };
  } catch {
    return defaults(env);
  }
}

function write(settings: PlatformSettings) {
  const dir = path.dirname(filePath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath(), JSON.stringify(settings, null, 2));
}

type OtpRow = { hash: string; exp: number };
type LocalUser = { password: string; name: string };

function otpFile() {
  return path.join(process.cwd(), 'data', 'otp-store.json');
}
function usersFile() {
  return path.join(process.cwd(), 'data', 'local-users.json');
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(file: string, data: unknown) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadOtps(): Record<string, OtpRow> {
  const raw = readJsonFile<Record<string, OtpRow>>(otpFile(), {});
  const now = Date.now();
  const out: Record<string, OtpRow> = {};
  for (const [email, row] of Object.entries(raw || {})) {
    if (row?.hash && row.exp > now) out[email] = row;
  }
  return out;
}

function saveOtps(rows: Record<string, OtpRow>) {
  writeJsonFile(otpFile(), rows);
}

function loadUsers(): Record<string, LocalUser> {
  return readJsonFile<Record<string, LocalUser>>(usersFile(), {});
}

function saveUsers(rows: Record<string, LocalUser>) {
  writeJsonFile(usersFile(), rows);
}

function otpDevEnabled(env: Record<string, string>) {
  // This plugin only runs in Vite dev/preview. Do not inherit OTP_DEV=0 from
  // backend/.env.example (that flag is for the live Go process).
  const fromProc = process.env.OTP_DEV;
  if (fromProc === '0' || fromProc === 'false') return false;
  if (fromProc === '1' || fromProc === 'true') return true;
  if (env.OTP_DEV === '0' || env.OTP_DEV === 'false') return true;
  return true;
}

function genOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashOtp(email: string, code: string) {
  return crypto.createHash('sha256').update(`ylt-otp|${email}|${code}`).digest('hex');
}

function publicView(s: PlatformSettings) {
  return {
    ...s,
    smtp_password: s.smtp_password ? '********' : '',
    smtp_password_set: Boolean(s.smtp_password),
    razorpay_secret: '',
    razorpay_secret_set: Boolean(s.razorpay_secret),
    stripe_secret_key: '',
    stripe_secret_set: Boolean(s.stripe_secret_key),
  };
}

type AttractionBag = {
  ylt_saver_rupees: number;
  price_promise_cap: number;
  referral_credit: number;
  promises: any[];
  referrals: any[];
  coupons: any[];
  redemptions: any[];
  paidEmails: string[];
};

function attractionFile() {
  return path.join(process.cwd(), 'data', 'attraction.json');
}

function attractionDefaults(): AttractionBag {
  return {
    ylt_saver_rupees: 50,
    price_promise_cap: 150,
    referral_credit: 50,
    promises: [],
    referrals: [],
    coupons: [],
    redemptions: [],
    paidEmails: [],
  };
}

function readAttraction(): AttractionBag {
  return { ...attractionDefaults(), ...readJsonFile<Partial<AttractionBag>>(attractionFile(), {}) };
}

function writeAttraction(bag: AttractionBag) {
  writeJsonFile(attractionFile(), bag);
}

function clampNum(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function attractionPublic() {
  const bag = readAttraction();
  return {
    ylt_saver_rupees: clampNum(bag.ylt_saver_rupees, 0, 500, 50),
    price_promise_cap: clampNum(bag.price_promise_cap, 0, 2000, 150),
    referral_credit: clampNum(bag.referral_credit, 0, 500, 50),
  };
}

function saveAttractionSettings(patch: any) {
  if (!patch || typeof patch !== 'object') return;
  const bag = readAttraction();
  if ('ylt_saver_rupees' in patch) bag.ylt_saver_rupees = clampNum(patch.ylt_saver_rupees, 0, 500, bag.ylt_saver_rupees);
  if ('price_promise_cap' in patch) bag.price_promise_cap = clampNum(patch.price_promise_cap, 0, 2000, bag.price_promise_cap);
  if ('referral_credit' in patch) bag.referral_credit = clampNum(patch.referral_credit, 0, 500, bag.referral_credit);
  writeAttraction(bag);
}

function attractionCode(prefix: string, len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = prefix;
  for (let i = 0; i < len; i++) out += alphabet[crypto.randomInt(0, alphabet.length)];
  return out;
}

function imageExt(buf: Buffer) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return '';
}

function promiseDir() {
  return path.join(process.cwd(), 'public', 'uploads', 'price-promise');
}

function storePromiseFile(b64: string) {
  const raw = String(b64 || '').replace(/\s+/g, '');
  if (!raw) return { error: 'Screenshot is required.' };
  const buf = Buffer.from(raw, 'base64');
  if (buf.length < 32 || buf.length > 2_000_000) return { error: 'Screenshot must be under 2 MB.' };
  const ext = imageExt(buf);
  if (!ext) return { error: 'Use a JPG, PNG, or WebP screenshot.' };
  const dir = promiseDir();
  fs.mkdirSync(dir, { recursive: true });
  const name = `${attractionCode('pp', 10)}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return { name };
}

function promiseCouponAmount(our: number, theirs: number, mode: string, capSetting: number) {
  const diff = Math.max(0, our - theirs);
  const under = Math.max(0, our - Math.max(0, theirs - 50));
  let amount = mode === 'under50' ? under : diff;
  let cap = Math.max(0, capSetting);
  const floorCap = Math.floor(our * 0.2);
  if (floorCap > 0) cap = Math.min(cap, floorCap);
  if (cap < 1) return 0;
  return Math.min(amount, cap);
}

function insertCoupon(bag: AttractionBag, amount: number, owner: string, kind: string, source: string, note: string) {
  if (amount < 1) return '';
  const code = attractionCode(kind === 'referral' ? 'REF' : 'PP', 6);
  bag.coupons.unshift({ code, amount, uses_left: 1, owner_email: owner, kind, source_id: source, note, created_at: new Date().toISOString() });
  return code;
}

function customerEmail(req: IncomingMessage) {
  const c = staffClaims(req);
  if (c?.email && String(c.email).includes('@')) return String(c.email).toLowerCase();
  const raw = String(req.headers.authorization || req.headers['x-authorization'] || '').replace(/^Bearer\s+/i, '');
  if (raw.startsWith('local.') && !raw.startsWith('local.staff.') && !raw.startsWith('local.partner.') && raw !== 'local.admin' && raw !== 'local.agent') {
    const rest = raw.slice('local.'.length);
    try {
      const decoded = Buffer.from(rest, 'base64').toString('utf8');
      if (decoded.includes('@')) return decoded.toLowerCase();
    } catch { /* keep rest */ }
    if (rest.includes('@')) return rest.toLowerCase();
  }
  return '';
}

function attractionOnPaid(p: any, pnr: string) {
  const bag = readAttraction();
  const email = String(p.contact_email || '').trim().toLowerCase();
  const coupon = String(p.coupon_code || '').trim().toUpperCase();
  if (coupon) {
    const row = bag.coupons.find((c) => c.code === coupon);
    const owner = String(row?.owner_email || '').toLowerCase();
    if (row && row.uses_left > 0 && (owner === '' || owner === email)) row.uses_left -= 1;
  }
  const ref = String(p.referral_code || '').trim().toUpperCase();
  if (ref && email.includes('@')) {
    const refRow = bag.referrals.find((r) => r.code === ref);
    const owner = String(refRow?.owner_email || '').toLowerCase();
    const first = !bag.paidEmails.includes(email);
    if (refRow && owner && owner !== email && first && !bag.redemptions.some((r) => r.friend_email === email)) {
      const credit = clampNum(bag.referral_credit, 0, 500, 50);
      const id = crypto.randomUUID();
      const code = credit > 0 ? insertCoupon(bag, credit, owner, 'referral', id, 'Refer a friend — first paid trip') : '';
      bag.redemptions.push({ id, code: ref, friend_email: email, pnr, coupon_code: code });
    }
  }
  if (email.includes('@') && !bag.paidEmails.includes(email)) bag.paidEmails.push(email);
  writeAttraction(bag);
}

async function handleAttraction(req: IncomingMessage, res: ServerResponse, url: string): Promise<boolean> {
  const full = new URL(req.url || '/', 'http://local');
  if (url.startsWith('/api/price-promise')) {
    if (req.method === 'GET' && full.searchParams.has('file')) {
      if (!staffIsAdmin(req)) { json(res, 403, { ok: false, error: 'admin required' }); return true; }
      const bag = readAttraction();
      const row = bag.promises.find((p) => p.id === full.searchParams.get('id'));
      const name = String(row?.screenshot_file || '');
      const fullPath = path.join(promiseDir(), path.basename(name));
      if (!name || !fs.existsSync(fullPath)) { json(res, 404, { ok: false, error: 'Screenshot not found.' }); return true; }
      const ext = path.extname(fullPath).slice(1);
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      res.end(fs.readFileSync(fullPath));
      return true;
    }
    if (req.method === 'GET') {
      if (!staffIsAdmin(req)) { json(res, 403, { ok: false, error: 'admin required' }); return true; }
      const bag = readAttraction();
      json(res, 200, {
        ok: true,
        promises: bag.promises.map((p) => ({
          id: p.id,
          route: p.route,
          travel_date: p.travel_date,
          their_price: p.their_price,
          our_fare: p.our_fare,
          contact_email: p.contact_email,
          status: p.status,
          coupon_code: p.coupon_code || '',
          coupon_value: p.coupon_value || 0,
          approve_mode: p.approve_mode || '',
          reject_reason: p.reject_reason || '',
          created_at: p.created_at,
          has_file: Boolean(p.screenshot_file),
        })),
      });
      return true;
    }
    if (req.method === 'POST') {
      const p = await body(req);
      const action = String(p.action || '').toLowerCase();
      if (action === 'approve' || action === 'reject') {
        if (!staffIsAdmin(req)) { json(res, 403, { ok: false, error: 'admin required' }); return true; }
        const bag = readAttraction();
        const row = bag.promises.find((x) => x.id === p.id);
        if (!row) { json(res, 404, { ok: false, error: 'Proof not found.' }); return true; }
        if (row.status !== 'pending') { json(res, 400, { ok: false, error: 'This proof is already reviewed.' }); return true; }
        if (action === 'reject') {
          const reason = String(p.reason || '').trim();
          if (!reason) { json(res, 400, { ok: false, error: 'A reject reason is required.' }); return true; }
          row.status = 'rejected';
          row.reject_reason = reason.slice(0, 500);
          row.reviewed_at = new Date().toISOString();
          writeAttraction(bag);
          json(res, 200, { ok: true, status: 'rejected', message: 'Rejected.' });
          return true;
        }
        const mode = p.mode === 'under50' ? 'under50' : 'difference';
        const amount = promiseCouponAmount(Number(row.our_fare) || 0, Number(row.their_price) || 0, mode, bag.price_promise_cap);
        if (amount < 1) { json(res, 400, { ok: false, error: 'No coupon within the cap for this proof.' }); return true; }
        const note = mode === 'under50' ? 'Price promise — ₹50 under claimed fare, capped' : 'Price promise — difference, capped';
        const code = insertCoupon(bag, amount, String(row.contact_email || '').toLowerCase(), 'price_promise', row.id, note);
        row.status = 'approved';
        row.coupon_code = code;
        row.coupon_value = amount;
        row.approve_mode = mode;
        row.reviewed_at = new Date().toISOString();
        writeAttraction(bag);
        json(res, 200, { ok: true, status: 'approved', coupon_code: code, coupon_value: amount, message: 'Approved. One-time coupon created.' });
        return true;
      }
      const route = String(p.route || '').trim();
      const their = Math.round(Number(p.their_price) || 0);
      if (!route || route.length > 180) { json(res, 400, { ok: false, error: 'Enter the route.' }); return true; }
      if (their < 1 || their > 100000) { json(res, 400, { ok: false, error: 'Enter the fare you found.' }); return true; }
      const stored = storePromiseFile(String(p.screenshot_b64 || ''));
      if (stored.error) { json(res, 400, { ok: false, error: stored.error }); return true; }
      const bag = readAttraction();
      const pending = bag.promises.filter((x) => x.status === 'pending').length;
      if (pending >= 40) { json(res, 429, { ok: false, error: 'You already have proofs waiting for review.' }); return true; }
      const id = crypto.randomUUID();
      bag.promises.unshift({
        id,
        route,
        travel_date: String(p.travel_date || '').slice(0, 20),
        their_price: their,
        our_fare: Math.max(0, Math.round(Number(p.our_fare) || 0)),
        contact_email: String(p.contact_email || '').trim().toLowerCase(),
        screenshot_file: stored.name,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      writeAttraction(bag);
      json(res, 201, { ok: true, id, status: 'pending', message: "We'll review your proof." });
      return true;
    }
  }
  if (url.startsWith('/api/referral')) {
    if (req.method === 'GET') {
      const email = customerEmail(req);
      if (!email.includes('@')) { json(res, 401, { ok: false, error: 'Sign in with an email to refer a friend.' }); return true; }
      const bag = readAttraction();
      let row = bag.referrals.find((r) => r.owner_email === email);
      if (!row) {
        row = { code: attractionCode('YLT', 6), owner_email: email, owner_name: staffClaims(req)?.name || '', created_at: new Date().toISOString() };
        bag.referrals.push(row);
        writeAttraction(bag);
      }
      json(res, 200, {
        ok: true,
        code: row.code,
        credit: clampNum(bag.referral_credit, 0, 500, 50),
        coupons: bag.coupons.filter((c) => String(c.owner_email).toLowerCase() === email && c.uses_left > 0),
      });
      return true;
    }
    if (req.method === 'POST') {
      const p = await body(req);
      const code = String(p.code || '').trim().toUpperCase();
      const bag = readAttraction();
      const row = bag.referrals.find((r) => r.code === code);
      if (!row) { json(res, 200, { ok: true, valid: false, error: 'That refer code is not active.' }); return true; }
      json(res, 200, { ok: true, valid: true, code, credit: clampNum(bag.referral_credit, 0, 500, 50) });
      return true;
    }
  }
  if (url.startsWith('/api/coupons')) {
    if (req.method === 'POST') {
      const p = await body(req);
      const code = String(p.code || '').trim().toUpperCase();
      const email = String(p.email || '').trim().toLowerCase();
      const seat = Math.max(0, Math.round(Number(p.seat_fare) || 0));
      const bag = readAttraction();
      const row = bag.coupons.find((c) => c.code === code);
      if (!row || row.uses_left < 1) { json(res, 200, { ok: false, error: 'That code is used or unknown.' }); return true; }
      const owner = String(row.owner_email || '').toLowerCase();
      if (owner && owner !== email) { json(res, 200, { ok: false, error: 'Sign in with the email this credit was issued to.' }); return true; }
      let amount = Number(row.amount) || 0;
      if (seat > 0) amount = Math.min(amount, seat);
      if (amount < 1) { json(res, 200, { ok: false, error: 'This credit does not apply to a zero fare.' }); return true; }
      json(res, 200, { ok: true, code: row.code, amount, note: row.note || '' });
      return true;
    }
  }
  return false;
}

function body(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(text));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

const pmsMem = new Map<string, { hotels: any[]; customers: any[]; bookings: any[] }>();
const peopleMem = new Map<string, { id: string; name: string; email: string; phone: string }>();

function staffPartnerFromJwt(req: IncomingMessage, payload: any, search: URLSearchParams): string {
  const raw = String(req.headers.authorization || req.headers['x-authorization'] || '').replace(/^Bearer\s+/i, '');
  if (raw === 'local.agent') return 'agent-local';
  if (raw.startsWith('local.partner.')) return raw.slice('local.partner.'.length);
  if (raw === 'local.admin' || raw.startsWith('local.staff.')) return String(payload.partner_id || search.get('partner_id') || '');
  const parts = raw.split('.');
  if (parts.length === 3) {
    try {
      const json = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      if (json?.type === 'agent' && json.sub) return String(json.sub);
      if (json?.type === 'admin') return String(payload.partner_id || search.get('partner_id') || '');
    } catch { /* ignore */ }
  }
  return '';
}

function staffClaims(req: IncomingMessage): { type?: string; role?: string; email?: string; name?: string; sub?: string } | null {
  const raw = String(req.headers.authorization || req.headers['x-authorization'] || '').replace(/^Bearer\s+/i, '');
  if (raw === 'local.admin') return { type: 'admin', role: 'admin', email: 'coreadmin@ylttravels.com', name: 'Core Admin', sub: 'admin-local' };
  if (raw.startsWith('local.staff.')) {
    try {
      return JSON.parse(Buffer.from(raw.slice('local.staff.'.length), 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }
  const parts = raw.split('.');
  if (parts.length === 3) {
    try {
      return JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    } catch { /* ignore */ }
  }
  return null;
}

function staffIsAdmin(req: IncomingMessage): boolean {
  return staffClaims(req)?.type === 'admin';
}

function staffCanPostJobs(req: IncomingMessage): boolean {
  const c = staffClaims(req);
  if (c?.type !== 'admin') return false;
  const role = String(c.role || 'admin').toLowerCase();
  return role === 'admin' || role === '';
}

type OpsJob = { id: string; partner_id: string | null; posted_by?: string; title: string; location: string; department: string; employment_type: string; description: string; requirements?: string; status: string };
type OpsCity = { id: string; partner_id: string; name: string; status: string };
type OpsHelp = { id: string; slug: string; category: string; title: string; summary: string; body: string; is_active: number };
const opsState: {
  help: OpsHelp[];
  jobs: OpsJob[];
  cities: OpsCity[];
  applications: { id: string; job_id: string; name: string; email: string; phone: string; cover_note: string; resume_path?: string; resume_filename?: string; id_proof_path?: string; id_proof_filename?: string; created_at?: string }[];
  policies: { id: string; partner_id: string; name: string; hours_before: number; refund_pct: number; body: string; status: string }[];
  campaigns: { id: string; partner_id: string; title: string; body: string; status: string }[];
  offers: { id: string; promo_code: string; title: string; description: string; discount_value: string; expiry_date: string; is_active: number; tag: string; tone: string }[];
  partners: {
    id: string; email: string; password: string; name: string; agency_name: string; phone: string; city: string;
    status: string; partner_kind: string; source: string; aadhaar_url: string; pan_url: string; gst_url: string;
    aadhaar_filename: string; pan_filename: string; gst_filename: string;
    msme: number; corporate: number; whatsapp_optin: number; terms_accepted: number;
    reject_reason: string; application_payload: string; reviewed_at: string; reviewed_by: string;
    bus_enabled: number; hotel_enabled: number; car_enabled: number; commission_rate: number; created_at: string;
  }[];
  employees: { id: string; email: string; password: string; name: string; role: string; phone: string; status: string; created_at: string }[];
} = {
  help: [
    { id: 'h-tech', slug: 'technical', category: 'Technical issues', title: 'Technical issues', summary: 'Account, tickets, and payment problems', body: 'If checkout fails, retry with the same email so your PNR stays attached. Email care@ylttravels.com with the PNR.', is_active: 1 },
    { id: 'h-ref', slug: 'referral', category: 'Referral help', title: 'Referral help', summary: 'Share YLT with travellers you trust', body: 'Referral credits apply to the next confirmed bus or hotel stay on the same email.', is_active: 1 },
    { id: 'h-book', slug: 'booking', category: 'New booking help', title: 'New booking help', summary: 'How to search, seat, and pay', body: 'Search buses or hotels, pick a date, then pay. Your PNR appears under Bookings after payment.', is_active: 1 },
    { id: 'h-off', slug: 'offers', category: 'Offers', title: 'Offers', summary: 'Promo codes and seasonal fares', body: 'Valid codes are listed on Offers. Enter the code at checkout.', is_active: 1 },
    { id: 'h-pay', slug: 'wallet', category: 'YLT Pay help', title: 'YLT Pay help', summary: 'UPI, cards, and refunds', body: 'We do not keep a stored wallet balance. Refunds return to the original payment method.', is_active: 1 },
  ],
  jobs: [],
  cities: [],
  applications: [],
  policies: [],
  campaigns: [],
  offers: [],
  partners: [],
  employees: [],
};

function localOps() {
  return opsState;
}

type OpsPartner = (typeof opsState.partners)[number];

function partnersFile() {
  return path.join(process.cwd(), 'data', 'onboard-partners.json');
}
function employeesFile() {
  return path.join(process.cwd(), 'data', 'local-employees.json');
}

function loadPersistedOps() {
  const partners = readJsonFile<OpsPartner[]>(partnersFile(), []);
  const employees = readJsonFile<(typeof opsState.employees)>(employeesFile(), []);
  if (Array.isArray(partners) && partners.length) opsState.partners = partners;
  if (Array.isArray(employees) && employees.length) opsState.employees = employees;
}
loadPersistedOps();

function savePartners() {
  writeJsonFile(partnersFile(), opsState.partners);
}
function saveEmployees() {
  writeJsonFile(employeesFile(), opsState.employees);
}

function partnerKindProducts(kind: string) {
  if (kind === 'operator') return { bus: 1, hotel: 0, car: 0 };
  if (kind === 'hotel') return { bus: 0, hotel: 1, car: 0 };
  if (kind === 'insurance') return { bus: 0, hotel: 0, car: 0 };
  return { bus: 1, hotel: 1, car: 0 };
}

function partnerIsKyc(p: OpsPartner) {
  const src = String(p.source || '').toLowerCase();
  if (src === 'kyc') return true;
  if (src === 'admin') return false;
  if (p.status === 'pending' || p.status === 'rejected') return true;
  return Boolean(p.terms_accepted || p.aadhaar_url || p.pan_url || p.gst_url);
}

function partnerQueueOf(p: OpsPartner) {
  const kind = String(p.partner_kind || '').toLowerCase();
  if (kind === 'agent') return 'agent';
  if (kind === 'insurance') return 'insurance';
  return 'partner';
}

function staffRole(req: IncomingMessage) {
  return String(staffClaims(req)?.role || 'admin').toLowerCase();
}

function isCoreAdmin(req: IncomingMessage) {
  const r = staffRole(req);
  return r === 'admin' || r === '';
}

function canKycQueue(req: IncomingMessage, queue: string) {
  if (isCoreAdmin(req)) return true;
  const r = staffRole(req);
  if (r === 'onboard') return queue === 'partner' || queue === 'agent' || queue === 'insurance';
  if (r === 'partner_onboard') return queue === 'partner';
  if (r === 'agent_onboard') return queue === 'agent';
  return false;
}

function publicPartner(p: OpsPartner) {
  const { password: _pw, ...rest } = p;
  let application: Record<string, unknown> | undefined;
  try {
    application = rest.application_payload ? JSON.parse(rest.application_payload) : undefined;
  } catch {
    application = undefined;
  }
  return { ...rest, application };
}

function decodeCareersB64(raw: string): Buffer | null {
  const b64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
  const buf = Buffer.from(b64.replace(/\s+/g, ''), 'base64');
  return buf.length ? buf : null;
}

function careersExt(buf: Buffer, filename: string): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 0, 4) === '%PDF') return 'pdf';
  if (buf[0] === 0xd0 && buf[1] === 0xcf) return 'doc';
  if (buf[0] === 0x50 && buf[1] === 0x4b && /\.docx$/i.test(filename)) return 'docx';
  return '';
}

function storeCareersFile(jobId: string, kind: 'resume' | 'id_proof', buf: Buffer, filename: string) {
  if (buf.length > 6 * 1024 * 1024) return { error: 'File too large. Max 6MB.' };
  const ext = careersExt(buf, filename);
  if (!ext) return { error: 'Use PDF, JPG, PNG, WebP, DOC, or DOCX.' };
  const jobKey = jobId.replace(/[^a-zA-Z0-9-]/g, '');
  if (!jobKey) return { error: 'Invalid job.' };
  const dir = path.join(process.cwd(), 'public', 'uploads', 'careers', jobKey);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${kind === 'id_proof' ? 'id' : 'resume'}-${crypto.randomBytes(12).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  const orig = path.basename(filename.replace(/\\/g, '/')) || `${kind}.${ext}`;
  return { path: `/uploads/careers/${jobKey}/${name}`, filename: orig.slice(0, 255) };
}

function careersMime(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] || 'application/octet-stream';
}

function sendCareersDiskFile(res: ServerResponse, stored: string, filename: string, download: boolean) {
  const rel = stored.replace(/^\/uploads\//, '').replace(/\.\.+/g, '');
  if (!/^careers\/[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(rel)) {
    return json(res, 404, { ok: false, error: 'File not found.' });
  }
  const abs = path.join(process.cwd(), 'public', 'uploads', ...rel.split('/'));
  const root = path.join(process.cwd(), 'public', 'uploads', 'careers');
  if (!abs.startsWith(root) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return json(res, 404, { ok: false, error: 'File not found.' });
  }
  const buf = fs.readFileSync(abs);
  const orig = (filename || path.basename(abs)).replace(/[\r\n"]/g, '');
  res.statusCode = 200;
  res.setHeader('Content-Type', careersMime(abs));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${orig}"`);
  res.end(buf);
}

function findOrCreatePerson(name: string, email: string, phone: string) {
  const ek = email ? `e:${email}` : '';
  const pk = phone ? `p:${phone}` : '';
  const found = (ek && peopleMem.get(ek)) || (pk && peopleMem.get(pk)) || null;
  if (found) {
    if (ek && !peopleMem.has(ek)) peopleMem.set(ek, found);
    if (pk && !peopleMem.has(pk)) peopleMem.set(pk, found);
    if (!found.email && email) found.email = email;
    if (!found.phone && phone) found.phone = phone;
    if (!found.name && name) found.name = name;
    return found;
  }
  const person = { id: crypto.randomUUID(), name: name || 'Guest', email, phone };
  if (ek) peopleMem.set(ek, person);
  if (pk) peopleMem.set(pk, person);
  return person;
}

function localPms(partnerId: string) {
  if (!pmsMem.has(partnerId)) pmsMem.set(partnerId, { hotels: [], customers: [], bookings: [] });
  const bag = pmsMem.get(partnerId)!;
  return {
    addHotel(p: any) {
      const hotel = {
        id: p.id || crypto.randomUUID(),
        partner_id: partnerId,
        name: p.name,
        city: p.city || '',
        address: p.address || '',
        star_rating: p.stars || 3,
        amenities: p.amenities || [],
        image_url: p.photo || p.image_url || '',
        gallery_urls: p.gallery || p.gallery_urls || [],
        contact_phone: p.contactPhone || '',
        sla_verified: 1,
        status: p.status || 'active',
        rooms_available: p.rooms_available || 8,
        price_per_night: p.price_per_night || 2000,
      };
      const i = bag.hotels.findIndex((h) => h.id === hotel.id);
      if (i >= 0) bag.hotels[i] = { ...bag.hotels[i], ...hotel };
      else bag.hotels.unshift(hotel);
      return hotel;
    },
    upsertCustomer(p: any) {
      const email = String(p.email || p.guest_email || '').toLowerCase();
      const phone = String(p.phone || p.guest_phone || '').replace(/\D+/g, '');
      const person = findOrCreatePerson(String(p.name || p.guest_name || ''), email, phone);
      let found = bag.customers.find((c) => (p.id && c.id === p.id) || c.person_id === person.id);
      const next = {
        id: found?.id || p.id || crypto.randomUUID(),
        partner_id: partnerId,
        person_id: person.id,
        name: p.name || p.guest_name || found?.name || person.name,
        email: person.email,
        phone: person.phone,
        city: p.city || found?.city || '',
        tags: p.tags || found?.tags || [],
        notes: Object.prototype.hasOwnProperty.call(p, 'notes') ? p.notes : (found?.notes || ''),
        last_stay: p.last_stay || found?.last_stay || '',
        last_trip: p.last_trip || found?.last_trip || '',
        stays: found?.stays || [],
        trips: found?.trips || [],
      };
      if (found) Object.assign(found, next);
      else bag.customers.unshift(next);
      return next;
    },
    addBooking(p: any) {
      const cust = this.upsertCustomer(p);
      const b = {
        id: crypto.randomUUID(),
        pnr: p.pnr || `YLH${Date.now().toString().slice(-6)}`,
        hotel_id: p.hotel_id || p.hotelId,
        hotel_name: p.hotel_name || p.hotelName,
        guest_name: p.guest_name || p.guestName,
        guest_email: p.guest_email || p.guestEmail,
        guest_phone: p.guest_phone || p.guestPhone,
        check_in: p.check_in || p.checkIn,
        check_out: p.check_out || p.checkOut,
        room_id: p.room_id || p.roomId || '',
        room_number: p.room_number || p.roomNumber || '',
        room_type: p.room_type || p.roomType || '',
        nights: p.nights || 1,
        total_amount: p.total_amount || p.amount || 0,
        status: p.status || 'confirmed',
        customer_id: cust.id,
        person_id: cust.person_id,
        partner_id: partnerId,
      };
      bag.bookings.unshift(b);
      cust.stays = [b, ...(cust.stays || [])];
      cust.last_stay = String(b.check_in || '').slice(0, 10);
      return b;
    },
    snapshot() {
      return {
        hotels: bag.hotels,
        rooms: [],
        bookings: bag.bookings,
        arrivals: [],
        inhouse: [],
        departures: [],
        occupancy_pct: 0,
        guests: bag.customers,
        rate_plans: [],
        folio_charges: [],
        notes: [],
      };
    },
  };
}

export function platformApi(rawEnv: Record<string, string>): Plugin {
  const env = mergeServerEnv(rawEnv);
  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url?.split('?')[0] ?? '';
        if (url === '/uploads/careers' || url.startsWith('/uploads/careers/')) {
          return json(res, 403, { ok: false, error: 'Private careers file. Sign in as Admin or HR to download.' });
        }
        if (url === '/uploads/price-promise' || url.startsWith('/uploads/price-promise/')) {
          return json(res, 403, { ok: false, error: 'Price proof is visible to admin only.' });
        }
        if (!url.startsWith('/api/')) return next();

        const skipGo =
          url === '/api/auth/onboard-signup' ||
          url === '/api/auth/onboard-otp' ||
          url === '/api/auth/agent-signin' ||
          url === '/api/auth/partners' ||
          url.startsWith('/api/auth/partners/') ||
          url === '/api/auth/employees' ||
          url.startsWith('/api/auth/employees/') ||
          url === '/api/uploads.php' ||
          url.startsWith('/api/uploads') ||
          url.startsWith('/api/price-promise') ||
          url.startsWith('/api/referral') ||
          url.startsWith('/api/coupons');
        if (!skipGo && (await goProcessAlive())) {
          const proxied = await proxyToGo(req, res);
          if (proxied) return;
        }

        try {
          if (await handleAttraction(req, res, url)) return;
          if (req.method === 'GET' && url === '/api/settings') {
            const extra = attractionPublic();
            return json(res, 200, { ...publicView(read(env)), ...extra, inventory_provider: 'ylt_db', bitla_api_url: '', bitla_api_key: '', bitla_operator_id: '' });
          }
          if (req.method === 'POST' && url === '/api/settings') {
            const patch = await body(req);
            saveAttractionSettings(patch);
            const current = read(env);
            const rest = { ...patch };
            delete rest.ylt_saver_rupees;
            delete rest.price_promise_cap;
            delete rest.referral_credit;
            write({ ...current, ...rest });
            return json(res, 200, { ok: true, ...attractionPublic() });
          }
          if (req.method === 'GET' && url === '/api/bookings') {
            return json(res, 200, []);
          }
          if (req.method === 'POST' && url === '/api/bookings') {
            const p = await body(req);
            const pnr = p.pnr || `YLT${Date.now().toString().slice(-6)}`;
            attractionOnPaid({ ...p, payment_status: 'paid' }, String(pnr));
            return json(res, 200, { ok: true, pnr });
          }
          if (req.method === 'GET' && url === '/api/erp') {
            return json(res, 200, []);
          }
          if (url.startsWith('/api/erp')) {
            if (req.method === 'GET') return json(res, 200, []);
            const p = await body(req);
            return json(res, 200, { ok: true, ...p, id: p.id || crypto.randomUUID() });
          }

          if (req.method === 'GET' && (url === '/api/offers' || url.startsWith('/api/offers'))) {
            const full = new URL(req.url || '/', 'http://local');
            const all = full.searchParams.has('all');
            const today = new Date().toISOString().slice(0, 10);
            const rows = opsState.offers.filter((o) => {
              if (all) return true;
              if (!o.is_active) return false;
              if (o.expiry_date && o.expiry_date < today) return false;
              return true;
            });
            return json(res, 200, rows);
          }
          if ((req.method === 'POST' || req.method === 'PUT') && (url === '/api/offers' || url.startsWith('/api/offers'))) {
            const p = await body(req);
            const id = String(p.id || crypto.randomUUID());
            const row = {
              id,
              promo_code: String(p.promo_code || '').toUpperCase(),
              title: String(p.title || ''),
              description: String(p.description || ''),
              discount_value: String(p.discount_value || ''),
              expiry_date: String(p.expiry_date || '2026-12-31').slice(0, 10),
              is_active: p.is_active === false || p.is_active === 0 ? 0 : 1,
              tag: String(p.tag || 'Bus'),
              tone: String(p.tone || 'from-navy-800 to-navy-600'),
            };
            const idx = opsState.offers.findIndex((o) => o.id === id);
            if (idx >= 0) opsState.offers[idx] = row;
            else opsState.offers.push(row);
            return json(res, 200, { ok: true, ...row });
          }
          if (req.method === 'DELETE' && url.startsWith('/api/offers')) {
            const full = new URL(req.url || '/', 'http://local');
            const id = full.searchParams.get('id') || '';
            opsState.offers = opsState.offers.filter((o) => o.id !== id);
            return json(res, 200, { ok: true });
          }

          if (req.method === 'GET' && url === '/api/hotels') {
            return json(res, 200, []);
          }
          if (req.method === 'GET' && url === '/api/buses') {
            return json(res, 200, []);
          }

          if (req.method === 'GET' && url === '/api/admin/platform-settings') {
            return json(res, 200, publicView(read(env)));
          }

          if (req.method === 'POST' && url === '/api/admin/platform-settings') {
            const patch = await body(req);
            const current = read(env);
            const nextSettings: PlatformSettings = {
              ...current,
              ...patch,
            };
            if (patch.smtp_password === '********' || patch.smtp_password === '') {
              nextSettings.smtp_password = current.smtp_password;
            }
            if (!patch.razorpay_secret) nextSettings.razorpay_secret = current.razorpay_secret;
            if (!patch.stripe_secret_key) nextSettings.stripe_secret_key = current.stripe_secret_key;
            write(nextSettings);
            return json(res, 200, { ok: true, ...publicView(nextSettings) });
          }

          if (req.method === 'POST' && url === '/api/payments/create-order') {
            const payload = await body(req);
            const s = read(env);
            if (!s.payments_enabled || s.payment_provider !== 'razorpay') {
              return json(res, 400, { success: false, code: 'PAYMENTS_DISABLED', message: 'Payments are not enabled.' });
            }
            if (!s.razorpay_key_id || !s.razorpay_secret) {
              return json(res, 400, { success: false, code: 'PAYMENT_NOT_CONFIGURED', message: 'Add Razorpay keys in Admin → Payments.' });
            }
            const amount = Math.round(Number(payload.amount) || 0);
            if (amount < 1) return json(res, 400, { success: false, code: 'INVALID_AMOUNT', message: 'Invalid amount.' });

            const auth = Buffer.from(`${s.razorpay_key_id}:${s.razorpay_secret}`).toString('base64');
            const rzp = await fetch('https://api.razorpay.com/v1/orders', {
              method: 'POST',
              headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: payload.receipt ?? `ylt_${Date.now()}` }),
            });
            const data = await rzp.json();
            if (!rzp.ok) {
              return json(res, 400, { success: false, code: 'PAYMENT_FAILED', message: 'Could not create payment order.' });
            }
            return json(res, 200, { success: true, key_id: s.razorpay_key_id, order: data });
          }

          if (req.method === 'POST' && url === '/api/payments/verify') {
            const payload = await body(req);
            const s = read(env);
            const expected = crypto
              .createHmac('sha256', s.razorpay_secret)
              .update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`)
              .digest('hex');
            const ok = expected === payload.razorpay_signature;
            if (!ok) return json(res, 400, { success: false, code: 'PAYMENT_FAILED', message: 'Payment signature mismatch.' });
            return json(res, 200, { success: true });
          }

          if (req.method === 'GET' && url === '/api/crs/dashboard') {
            const q = new URL(req.url || '', 'http://localhost');
            const from = q.searchParams.get('from') || 'Hyderabad';
            const to = q.searchParams.get('to') || 'Bengaluru';
            const date = q.searchParams.get('date') || new Date().toISOString().slice(0, 10);
            return json(res, 200, bitlaCrs.dashboard(from, to, date));
          }

          const layoutMatch = url.match(/^\/api\/crs\/trips\/([^/]+)\/layout$/);
          if (req.method === 'GET' && layoutMatch) {
            const data = bitlaCrs.layout(decodeURIComponent(layoutMatch[1]));
            if (!data) return json(res, 404, { success: false, code: 'TRIP_NOT_FOUND', message: 'Trip not in Bitla CRS.' });
            return json(res, 200, data);
          }

          if (req.method === 'POST' && url === '/api/crs/lock') {
            const p = await body(req);
            const r = bitlaCrs.lock(p.tripId, p.seatIds || [], p.channel || 'YLT');
            return json(res, r.ok ? 200 : 409, r);
          }

          if (req.method === 'POST' && url === '/api/crs/release') {
            const p = await body(req);
            return json(res, 200, bitlaCrs.release(p.holdToken));
          }

          if (req.method === 'POST' && url === '/api/crs/book') {
            const p = await body(req);
            const r = bitlaCrs.book(p.holdToken, p.channel || 'YLT');
            return json(res, r.ok ? 200 : 409, r);
          }

          if (req.method === 'POST' && url === '/api/crs/cancel') {
            const p = await body(req);
            const r = bitlaCrs.cancel(p.pnr);
            return json(res, r.ok ? 200 : 404, r);
          }

          if (req.method === 'GET' && url === '/api/health') {
            return json(res, 200, { ok: true, api: 'ylt-vite' });
          }

          if (req.method === 'GET' && url === '/api/auth/me') {
            const raw = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
            if (!raw) return json(res, 401, { error: 'not authenticated' });
            if (raw === 'local.admin') {
              return json(res, 200, { ok: true, user: { email: 'coreadmin@ylttravels.com', name: 'Core Admin', sub: 'admin-local', type: 'admin', role: 'admin' } });
            }
            if (raw.startsWith('local.staff.')) {
              const c = staffClaims(req);
              if (!c || c.type !== 'admin') return json(res, 401, { error: 'not authenticated' });
              return json(res, 200, { ok: true, user: { email: c.email, name: c.name, sub: c.sub, type: 'admin', role: c.role || 'admin' } });
            }
            if (raw.startsWith('local.partner.')) {
              const id = raw.slice('local.partner.'.length);
              const row = opsState.partners.find((p) => p.id === id);
              if (!row || row.status !== 'active') return json(res, 401, { error: 'not authenticated' });
              return json(res, 200, { ok: true, user: { email: row.email, name: row.name, sub: row.id, type: 'agent', partner_kind: row.partner_kind, bus_enabled: row.bus_enabled, hotel_enabled: row.hotel_enabled, car_enabled: row.car_enabled } });
            }
            if (raw === 'local.agent') {
              return json(res, 200, { ok: true, user: { email: env.AGENT_EMAIL || 'agent@ylt.local', name: 'YLT Agent', sub: 'agent-local', type: 'agent', partner_kind: 'agent' } });
            }
            if (raw.startsWith('local.')) {
              const rest = raw.slice(6);
              let email = rest;
              try {
                const decoded = Buffer.from(rest, 'base64').toString('utf8');
                if (decoded.includes('@')) email = decoded;
              } catch {
                /* keep rest */
              }
              return json(res, 200, { ok: true, user: { email, name: email.split('@')[0], sub: email, type: 'customer' } });
            }
            return json(res, 401, { error: 'not authenticated' });
          }

          if (req.method === 'POST' && url === '/api/auth/otp/send') {
            const payload = await body(req);
            const email = String(payload.email || '').trim().toLowerCase();
            if (!email.includes('@')) return json(res, 400, { error: 'Enter a valid email.' });
            const s = read(env);
            const otpDev = otpDevEnabled(env);
            const smtpCfg = {
              ...s,
              smtp_host: env.SMTP_HOST || s.smtp_host,
              smtp_port: Number(env.SMTP_PORT || s.smtp_port) || s.smtp_port,
              smtp_user: env.SMTP_USER || s.smtp_user,
              smtp_password: env.SMTP_PASSWORD || s.smtp_password,
              smtp_from_email: env.SMTP_FROM_EMAIL || s.smtp_from_email,
              smtp_from_name: env.SMTP_FROM_NAME || s.smtp_from_name,
            };
            const smtpReady = Boolean(smtpCfg.smtp_host && smtpCfg.smtp_user && smtpCfg.smtp_password && (s.email_enabled || env.SMTP_USER));
            if (!smtpReady && !otpDev) {
              return json(res, 503, { error: 'Email OTP is not configured. Add SMTP in Admin → Email.' });
            }
            const code = genOtp();
            const otps = loadOtps();
            otps[email] = { hash: hashOtp(email, code), exp: Date.now() + 10 * 60 * 1000 };
            saveOtps(otps);
            if (smtpReady) {
              try {
                const { sendSmtp } = await import('./src/lib/smtp');
                await sendSmtp(smtpCfg, {
                  to: email,
                  subject: 'Your YLT Travels login code',
                  html: `<p>Your YLT Travels login code is</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0b1f3a">${code}</div>`,
                });
              } catch (err) {
                if (!otpDev) return json(res, 500, { error: err instanceof Error ? err.message : 'Could not send OTP email.' });
              }
            }
            const out: Record<string, unknown> = { ok: true, message: 'OTP sent. Check your inbox (and spam folder).' };
            if (otpDev) out.hint = code;
            return json(res, 200, out);
          }

          if (req.method === 'POST' && url === '/api/auth/otp/verify') {
            const payload = await body(req);
            const email = String(payload.email || '').trim().toLowerCase();
            const code = String(payload.code || '').trim();
            const otps = loadOtps();
            const row = otps[email];
            if (!row || row.exp < Date.now()) return json(res, 400, { error: 'OTP expired. Send again.' });
            const got = hashOtp(email, code);
            if (got.length !== row.hash.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(row.hash))) {
              return json(res, 400, { error: 'Invalid code.' });
            }
            delete otps[email];
            saveOtps(otps);
            return json(res, 200, {
              access_token: `local.${Buffer.from(email).toString('base64')}`,
              user_email: email,
              name: email.split('@')[0],
              user_id: email,
            });
          }

          if (req.method === 'POST' && url === '/api/auth/admin-signin') {
            const payload = await body(req);
            const user = String(payload.username || payload.email || '');
            const pass = String(payload.password || '');
            const adminUser = env.CORE_ADMIN_USER || 'CoreAdmin';
            const adminPass = env.CORE_ADMIN_PASS || env.DB_PASSWORD || env.DB_PASS || '';
            if (!adminPass) return json(res, 503, { error: 'Core admin is not configured on the server.' });
            if (user === adminUser && pass === adminPass) {
              return json(res, 200, {
                access_token: 'local.admin',
                user_email: 'coreadmin@ylttravels.com',
                name: 'Core Admin',
                user_id: 'admin-local',
                role: 'admin',
              });
            }
            const emp = opsState.employees.find((e) => (e.email === user.toLowerCase() || e.name === user) && e.status === 'active');
            if (emp && emp.password === pass) {
              const claims = { type: 'admin', role: emp.role || 'admin', email: emp.email, name: emp.name, sub: emp.id };
              return json(res, 200, {
                access_token: 'local.staff.' + Buffer.from(JSON.stringify(claims)).toString('base64'),
                user_email: emp.email,
                name: emp.name,
                user_id: emp.id,
                role: emp.role || 'admin',
              });
            }
            return json(res, 401, { error: 'Invalid admin credentials.' });
          }

          if (req.method === 'POST' && url === '/api/auth/agent-signin') {
            const payload = await body(req);
            const email = String(payload.email || payload.phone || payload.username || '').toLowerCase();
            const pass = String(payload.password || '');
            const pending = opsState.partners.find((p) => p.email === email || p.phone === email);
            if (pending && pending.password === pass) {
              if (pending.status === 'pending') return json(res, 403, { error: 'Your application is under review. YLT will email you after approval.' });
              if (pending.status === 'rejected') return json(res, 403, { error: pending.reject_reason ? `Application declined: ${pending.reject_reason}` : 'Application declined. Contact YLT onboard.' });
              if (pending.status === 'active') {
                return json(res, 200, {
                  access_token: `local.partner.${pending.id}`,
                  user_email: pending.email,
                  name: pending.name,
                  user_id: pending.id,
                  bus_enabled: pending.bus_enabled,
                  hotel_enabled: pending.hotel_enabled,
                  car_enabled: pending.car_enabled,
                  partner_kind: pending.partner_kind,
                });
              }
            }
            if (email === (env.AGENT_EMAIL || 'agent@ylt.local') && pass === (env.AGENT_PASS || 'agent123')) {
              return json(res, 200, {
                access_token: 'local.agent',
                user_email: email,
                name: 'YLT Agent',
                user_id: 'agent-local',
                partner_kind: 'agent',
              });
            }
            return json(res, 401, { error: 'Invalid agent credentials.' });
          }

          if (req.method === 'POST' && url === '/api/auth/onboard-signup') {
            const payload = await body(req);
            const kind = String(payload.partner_kind || 'operator');
            const name = String(payload.name || '').trim();
            const phone = String(payload.phone || '').trim();
            const email = String(payload.email || '').trim().toLowerCase() || `${phone.replace(/\D/g, '')}@onboard.ylttravels.com`;
            if (!name || phone.replace(/\D/g, '').length < 10) return json(res, 400, { error: 'Full name and a valid mobile number are required.' });
            if (opsState.partners.some((p) => p.email === email || p.phone === phone)) return json(res, 409, { error: 'An application with this email or mobile already exists.' });
            const prod = partnerKindProducts(kind);
            const application = {
              partner_kind: kind,
              name,
              email,
              phone,
              agency_name: String(payload.agency_name || ''),
              city: String(payload.city || ''),
              msme: !!payload.msme,
              corporate: !!payload.corporate,
              whatsapp_optin: !!payload.whatsapp_optin,
              terms: true,
              aadhaar_url: String(payload.aadhaar_url || ''),
              pan_url: String(payload.pan_url || ''),
              gst_url: String(payload.gst_url || ''),
              aadhaar_filename: String(payload.aadhaar_filename || ''),
              pan_filename: String(payload.pan_filename || ''),
              gst_filename: String(payload.gst_filename || ''),
              submitted_at: new Date().toISOString(),
            };
            const row: OpsPartner = {
              id: crypto.randomUUID(),
              email,
              password: String(payload.password || ''),
              name,
              agency_name: String(payload.agency_name || ''),
              phone,
              city: String(payload.city || ''),
              status: 'pending',
              partner_kind: kind,
              source: 'kyc',
              aadhaar_url: application.aadhaar_url,
              pan_url: application.pan_url,
              gst_url: application.gst_url,
              aadhaar_filename: application.aadhaar_filename,
              pan_filename: application.pan_filename,
              gst_filename: application.gst_filename,
              msme: application.msme ? 1 : 0,
              corporate: application.corporate ? 1 : 0,
              whatsapp_optin: application.whatsapp_optin ? 1 : 0,
              terms_accepted: 1,
              reject_reason: '',
              application_payload: JSON.stringify(application),
              reviewed_at: '',
              reviewed_by: '',
              bus_enabled: prod.bus,
              hotel_enabled: prod.hotel,
              car_enabled: prod.car,
              commission_rate: 0.08,
              created_at: new Date().toISOString(),
            };
            opsState.partners.unshift(row);
            savePartners();
            return json(res, 201, { ok: true, status: 'pending', id: row.id, message: 'Application submitted. Our onboard team will review it before you can sign in.' });
          }

          if (req.method === 'POST' && url === '/api/auth/onboard-otp') {
            const payload = await body(req);
            const email = String(payload.email || '').trim().toLowerCase();
            const code = String(payload.code || '').replace(/\D/g, '');
            if (!email.includes('@') || code.length !== 6) return json(res, 400, { error: 'Email and 6-digit code required.' });
            const row = opsState.partners.find((p) => p.email === email);
            if (!row) return json(res, 403, { error: 'Invalid agent credentials.' });
            if (row.status === 'pending') return json(res, 403, { error: 'Your application is under review. YLT will email you after approval.' });
            if (row.status === 'rejected') return json(res, 403, { error: row.reject_reason ? `Application declined: ${row.reject_reason}` : 'Application declined. Contact YLT onboard.' });
            if (row.status !== 'active') return json(res, 403, { error: 'This account is not active.' });
            return json(res, 200, {
              access_token: `local.partner.${row.id}`,
              user_email: row.email,
              name: row.name,
              user_id: row.id,
              bus_enabled: row.bus_enabled,
              hotel_enabled: row.hotel_enabled,
              car_enabled: row.car_enabled,
              partner_kind: row.partner_kind,
            });
          }

          if ((req.method === 'GET' || req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') && (url === '/api/auth/partners' || url.startsWith('/api/auth/partners/') || (url.startsWith('/api/auth.php') && String(req.url || '').includes('partners')))) {
            if (!staffIsAdmin(req)) return json(res, 403, { error: 'admin required' });
            const full = new URL(req.url || '/', 'http://local');
            const id = full.searchParams.get('id') || (url.match(/partners\/([^/?]+)/)?.[1] || '');
            const queue = String(full.searchParams.get('queue') || '').toLowerCase();
            if (req.method === 'GET') {
              if (queue && queue !== 'live' && !canKycQueue(req, queue)) return json(res, 403, { error: 'You do not have access to this queue.' });
              if (queue === 'live' && !isCoreAdmin(req)) return json(res, 403, { error: 'Only Core Admin can manage live partners.' });
              const rows = opsState.partners.filter((p) => {
                const kyc = partnerIsKyc(p);
                const q = partnerQueueOf(p);
                if (queue === 'live') return !kyc;
                if (queue === 'partner' || queue === 'agent' || queue === 'insurance') return kyc && q === queue;
                if (kyc) return canKycQueue(req, q);
                return isCoreAdmin(req);
              }).map(publicPartner);
              return json(res, 200, { ok: true, partners: rows, queue: queue || 'all' });
            }
            if (req.method === 'POST' && !id) {
              if (!isCoreAdmin(req)) return json(res, 403, { error: 'Only Core Admin can create live partners.' });
              const payload = await body(req);
              const kind = String(payload.partner_kind || payload.kind || 'agent');
              const prod = partnerKindProducts(kind);
              const row: OpsPartner = {
                id: crypto.randomUUID(),
                email: String(payload.email || '').trim().toLowerCase(),
                password: String(payload.password || 'agent123'),
                name: String(payload.name || payload.email || ''),
                agency_name: String(payload.agency_name || ''),
                phone: String(payload.phone || ''),
                city: String(payload.city || ''),
                status: 'active',
                partner_kind: kind,
                source: 'admin',
                aadhaar_url: '', pan_url: '', gst_url: '',
                aadhaar_filename: '', pan_filename: '', gst_filename: '',
                msme: 0, corporate: 0, whatsapp_optin: 0, terms_accepted: 0,
                reject_reason: '', application_payload: '', reviewed_at: '', reviewed_by: '',
                bus_enabled: payload.bus_enabled === undefined ? prod.bus : (payload.bus_enabled ? 1 : 0),
                hotel_enabled: payload.hotel_enabled === undefined ? prod.hotel : (payload.hotel_enabled ? 1 : 0),
                car_enabled: payload.car_enabled === undefined ? prod.car : (payload.car_enabled ? 1 : 0),
                commission_rate: Number(payload.commission_rate ?? 0.08),
                created_at: new Date().toISOString(),
              };
              if (!row.email) return json(res, 400, { error: 'Email required.' });
              opsState.partners.unshift(row);
              savePartners();
              return json(res, 201, { ok: true, id: row.id, source: 'admin', status: 'active' });
            }
            if (req.method === 'PUT' && id) {
              const payload = await body(req);
              const row = opsState.partners.find((p) => p.id === id);
              if (!row) return json(res, 404, { error: 'Partner not found.' });
              const kyc = partnerIsKyc(row);
              const q = partnerQueueOf(row);
              if (kyc && !canKycQueue(req, q)) return json(res, 403, { error: 'You do not have access to this queue.' });
              if (!kyc && !isCoreAdmin(req)) return json(res, 403, { error: 'Only Core Admin can update live partners.' });
              const nextStatus = String(payload.status || '');
              if (kyc && nextStatus === 'active' && payload.bus_enabled === undefined) {
                const prod = partnerKindProducts(String(payload.partner_kind || row.partner_kind || 'agent'));
                Object.assign(row, { bus_enabled: prod.bus, hotel_enabled: prod.hotel, car_enabled: prod.car });
              }
              const allowed = ['status', 'reject_reason', 'partner_kind', 'agency_name', 'phone', 'city', 'name', 'bus_enabled', 'hotel_enabled', 'car_enabled', 'commission_rate'];
              for (const key of allowed) {
                if (payload[key] !== undefined) (row as any)[key] = payload[key];
              }
              if (kyc && (nextStatus === 'active' || nextStatus === 'rejected')) {
                row.reviewed_at = new Date().toISOString();
                row.reviewed_by = staffClaims(req)?.email || 'admin';
              }
              savePartners();
              return json(res, 200, { ok: true });
            }
            if (req.method === 'DELETE' && id) {
              if (!isCoreAdmin(req)) return json(res, 403, { error: 'Only Core Admin can delete partners.' });
              opsState.partners = opsState.partners.filter((p) => p.id !== id);
              savePartners();
              return json(res, 200, { ok: true });
            }
          }

          if ((req.method === 'GET' || req.method === 'POST' || req.method === 'DELETE') && (url === '/api/auth/employees' || url.startsWith('/api/auth/employees/'))) {
            if (!staffIsAdmin(req) || !isCoreAdmin(req)) return json(res, 403, { error: 'admin required' });
            const full = new URL(req.url || '/', 'http://local');
            const id = full.searchParams.get('id') || (url.match(/employees\/([^/?]+)/)?.[1] || '');
            const reset = url.includes('reset-password');
            if (req.method === 'GET') {
              return json(res, 200, { ok: true, employees: opsState.employees.map(({ password: _pw, ...rest }) => rest) });
            }
            if (req.method === 'POST' && reset && id) {
              const payload = await body(req);
              const row = opsState.employees.find((e) => e.id === id);
              if (row) row.password = String(payload.password || row.password);
              saveEmployees();
              return json(res, 200, { ok: true });
            }
            if (req.method === 'POST') {
              const payload = await body(req);
              const email = String(payload.email || '').trim().toLowerCase();
              if (!email) return json(res, 400, { error: 'Email required.' });
              const emp = {
                id: crypto.randomUUID(),
                email,
                password: String(payload.password || crypto.randomBytes(4).toString('hex')),
                name: String(payload.name || email),
                role: String(payload.role || 'operator'),
                phone: String(payload.phone || ''),
                status: String(payload.status || 'active'),
                created_at: new Date().toISOString(),
              };
              opsState.employees.unshift(emp);
              saveEmployees();
              return json(res, 201, { ok: true, id: emp.id });
            }
            if (req.method === 'DELETE' && id) {
              opsState.employees = opsState.employees.filter((e) => e.id !== id);
              saveEmployees();
              return json(res, 200, { ok: true });
            }
          }

          if (req.method === 'POST' && url === '/api/tickets/email') {
            const payload = await body(req);
            const to = String(payload.to || payload.ticket?.contactEmail || '').trim().toLowerCase();
            const ticket = payload.ticket;
            if (!to.includes('@') || !ticket?.pnr) {
              return json(res, 400, { ok: false, message: 'Email and ticket PNR are required.' });
            }
            const s = read(env);
            const { buildTicketPdf } = await import('./src/lib/ticketPdf');
            const { pkpassBytes, icsContent, ticketEmailHtml, googleCalendarUrl } = await import('./src/lib/ticket');
            const pdf = buildTicketPdf(ticket);
            const pass = pkpassBytes(ticket);
            const ics = new TextEncoder().encode(icsContent(ticket));
            const html = ticketEmailHtml(ticket, { googleUrl: googleCalendarUrl(ticket), appleUrl: '#' });
            if (!s.email_enabled || !s.smtp_host || !s.smtp_user) {
              const dir = path.join(process.cwd(), 'data', 'outbox');
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(path.join(dir, `${ticket.pnr}.html`), html);
              fs.writeFileSync(path.join(dir, `${ticket.pnr}.pdf`), pdf);
              return json(res, 200, { ok: true, queued: true, message: 'SMTP is off. Ticket saved to data/outbox. Enable Admin → Email to send.' });
            }
            const { sendSmtp } = await import('./src/lib/smtp');
            await sendSmtp(s, {
              to,
              subject: `YLT e-ticket ${ticket.pnr} · ${ticket.route}`,
              html,
              attachments: [
                { filename: `YLT-ETicket-${ticket.pnr}.pdf`, contentType: 'application/pdf', bytes: pdf },
                { filename: `YLT-${ticket.pnr}.pkpass`, contentType: 'application/vnd.apple.pkpass', bytes: pass },
                { filename: `YLT-${ticket.pnr}.ics`, contentType: 'text/calendar', bytes: ics },
              ],
            });
            return json(res, 200, { ok: true });
          }

          if (req.method === 'POST' && url === '/api/admin/test-email') {
            const payload = await body(req);
            const s = read(env);
            const to = String(payload.to || s.smtp_user || '').trim();
            if (!s.email_enabled) return json(res, 400, { ok: false, error: 'Enable email in Admin first.' });
            if (!to.includes('@')) return json(res, 400, { ok: false, error: 'Enter a destination email.' });
            const { sendSmtp } = await import('./src/lib/smtp');
            await sendSmtp(s, {
              to,
              subject: 'YLT Travels SMTP test',
              html: '<p>Your YLT Travels SMTP settings work. Booking tickets will include a PDF plus Apple Wallet (.pkpass) and Google Wallet (.ics) attachments.</p>',
            });
            return json(res, 200, { ok: true });
          }

          if (req.method === 'POST' && url === '/api/auth/password') {
            const payload = await body(req);
            const email = String(payload.email || '').trim().toLowerCase();
            const password = String(payload.password || '');
            const name = String(payload.name || email.split('@')[0]);
            const users = loadUsers();
            if (payload.action === 'signup') {
              users[email] = { password, name };
              saveUsers(users);
              return json(res, 200, { access_token: `local.${email}`, user_email: email, name, user_id: email });
            }
            const row = users[email];
            if (!row || row.password !== password) return json(res, 401, { error: 'Invalid email or password. Use Sign Up first, or OTP.' });
            return json(res, 200, { access_token: `local.${email}`, user_email: email, name: row.name, user_id: email });
          }

            if (url === '/api/uploads.php' || url.startsWith('/api/uploads')) {
            const full = new URL(req.url || '/', 'http://local');
            const payload = req.method === 'GET' ? {} : await body(req);
            const resource = full.searchParams.get('resource') || String(payload.resource || '');
            if (resource === 'onboard' && req.method === 'POST') {
              const raw = String(payload.file_data || payload.data || '');
              const b64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
              const buf = Buffer.from(b64.replace(/\s+/g, ''), 'base64');
              if (!buf.length) return json(res, 400, { ok: false, error: 'File data required.' });
              let ext = careersExt(buf, String(payload.filename || payload.file_name || 'document'));
              if (!ext) return json(res, 400, { ok: false, error: 'Use PDF, JPG, PNG, WebP, DOC, or DOCX.' });
              const dir = path.join(process.cwd(), 'public', 'uploads', 'onboard');
              fs.mkdirSync(dir, { recursive: true });
              const name = crypto.randomBytes(16).toString('hex') + '.' + ext;
              fs.writeFileSync(path.join(dir, name), buf);
              const orig = path.basename(String(payload.filename || payload.file_name || name).replace(/\\/g, '/')) || name;
              return json(res, 201, { ok: true, url: `/uploads/onboard/${name}`, filename: orig.slice(0, 255), stored: name });
            }
            const auth = String(req.headers.authorization || req.headers['x-authorization'] || '');
            if (!/^bearer\s+/i.test(auth)) return json(res, 401, { ok: false, error: 'not authenticated' });
            const partnerId = staffPartnerFromJwt(req, payload, full.searchParams);
            if (!partnerId) return json(res, 401, { ok: false, error: 'Sign in as a partner to upload.' });
            if (req.method === 'GET') {
              const dir = path.join(process.cwd(), 'public', 'uploads', partnerId);
              const files = fs.existsSync(dir)
                ? fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).map((f) => ({ url: `/uploads/${partnerId}/${f}`, filename: f }))
                : [];
              return json(res, 200, { ok: true, files });
            }
            if (req.method === 'POST') {
              const raw = String(payload.file_data || payload.data || '');
              const b64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
              const buf = Buffer.from(b64.replace(/\s+/g, ''), 'base64');
              if (!buf.length) return json(res, 400, { ok: false, error: 'Image data required.' });
              if (buf.length > 6 * 1024 * 1024) return json(res, 400, { ok: false, error: 'Image too large. Max 6MB.' });
              let ext = '';
              if (buf[0] === 0xff && buf[1] === 0xd8) ext = 'jpg';
              else if (buf[0] === 0x89 && buf[1] === 0x50) ext = 'png';
              else if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') ext = 'webp';
              else return json(res, 400, { ok: false, error: 'Use a JPG, PNG, or WebP image.' });
              const dir = path.join(process.cwd(), 'public', 'uploads', partnerId);
              fs.mkdirSync(dir, { recursive: true });
              const name = crypto.randomBytes(16).toString('hex') + '.' + ext;
              fs.writeFileSync(path.join(dir, name), buf);
              return json(res, 201, { ok: true, url: `/uploads/${partnerId}/${name}`, filename: name });
            }
            return json(res, 405, { ok: false, error: 'Method not allowed.' });
          }

          if (url === '/api/ops.php' || url.startsWith('/api/ops')) {
            const full = new URL(req.url || '/', 'http://local');
            const resource = full.searchParams.get('resource') || 'help';
            const payload = req.method === 'GET' ? {} : await body(req);
            const ops = localOps();
            if (resource === 'partner-leads' && req.method === 'POST') {
              const name = String(payload.name || '').trim();
              const phone = String(payload.phone || '').trim();
              if (!name || phone.replace(/\D/g, '').length < 10) return json(res, 400, { error: 'Name and a valid mobile number are required.' });
              return json(res, 200, { ok: true, id: crypto.randomUUID(), message: 'Request received. YLT onboard will call you back.' });
            }
            if (resource === 'help' && req.method === 'GET') {
              return json(res, 200, { ok: true, articles: ops.help.filter((a) => a.is_active) });
            }
            if (resource === 'jobs' && req.method === 'GET' && full.searchParams.get('mine') !== '1') {
              return json(res, 200, { ok: true, jobs: ops.jobs.filter((j) => j.status === 'open' && !j.partner_id).map((j) => ({ id: j.id, title: j.title, location: j.location, department: j.department, employment_type: j.employment_type, description: j.description, requirements: j.requirements || '' })) });
            }
            if (resource === 'apply' && req.method === 'POST') {
              const jobId = String(payload.job_id || '');
              const name = String(payload.name || '').trim();
              const email = String(payload.email || '').trim();
              if (!jobId || !name || !email) return json(res, 400, { ok: false, error: 'Name, email, and job are required.' });
              const open = ops.jobs.find((j) => j.id === jobId && j.status === 'open' && !j.partner_id);
              if (!open) return json(res, 404, { ok: false, error: 'This role is not open.' });
              const resumeBuf = decodeCareersB64(String(payload.resume_data || payload.resume || ''));
              const idBuf = decodeCareersB64(String(payload.id_proof_data || payload.id_proof || ''));
              if (!resumeBuf || !idBuf) return json(res, 400, { ok: false, error: 'Resume and ID proof are required.' });
              const resumeStored = storeCareersFile(jobId, 'resume', resumeBuf, String(payload.resume_name || payload.resume_filename || 'resume'));
              if ('error' in resumeStored) return json(res, 400, { ok: false, error: resumeStored.error });
              const idStored = storeCareersFile(jobId, 'id_proof', idBuf, String(payload.id_proof_name || payload.id_proof_filename || 'id-proof'));
              if ('error' in idStored) return json(res, 400, { ok: false, error: idStored.error });
              const id = crypto.randomUUID();
              ops.applications.push({
                id,
                job_id: jobId,
                name,
                email,
                phone: payload.phone || '',
                cover_note: payload.cover_note || '',
                resume_path: resumeStored.path,
                resume_filename: resumeStored.filename,
                id_proof_path: idStored.path,
                id_proof_filename: idStored.filename,
                created_at: new Date().toISOString(),
              });
              return json(res, 201, { ok: true, id });
            }
            const auth = String(req.headers.authorization || req.headers['x-authorization'] || '');
            if (!/^bearer\s+/i.test(auth)) return json(res, 401, { ok: false, error: 'not authenticated' });
            const partnerId = staffPartnerFromJwt(req, payload, full.searchParams);
            if (resource === 'jobs' && req.method === 'GET') {
              if (!staffIsAdmin(req)) return json(res, 403, { ok: false, error: 'Only YLT Admin and HR can manage company jobs.' });
              return json(res, 200, { ok: true, jobs: ops.jobs.filter((j) => !j.partner_id) });
            }
            if (resource === 'jobs' && (req.method === 'POST' || req.method === 'PUT')) {
              if (!staffCanPostJobs(req)) return json(res, 403, { ok: false, error: 'Only Admin can post YLT Travels jobs.' });
              const id = String(payload.id || crypto.randomUUID());
              const title = String(payload.title || '').trim();
              if (!title) return json(res, 400, { ok: false, error: 'Job title required.' });
              const existing = ops.jobs.find((j) => j.id === id && !j.partner_id);
              if (existing) {
                Object.assign(existing, { title, location: payload.location || existing.location, department: payload.department || existing.department, employment_type: payload.employment_type || existing.employment_type, description: payload.description || existing.description, requirements: payload.requirements ?? existing.requirements, status: payload.status || existing.status, partner_id: null });
              } else {
                ops.jobs.push({ id, partner_id: null, posted_by: String(staffClaims(req)?.type || 'admin'), title, location: payload.location || '', department: payload.department || 'Operations', employment_type: payload.employment_type || 'Full-time', description: payload.description || '', requirements: payload.requirements || '', status: payload.status || 'open' });
              }
              return json(res, 200, { ok: true, id });
            }
            if (resource === 'applications' && req.method === 'GET') {
              if (!staffIsAdmin(req)) return json(res, 403, { ok: false, error: 'Only YLT Admin and HR can view applications.' });
              const jobId = String(full.searchParams.get('job_id') || payload.job_id || '');
              const company = ops.applications.filter((a) => ops.jobs.some((j) => j.id === a.job_id && !j.partner_id)).map((a) => ({
                ...a,
                job_title: ops.jobs.find((j) => j.id === a.job_id)?.title || '',
              }));
              return json(res, 200, { ok: true, applications: jobId ? company.filter((a) => a.job_id === jobId) : company });
            }
            if (resource === 'application-file' && req.method === 'GET') {
              if (!staffIsAdmin(req)) return json(res, 403, { ok: false, error: 'Only YLT Admin and HR can view application files.' });
              const id = String(full.searchParams.get('id') || payload.id || '');
              const kind = String(full.searchParams.get('kind') || payload.kind || 'resume');
              const row = ops.applications.find((a) => a.id === id && ops.jobs.some((j) => j.id === a.job_id && !j.partner_id));
              if (!row) return json(res, 404, { ok: false, error: 'Application not found.' });
              const stored = kind === 'id_proof' ? row.id_proof_path : row.resume_path;
              const orig = kind === 'id_proof' ? row.id_proof_filename : row.resume_filename;
              if (!stored) return json(res, 404, { ok: false, error: 'File not found.' });
              return sendCareersDiskFile(res, stored, orig || kind, full.searchParams.has('download'));
            }
            if (resource === 'cities' && req.method === 'GET') {
              if (!partnerId) return json(res, 401, { ok: false, error: 'Partner session required.' });
              return json(res, 200, { ok: true, cities: ops.cities.filter((c) => c.partner_id === partnerId) });
            }
            if (resource === 'cities' && (req.method === 'POST' || req.method === 'PUT')) {
              if (!partnerId) return json(res, 401, { ok: false, error: 'Partner session required.' });
              const name = String(payload.name || '').trim();
              if (!name) return json(res, 400, { ok: false, error: 'City name required.' });
              const existing = ops.cities.find((c) => c.partner_id === partnerId && c.name.toLowerCase() === name.toLowerCase());
              if (existing) return json(res, 200, { ok: true, id: existing.id });
              const id = String(payload.id || crypto.randomUUID());
              ops.cities.push({ id, partner_id: partnerId, name, status: payload.status || 'active' });
              return json(res, 200, { ok: true, id });
            }
            if (resource === 'cities' && req.method === 'DELETE') {
              if (!partnerId) return json(res, 401, { ok: false, error: 'Partner session required.' });
              const id = String(full.searchParams.get('id') || payload.id || '');
              ops.cities = ops.cities.filter((c) => !(c.id === id && c.partner_id === partnerId));
              return json(res, 200, { ok: true });
            }
            if (resource === 'inventory' && req.method === 'GET') {
              if (!partnerId) return json(res, 401, { ok: false, error: 'Partner session required.' });
              return json(res, 200, { ok: true, date: full.searchParams.get('date') || new Date().toISOString().slice(0, 10), booked: 0, blocked: 0, quota: 0, revenue: 0, mix: { office: 0, agent: 0, api: 0, website: 0 }, recent: [] });
            }
            if (resource === 'policies' && req.method === 'GET') {
              return json(res, 200, { ok: true, policies: ops.policies.filter((p) => p.partner_id === partnerId) });
            }
            if (resource === 'policies' && req.method === 'POST') {
              const id = String(payload.id || crypto.randomUUID());
              const name = String(payload.name || '').trim();
              if (!name) return json(res, 400, { ok: false, error: 'Policy name required.' });
              const existing = ops.policies.find((p) => p.id === id);
              if (existing) Object.assign(existing, payload, { name });
              else ops.policies.push({ id, partner_id: partnerId, name, hours_before: payload.hours_before || 6, refund_pct: payload.refund_pct || 80, body: payload.body || '', status: 'active' });
              return json(res, 200, { ok: true, id });
            }
            if (resource === 'campaigns' && req.method === 'GET') {
              return json(res, 200, { ok: true, campaigns: ops.campaigns.filter((c) => c.partner_id === partnerId) });
            }
            if (resource === 'campaigns' && req.method === 'POST') {
              const id = String(payload.id || crypto.randomUUID());
              const title = String(payload.title || '').trim();
              if (!title) return json(res, 400, { ok: false, error: 'Campaign title required.' });
              ops.campaigns.push({ id, partner_id: partnerId, title, body: payload.body || '', status: 'active' });
              return json(res, 200, { ok: true, id });
            }
            if (resource === 'help' && (req.method === 'POST' || req.method === 'PUT')) {
              if (!staffIsAdmin(req)) return json(res, 403, { ok: false, error: 'Admin required to edit YLT Care.' });
              const id = String(payload.id || crypto.randomUUID());
              const title = String(payload.title || '').trim();
              if (!title) return json(res, 400, { ok: false, error: 'Title required.' });
              const existing = ops.help.find((h) => h.id === id);
              if (existing) Object.assign(existing, payload, { title, is_active: 1 });
              else ops.help.push({ id, slug: payload.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), category: payload.category || 'Booking', title, summary: payload.summary || '', body: payload.body || '', is_active: 1 });
              return json(res, 200, { ok: true, id });
            }
            return json(res, 400, { ok: false, error: 'Unknown ops request.' });
          }

          if (url === '/api/pms.php' || url.startsWith('/api/pms') || url === '/api/crm.php' || url.startsWith('/api/crm')) {
            const full = new URL(req.url || '/', 'http://local');
            const resource = full.searchParams.get('resource') || (url.includes('crm') ? 'customers' : 'desk');
            const auth = String(req.headers.authorization || req.headers['x-authorization'] || '');
            if (!/^bearer\s+/i.test(auth)) return json(res, 401, { ok: false, error: 'not authenticated' });
            const payload = req.method === 'GET' ? {} : await body(req);
            const partnerId = staffPartnerFromJwt(req, payload, full.searchParams);
            if (!partnerId) return json(res, 401, { ok: false, error: 'Sign in as a partner to use CRM.' });
            const mem = localPms(partnerId);
            if (resource === 'media' && req.method === 'POST') {
              const raw = String(payload.file_data || payload.data || '');
              const b64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
              const buf = Buffer.from(b64.replace(/\s+/g, ''), 'base64');
              if (!buf.length) return json(res, 400, { ok: false, error: 'Image data required.' });
              if (buf.length > 6 * 1024 * 1024) return json(res, 400, { ok: false, error: 'Image too large. Max 6MB.' });
              let ext = 'jpg';
              if (buf[0] === 0x89) ext = 'png';
              if (buf.toString('ascii', 8, 12) === 'WEBP') ext = 'webp';
              const dir = path.join(process.cwd(), 'public', 'uploads', partnerId);
              fs.mkdirSync(dir, { recursive: true });
              const name = crypto.randomBytes(16).toString('hex') + '.' + ext;
              fs.writeFileSync(path.join(dir, name), buf);
              return json(res, 201, { ok: true, url: `/uploads/${partnerId}/${name}`, filename: name });
            }
            if (resource === 'hotels' && req.method === 'POST') {
              if (!String(payload.name || '').trim()) return json(res, 400, { ok: false, error: 'Hotel name required.' });
              const hotel = mem.addHotel(payload);
              return json(res, 200, { ok: true, id: hotel.id });
            }
            if ((resource === 'customers' || resource === 'crm' || resource === 'guests') && (req.method === 'POST' || req.method === 'PUT')) {
              if (!String(payload.name || payload.guest_name || '').trim()) return json(res, 400, { ok: false, error: 'Customer name required.' });
              const c = mem.upsertCustomer(payload);
              return json(res, 200, { ok: true, id: c.id, customer: c });
            }
            if (resource === 'bookings' && req.method === 'POST') {
              const b = mem.addBooking(payload);
              return json(res, 201, { ok: true, id: b.id, pnr: b.pnr });
            }
            const snap = mem.snapshot();
            return json(res, 200, { ok: true, ...snap, customers: snap.guests });
          }

          return next();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Platform API error.';
          return json(res, 500, { success: false, ok: false, code: 'SERVER_ERROR', message });
        }
  };

  return {
    name: 'ylt-platform-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
