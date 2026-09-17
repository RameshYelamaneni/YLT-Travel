/**
 * Client-side ticket/PDF + wallet pass utilities (zero external deps).
 * Generates a digital ticket with an inline QR code, a premium printable
 * ticket, and Apple Wallet (.pkpass) / Google Wallet save links.
 */

export interface TicketData {
  pnr: string;
  type: 'bus' | 'car' | 'carpool' | 'lastmile' | 'hotel';
  operator: string;
  route: string;
  date: string;
  departure: string;
  seats?: string;
  passengers?: string;
  amount: number;
  taxes: number;
  total: number;
  contactEmail?: string;
  contactPhone?: string;
  features?: string[];
  boardingPoint?: string;
  qrData: string;
}

export function generatePnr(prefix = 'YLT'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  let pnr = prefix;
  for (let i = 0; i < 4; i++) pnr += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 3; i++) pnr += nums[Math.floor(Math.random() * nums.length)];
  return pnr;
}

export function buildTicket(opts: Omit<TicketData, 'qrData' | 'pnr'> & { pnr?: string }): TicketData {
  const pnr = opts.pnr ?? generatePnr(opts.type === 'car' ? 'YLC' : opts.type === 'carpool' ? 'YLP' : opts.type === 'lastmile' ? 'YLM' : opts.type === 'hotel' ? 'HTL' : 'YLT');
  const qrData = JSON.stringify({ pnr, type: opts.type, operator: opts.operator, route: opts.route, date: opts.date, total: opts.total });
  return { ...opts, pnr, qrData };
}

const TYPE_LABEL: Record<TicketData['type'], string> = {
  bus: 'Bus E-Ticket',
  car: 'Car Booking',
  carpool: 'Car Pool Seat',
  lastmile: 'Last-Mile Ride',
  hotel: 'Hotel Booking',
};

// ---- Inline QR code generator (QR Code Model 2, byte mode, M ECC) ----
// Minimal implementation sufficient for short PNR payloads.

function qrMatrix(text: string): boolean[][] | null {
  try {
    const data = new TextEncoder().encode(text);
    const qr = new QRCode(0, 'M');
    qr.addData(data);
    qr.make();
    const n = qr.getModuleCount();
    const m: boolean[][] = [];
    for (let r = 0; r < n; r++) {
      m[r] = [];
      for (let c = 0; c < n; c++) m[r][c] = qr.isDark(r, c);
    }
    return m;
  } catch {
    return null;
  }
}

function matrixToSvg(matrix: boolean[][] | null, size = 240): string {
  if (!matrix) return '';
  const n = matrix.length;
  const cell = size / n;
  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#ffffff"/><g fill="#0f172a">${rects}</g></svg>`;
}

function qrSvgDataUrl(text: string, size = 240): string {
  const svg = matrixToSvg(qrMatrix(text), size);
  if (!svg) return '';
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

/** Opens a premium printable ticket window. The user can "Save as PDF" via the browser print dialog. */
export async function printTicket(ticket: TicketData): Promise<void> {
  const w = window.open('', '_blank', 'width=480,height=820');
  if (!w) return;
  const qr = qrSvgDataUrl(ticket.qrData, 240);
  const typeLabel = TYPE_LABEL[ticket.type] ?? 'E-Ticket';
  const [fromCity, toCity] = ticket.route.split('→').map((s) => s.trim());
  const features = ticket.features?.length
    ? ticket.features.map((f) => `<span style="display:inline-block;background:#fff5;border:1px solid #ffffff20;border-radius:999px;padding:3px 10px;font-size:10px;margin:2px 4px 2px 0">${f}</span>`).join('')
    : '';

  w.document.write(`<!DOCTYPE html><html><head><title>YLT Ticket ${ticket.pnr}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { font-family:'Inter',-apple-system,Segoe UI,sans-serif; background:#0f0f12; padding:24px; color:#fff; }
    .ticket { max-width:440px; margin:0 auto; background:linear-gradient(180deg,#1a1a20 0%,#0f0f12 100%); border-radius:24px; overflow:hidden; border:1px solid rgba(255,255,255,0.06); box-shadow:0 20px 60px rgba(0,0,0,0.5); }
    .hero { background:linear-gradient(135deg,#e11d48 0%,#9f1239 100%); padding:28px 28px 24px; position:relative; overflow:hidden; }
    .hero::after { content:''; position:absolute; top:-40px; right:-40px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.08); }
    .brand { display:flex; align-items:center; gap:10px; }
    .brand .logo { width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px; }
    .brand h1 { font-size:18px; font-weight:800; letter-spacing:0.3px; }
    .brand p { font-size:10px; opacity:0.85; margin-top:1px; }
    .pnr-label { font-size:10px; opacity:0.8; margin-top:18px; text-transform:uppercase; letter-spacing:1.5px; }
    .pnr { font-size:32px; font-weight:800; letter-spacing:4px; margin-top:2px; }
    .type-badge { display:inline-block; background:rgba(255,255,255,0.18); border-radius:999px; padding:4px 12px; font-size:10px; font-weight:600; margin-top:10px; }
    .route { padding:24px 28px; display:flex; align-items:center; gap:12px; }
    .route .city { flex:1; }
    .route .city .name { font-size:18px; font-weight:700; }
    .route .city .sub { font-size:10px; color:#a8a8b0; text-transform:uppercase; letter-spacing:1px; }
    .route .arrow { color:#c81e44; font-size:22px; }
    .body { padding:8px 28px 24px; }
    .row { display:flex; justify-content:space-between; align-items:center; padding:11px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:13px; }
    .row .lbl { color:#6b6b75; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
    .row .val { color:#fff; font-weight:600; text-align:right; }
    .features { padding:12px 0; }
    .total { display:flex; justify-content:space-between; align-items:center; padding:18px 0 8px; font-size:20px; font-weight:800; }
    .total .val { color:#c81e44; }
    .qr-section { background:rgba(255,255,255,0.03); border-top:1px dashed rgba(255,255,255,0.12); padding:24px; text-align:center; }
    .qr-section img { width:140px; height:140px; border-radius:12px; }
    .qr-section .hint { font-size:10px; color:#6b6b75; margin-top:10px; }
    .footer { text-align:center; padding:16px 28px 24px; font-size:10px; color:#4a4a52; line-height:1.6; }
    .wallet-row { display:flex; gap:8px; justify-content:center; padding:0 28px 20px; }
    .wallet-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; border-radius:12px; padding:10px; font-size:11px; font-weight:600; text-decoration:none; cursor:pointer; border:none; }
    .wallet-btn.apple { background:#111; color:#fff; border:1px solid #333; }
    .wallet-btn.google { background:#fff; color:#1a1a1a; }
    @media print { body { background:#0f0f12; padding:0; } .ticket { box-shadow:none; border:none; } .wallet-row { display:none; } }
  </style></head><body>
  <div class="ticket">
    <div class="hero">
      <div class="brand">
        <div class="logo">Y</div>
        <div><h1>YLT Travels</h1><p>Premium Bus Services</p></div>
      </div>
      <div class="pnr-label">PNR</div>
      <div class="pnr">${ticket.pnr}</div>
      <span class="type-badge">${typeLabel}</span>
    </div>
    <div class="route">
      <div class="city"><div class="sub">From</div><div class="name">${fromCity ?? ticket.route}</div></div>
      <div class="arrow">→</div>
      <div class="city"><div class="sub">To</div><div class="name" style="text-align:right">${toCity ?? ''}</div></div>
    </div>
    ${features ? `<div style="padding:0 28px 8px">${features}</div>` : ''}
    <div class="body">
      <div class="row"><span class="lbl">Operator</span><span class="val">${ticket.operator}</span></div>
      <div class="row"><span class="lbl">Date</span><span class="val">${ticket.date}</span></div>
      <div class="row"><span class="lbl">Departure</span><span class="val">${ticket.departure}</span></div>
      ${ticket.seats ? `<div class="row"><span class="lbl">Seats</span><span class="val">${ticket.seats}</span></div>` : ''}
      ${ticket.passengers ? `<div class="row"><span class="lbl">Passengers</span><span class="val">${ticket.passengers}</span></div>` : ''}
      ${ticket.boardingPoint ? `<div class="row"><span class="lbl">Boarding</span><span class="val">${ticket.boardingPoint}</span></div>` : ''}
      ${ticket.contactPhone ? `<div class="row"><span class="lbl">Contact</span><span class="val">${ticket.contactPhone}</span></div>` : ''}
      <div class="row"><span class="lbl">Amount</span><span class="val">Rs. ${ticket.amount}</span></div>
      <div class="row"><span class="lbl">Taxes</span><span class="val">Rs. ${ticket.taxes}</span></div>
      <div class="total"><span>Total</span><span class="val">Rs. ${ticket.total}</span></div>
    </div>
    <div class="qr-section">
      ${qr ? `<img src="${qr}" alt="QR" />` : '<div style="font-size:12px;color:#6b6b75">PNR: ' + ticket.pnr + '</div>'}
      <div class="hint">Scan to verify · PNR ${ticket.pnr}</div>
    </div>
    <div class="wallet-row">
      <button class="wallet-btn apple" onclick="window.__dl()">Add to Apple Wallet</button>
      <a class="wallet-btn google" href="${googleWalletLink(ticket)}" target="_blank" rel="noopener">Add to Google Wallet</a>
    </div>
    <div class="footer">YLT Travels · Tirupati, Andhra Pradesh<br>Please carry this ticket to board. Arrive 15 min before departure.</div>
  </div>
  <script>
    window.__dl=function(){fetch('${walletPassHref(ticket)}').then(r=>r.blob()).then(b=>{const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='${ticket.pnr}.pkpass';a.click();URL.revokeObjectURL(u);});};
    window.onload=function(){setTimeout(function(){window.print();},400);};
  </script>
  </body></html>`);
  w.document.close();
}

/** Build an Apple Wallet .pkpass-style blob (pass.json + manifest) as a downloadable URL. */
export function walletPassHref(ticket: TicketData): string {
  const passJson = buildPassJson(ticket);
  const manifest = JSON.stringify({ 'pass.json': sha1Hex(passJson) }, null, 2);
  const zip = buildZip({ 'pass.json': passJson, 'manifest.json': manifest });
  return URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/vnd.apple.pkpass' }));
}

/** Generate and download a .pkpass zip (pass.json + manifest.json). */
export async function downloadPkpass(ticket: TicketData): Promise<void> {
  const passJson = buildPassJson(ticket);
  const manifest = JSON.stringify({ 'pass.json': sha1Hex(passJson) }, null, 2);
  const zip = buildZip({ 'pass.json': passJson, 'manifest.json': manifest });
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/vnd.apple.pkpass' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ticket.pnr}.pkpass`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildPassJson(ticket: TicketData): string {
  return JSON.stringify({
    formatVersion: 1,
    passTypeIdentifier: 'com.ylttravels.ticket',
    serialNumber: ticket.pnr,
    description: `YLT Travels ${TYPE_LABEL[ticket.type]}`,
    organizationName: 'YLT Travels',
    teamIdentifier: 'YLTT',
    logoText: 'YLT Travels',
    foregroundColor: 'rgb(255,255,255)',
    backgroundColor: 'rgb(15,15,18)',
    labelColor: 'rgb(168,168,176)',
    eventTicket: {
      primaryFields: [{ key: 'pnr', label: 'PNR', value: ticket.pnr }],
      secondaryFields: [
        { key: 'route', label: 'Route', value: ticket.route },
        { key: 'date', label: 'Date', value: ticket.date },
      ],
      auxiliaryFields: [
        { key: 'dep', label: 'Departure', value: ticket.departure },
        { key: 'seats', label: 'Seats', value: ticket.seats ?? '—' },
      ],
    },
    barcodes: [{ format: 'PKBarcodeFormatQR', message: ticket.qrData, messageEncoding: 'iso-8859-1', altText: ticket.pnr }],
  }, null, 2);
}

/** Google Wallet save link (deep-link style). */
export function googleWalletLink(ticket: TicketData): string {
  const text = encodeURIComponent(`YLT Travels ${TYPE_LABEL[ticket.type]} · PNR ${ticket.pnr} · ${ticket.route} · ${ticket.date} ${ticket.departure}`);
  return `https://www.google.com/maps/save/place/${text}`;
}

// ---- Minimal ZIP writer (store / no compression) ----
// Produces a valid ZIP archive readable by Apple Wallet and standard unzip tools.

function buildZip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const fileEntries = Object.entries(files).map(([name, content]) => {
    const nameBytes = enc.encode(name);
    const data = enc.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // method (store)
    lv.setUint16(10, 0, true); // time
    lv.setUint16(12, 0, true); // date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    return { name: nameBytes, data, crc, local, offset: 0 };
  });

  let offset = 0;
  let central = [];
  for (const e of fileEntries) {
    e.offset = offset;
    offset += e.local.length;
    const c = new Uint8Array(46 + e.name.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, e.crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, e.name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, e.offset, true);
    c.set(e.name, 46);
    central.push(c);
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const centralOffset = offset;
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, fileEntries.length, true);
  ev.setUint16(10, fileEntries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralOffset, true);
  ev.setUint16(20, 0, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const e of fileEntries) { out.set(e.local, p); p += e.local.length; }
  for (const c of central) { out.set(c, p); p += c.length; }
  out.set(end, p);
  return out;
}

function crc32(data: Uint8Array): number {
  let table = (crc32 as any).t as number[] | undefined;
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as any).t = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function sha1Hex(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const bitLen = len * 8;
  const padded = new Uint8Array(((len + 8) >> 6) * 64 + 64);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array(80);
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = ((x << 1) | (x >>> 31)) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = ((((a << 5) | (a >>> 27)) >>> 0) + f + e + k + w[j]) >>> 0;
      e = d; d = c; c = ((b << 30) | (b >>> 2)) >>> 0; b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((h) => h.toString(16).padStart(8, '0')).join('');
}

// ---- Inline QR Code Model 2 implementation (byte mode, ECC level M) ----
// Adapted minimal version for short UTF-8 payloads.

class QRCode {
  private modules: boolean[][] = [];
  private moduleCount = 0;
  private dataCache: number[] | null = null;
  private typeNumber: number;
  private errorCorrectLevel: 'M';

  constructor(typeNumber: number, errorCorrectLevel: 'M') {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  addData(data: Uint8Array) {
    // Pick smallest type number that fits the data in byte mode with ECC M.
    for (let t = 1; t <= 40; t++) {
      if (data.length <= QRCodeCapacity.getMaxDataLength(t, 'M')) {
        this.typeNumber = t;
        break;
      }
    }
    this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, data);
  }

  isDark(r: number, c: number) { return this.modules[r][c]; }
  getModuleCount() { return this.moduleCount; }

  make() {
    this.makeImpl(true, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let r = 0; r < this.moduleCount; r++) {
      this.modules[r] = new Array(this.moduleCount);
      for (let c = 0; c < this.moduleCount; c++) this.modules[r][c] = false;
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) this.setupTypeNumber(test);
    if (this.dataCache == null) throw new Error('dataCache is null');
    this.mapData(this.dataCache, maskPattern);
  }

  private setupPositionProbePattern(r: number, c: number) {
    for (let i = -1; i <= 7; i++) {
      if (r + i <= -1 || this.moduleCount <= r + i) continue;
      for (let j = -1; j <= 7; j++) {
        if (c + j <= -1 || this.moduleCount <= c + j) continue;
        if ((0 <= i && i <= 6 && (j == 0 || j == 6)) || (0 <= j && j <= 6 && (i == 0 || i == 6)) || (2 <= i && i <= 4 && 2 <= j && j <= 4)) {
          this.modules[r + i][c + j] = true;
        } else {
          this.modules[r + i][c + j] = false;
        }
      }
    }
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRCodeUtil.getLostPoint(this);
      if (i == 0 || minLostPoint > lostPoint) { minLostPoint = lostPoint; pattern = i; }
    }
    return pattern;
  }

  private setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] != null) continue;
      this.modules[r][6] = r % 2 == 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] != null) continue;
      this.modules[6][c] = c % 2 == 0;
    }
  }

  private setupPositionAdjustPattern() {
    const pos = QRCodeUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const r = pos[i], c = pos[j];
        if (this.modules[r][c] != null) continue;
        for (let k = -2; k <= 2; k++) {
          for (let l = -2; l <= 2; l++) {
            if (k == -2 || k == 2 || l == -2 || l == 2 || (k == 0 && l == 0)) this.modules[r + k][c + l] = true;
            else this.modules[r + k][c + l] = false;
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean) {
    const bits = QRCodeUtil.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;
      this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;
      this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number) {
    const data = (0 << 3) | maskPattern;
    const bits = QRCodeUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;
      if (i < 6) this.modules[i][8] = mod;
      else if (i < 8) this.modules[i + 1][8] = mod;
      else this.modules[this.moduleCount - 15 + i][8] = mod;
    }
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;
      if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
      else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
      else this.modules[8][15 - i - 1] = mod;
    }
    this.modules[this.moduleCount - 8][8] = !test;
  }

  private mapData(data: number[], maskPattern: number) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) == 1;
            const mask = QRCodeUtil.getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex == -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
      }
    }
  }

  private static createData(typeNumber: number, _ecl: 'M', data: Uint8Array): number[] {
    const rsBlocks = QRCodeCapacity.getRSBlocks(typeNumber, 'M');
    const buffer = new QRBitBuffer();
    buffer.put(4, 4); // mode byte
    buffer.put(data.length, QRCodeCapacity.getLengthBits(typeNumber));
    for (let i = 0; i < data.length; i++) buffer.put(data[i], 8);
    if (buffer.length + 4 <= buffer.totalBitCount) buffer.put(0, 4);
    while (buffer.length % 8 != 0) buffer.putBit(false);
    // padding bytes
    const pad = 0xec;
    let p = 0;
    while (buffer.length < buffer.totalBitCount) { buffer.put((p & 1) ? 0x11 : pad, 8); p++; }
    const result: number[] = [];
    let offset = 0;
    const maxDc = rsBlocks.reduce((s, b) => s + b.dataCount, 0);
    for (const block of rsBlocks) {
      const dc = block.dataCount;
      const ec = block.totalCount - dc;
      const dataPart = buffer.getBytes(offset, dc);
      offset += dc;
      const ecPart = QRMath.galoisEc(dataPart, ec);
      result.push(...dataPart, ...ecPart);
      if (result.length > maxDc + rsBlocks.reduce((s, b) => s + (b.totalCount - b.dataCount), 0)) break;
    }
    return result;
  }
}

class QRMath {
  static EXP = new Array(256);
  static LOG = new Array(256);
  static initialized = false;
  static init() {
    if (this.initialized) return;
    let x = 1;
    for (let i = 0; i < 8; i++) this.EXP[i] = x;
    for (let i = 8; i < 256; i++) {
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
      this.EXP[i] = x;
    }
    for (let i = 0; i < 255; i++) this.LOG[this.EXP[i]] = i;
    this.initialized = true;
  }
  static gmul(a: number, b: number): number {
    if (a == 0 || b == 0) return 0;
    this.init();
    return this.EXP[(this.LOG[a] + this.LOG[b]) % 255];
  }
  static galoisEc(data: number[], ecLen: number): number[] {
    this.init();
    const rs = new Array(ecLen).fill(0);
    for (let i = 0; i < data.length; i++) {
      const m = rs[ecLen - 1] ^ data[i];
      for (let j = ecLen - 1; j > 0; j--) rs[j] = rs[j - 1] ^ this.gmul(m, ecPoly(ecLen)[j]);
      rs[0] = this.gmul(m, ecPoly(ecLen)[0]);
    }
    return rs.reverse();
  }
}

let _ecPolyCache: Record<number, number[]> = {};
function ecPoly(n: number): number[] {
  if (_ecPolyCache[n]) return _ecPolyCache[n];
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= QRMath.gmul(poly[j], QRMath.EXP[i]);
    }
    poly = next;
  }
  _ecPolyCache[n] = poly;
  return poly;
}

class QRBitBuffer {
  buffer: number[] = [];
  length = 0;
  totalBitCount = 0;
  constructor() {}
  put(num: number, len: number) {
    for (let i = 0; i < len; i++) {
      this.putBit(((num >>> (len - i - 1)) & 1) == 1);
    }
  }
  putBit(bit: boolean) {
    const idx = Math.floor(this.length / 8);
    if (this.buffer.length <= idx) this.buffer.push(0);
    if (bit) this.buffer[idx] |= 0x80 >>> (this.length % 8);
    this.length++;
  }
  getBytes(offset: number, count: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(this.buffer[offset + i] ?? 0);
    return out;
  }
}

const QRCodeUtil = {
  getLostPoint(qr: QRCode): number {
    const n = qr.getModuleCount();
    let lostPoint = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let sameCount = 0;
        const dark = qr.isDark(r, c);
        for (let dr = -1; dr <= 1; dr++) {
          if (r + dr < 0 || n <= r + dr) continue;
          for (let dc = -1; dc <= 1; dc++) {
            if (dr == 0 && dc == 0) continue;
            if (c + dc < 0 || n <= c + dc) continue;
            if (dark == qr.isDark(r + dr, c + dc)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }
    return lostPoint;
  },
  getPatternPosition(typeNumber: number): number[] {
    return QRPositionPattern[typeNumber] ?? [];
  },
  getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRCodeUtil.getBCHDigit(d) - QRCodeUtil.getBCHDigit(0x537) >= 0) d ^= 0x537 << (QRCodeUtil.getBCHDigit(d) - QRCodeUtil.getBCHDigit(0x537));
    return (data << 10 | d) ^ 0x5412;
  },
  getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QRCodeUtil.getBCHDigit(d) - QRCodeUtil.getBCHDigit(0x1f25) >= 0) d ^= 0x1f25 << (QRCodeUtil.getBCHDigit(d) - QRCodeUtil.getBCHDigit(0x1f25));
    return (data << 12 | d);
  },
  getBCHDigit(data: number): number {
    let digit = 0;
    while (data != 0) { digit++; data >>>= 1; }
    return digit;
  },
  getMask(maskPattern: number, r: number, c: number): boolean {
    switch (maskPattern) {
      case 0: return (r + c) % 2 == 0;
      case 1: return r % 2 == 0;
      case 2: return c % 3 == 0;
      case 3: return (r + c) % 3 == 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 == 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) == 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 == 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 == 0;
      default: throw new Error('bad mask:' + maskPattern);
    }
  },
};

// Position adjustment pattern positions per type number
const QRPositionPattern: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66], 15: [6, 26, 48, 70],
  16: [6, 26, 50, 74], 17: [6, 30, 54, 78], 18: [6, 30, 56, 82], 19: [6, 30, 58, 86], 20: [6, 34, 62, 90],
};

// Capacity table: max data bytes for byte mode, ECC level M
const QRCodeCapacity = {
  getLengthBits(t: number): number { return t < 10 ? 8 : t < 27 ? 16 : 16; },
  getMaxDataLength(t: number, _ecl: 'M'): number {
    const cap: Record<number, number> = {
      1: 14, 2: 26, 3: 42, 4: 62, 5: 84, 6: 106, 7: 122, 8: 152, 9: 180, 10: 213,
      11: 251, 12: 287, 13: 331, 14: 362, 15: 412, 16: 450, 17: 504, 18: 553, 19: 607, 20: 659,
    };
    return cap[t] ?? 0;
  },
  getRSBlocks(t: number, _ecl: 'M'): { totalCount: number; dataCount: number }[] {
    // Simplified: returns blocks for ECC level M per type number
    const table: Record<number, [number, number, number][]> = {
      1: [[1, 26, 19]],
      2: [[1, 44, 34]],
      3: [[1, 70, 55]],
      4: [[1, 100, 80]],
      5: [[1, 134, 108]],
      6: [[2, 86, 68]],
      7: [[2, 98, 78]],
      8: [[2, 121, 97]],
      9: [[2, 146, 116]],
      10: [[2, 86, 68], [2, 87, 69]],
      11: [[4, 101, 81]],
      12: [[2, 116, 92], [2, 117, 93]],
      13: [[4, 133, 107]],
      14: [[4, 144, 116], [1, 145, 115]],
      15: [[6, 135, 108], [2, 136, 109]],
      16: [[8, 101, 81], [4, 102, 82]],
      17: [[8, 117, 93], [4, 118, 94]],
      18: [[8, 133, 107], [4, 134, 108]],
      19: [[12, 101, 81], [4, 102, 82]],
      20: [[11, 135, 108], [5, 136, 109]],
    };
    const blocks = table[t] ?? table[20];
    const out: { totalCount: number; dataCount: number }[] = [];
    for (const [count, total, data] of blocks) {
      for (let i = 0; i < count; i++) out.push({ totalCount: total, dataCount: data });
    }
    return out;
  },
};
