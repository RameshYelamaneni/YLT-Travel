import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
const dist = path.join(root, 'dist');
const downloads = 'C:/Users/yelam/Downloads';
const sourceZip = path.join(downloads, 'ylttravels-hostinger.zip');
const staticZip = path.join(downloads, 'ylttravels-hostinger-static.zip');

const SKIP_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.env',
  '.DS_Store',
  'Thumbs.db',
  'bin',
  'vendor',
]);

function skip(name) {
  if (SKIP_NAMES.has(name)) return true;
  if (name === '.env' || name === '.env.local' || name === '.env.production') return true;
  if (name === '_extract_catalog') return true;
  if (name === 'ylt-api' || name === 'ylt-api.exe' || name.endsWith('.exe')) return true;
  if (name === 'otp-store.json' || name === 'otp-test.json' || name === 'local-users.json' || name === 'onboard-partners.json' || name === 'local-employees.json') return true;
  if (name === 'rzp-test-key.csv') return true;
  return false;
}

function posixJoin(...parts) {
  return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/^\.\//, '');
}

function collectDir(absDir, arcPrefix, files) {
  if (!fs.existsSync(absDir)) {
    throw new Error(`Missing ${absDir}`);
  }
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (skip(ent.name)) continue;
    const abs = path.join(absDir, ent.name);
    const arc = posixJoin(arcPrefix, ent.name);
    if (ent.isDirectory()) collectDir(abs, arc, files);
    else files.push({ abs, arc });
  }
}

function collectNamed(names, files) {
  for (const name of names) {
    const abs = path.join(root, name);
    if (!fs.existsSync(abs)) {
      throw new Error(`Missing required ${name}`);
    }
    const st = fs.statSync(abs);
    const arc = posixJoin(name);
    if (st.isDirectory()) collectDir(abs, arc, files);
    else files.push({ abs, arc });
  }
}

function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ ~0) >>> 0;
}

function dosDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = Math.max(1980, d.getFullYear());
  const dosDate = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  return { dosDate, dosTime };
}

function writeU16(arr, n) {
  arr.push(n & 0xff, (n >>> 8) & 0xff);
}

function writeU32(arr, n) {
  arr.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
}

function writeZip(outPath, files) {
  files.sort((a, b) => a.arc.localeCompare(b.arc));
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    if (file.arc.includes('\\') || file.arc.startsWith('./') || file.arc.startsWith('/')) {
      throw new Error(`Bad zip path: ${file.arc}`);
    }
    const data = fs.readFileSync(file.abs);
    const nameBuf = Buffer.from(file.arc, 'utf8');
    const compressed = zlib.deflateRawSync(data);
    const method = compressed.length < data.length ? 8 : 0;
    const payload = method === 8 ? compressed : data;
    const crc = crc32(data);
    const { dosDate, dosTime } = dosDateTime(fs.statSync(file.abs).mtime);
    const flags = 1 << 11; // UTF-8 names

    const local = [];
    local.push(0x50, 0x4b, 0x03, 0x04);
    writeU16(local, 20);
    writeU16(local, flags);
    writeU16(local, method);
    writeU16(local, dosTime);
    writeU16(local, dosDate);
    writeU32(local, crc);
    writeU32(local, payload.length);
    writeU32(local, data.length);
    writeU16(local, nameBuf.length);
    writeU16(local, 0);
    const localBuf = Buffer.concat([Buffer.from(local), nameBuf, payload]);
    localParts.push(localBuf);

    const central = [];
    central.push(0x50, 0x4b, 0x01, 0x02);
    writeU16(central, 20);
    writeU16(central, 20);
    writeU16(central, flags);
    writeU16(central, method);
    writeU16(central, dosTime);
    writeU16(central, dosDate);
    writeU32(central, crc);
    writeU32(central, payload.length);
    writeU32(central, data.length);
    writeU16(central, nameBuf.length);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU32(central, 0);
    writeU32(central, offset);
    centralParts.push(Buffer.concat([Buffer.from(central), nameBuf]));

    offset += localBuf.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = [];
  eocd.push(0x50, 0x4b, 0x05, 0x06);
  writeU16(eocd, 0);
  writeU16(eocd, 0);
  writeU16(eocd, files.length);
  writeU16(eocd, files.length);
  writeU32(eocd, centralDir.length);
  writeU32(eocd, offset);
  writeU16(eocd, 0);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  fs.writeFileSync(outPath, Buffer.concat([...localParts, centralDir, Buffer.from(eocd)]));
}

function assertSourceLayout(files) {
  const names = new Set(files.map((f) => f.arc));
  const required = [
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'index.html',
    'public/config.js',
  ];
  for (const r of required) {
    if (!names.has(r)) throw new Error(`Zip missing top-level ${r}`);
  }
  if (![...names].some((n) => n.startsWith('src/'))) {
    throw new Error('Zip missing src/ at top level');
  }
  if (![...names].some((n) => n.startsWith('public/'))) {
    throw new Error('Zip missing public/ at top level');
  }
  if (![...names].some((n) => n.startsWith('backend/cmd/server/'))) {
    throw new Error('Zip missing backend/cmd/server Go sources');
  }
  if (!names.has('backend/README.md')) {
    throw new Error('Zip missing backend/README.md');
  }
  for (const php of ['public/api/auth.php', 'public/api/config.php', 'public/api/bootstrap.php', 'public/api/install.php', 'public/api/bookings.php', 'public/api/erp.php', 'public/api/pms.php', 'public/api/crm.php', 'public/api/ops.php', 'public/api/uploads.php', 'public/api/settings.php', 'public/api/offers.php', 'public/api/mail.php', 'public/api/templates.php', 'public/api/chat.php', 'public/api/feedback.php', 'public/api/schema.sql', 'public/media.php']) {
    if (!names.has(php)) throw new Error(`Zip missing ${php}`);
  }
  if ([...names].some((n) => n.startsWith('project/') || n.startsWith('./') || n.includes('\\'))) {
    throw new Error('Zip has wrapper, ./ prefix, or backslashes');
  }
}

if (process.env.YLT_PACK_SOURCE === '1') {
  const sourceFiles = [];
  collectNamed(
    [
      'package.json',
      'package-lock.json',
      'vite.config.ts',
      'vite.platform-api.ts',
      'index.html',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'tailwind.config.js',
      'postcss.config.js',
      '.env.example',
      'src',
      'public',
      'backend',
      'deploy',
      'scripts',
    ],
    sourceFiles,
  );
  assertSourceLayout(sourceFiles);
  writeZip(sourceZip, sourceFiles);
  console.log('created', sourceZip, fs.statSync(sourceZip).size, 'files', sourceFiles.length);
} else {
  console.log('skipped source zip');
}

if (fs.existsSync(dist)) {
  const staticFiles = [];
  collectDir(dist, '', staticFiles);
  if (!staticFiles.some((f) => f.arc === 'index.html')) {
    throw new Error('Static zip missing index.html at zip root');
  }
  for (const php of ['api/auth.php', 'api/config.php', 'api/bootstrap.php', 'api/install.php', 'api/bookings.php', 'api/erp.php', 'api/pms.php', 'api/crm.php', 'api/ops.php', 'api/uploads.php', 'api/settings.php', 'api/offers.php', 'api/mail.php', 'api/templates.php', 'api/chat.php', 'api/feedback.php', 'api/schema.sql', 'uploads/.htaccess', '.htaccess', 'media.php']) {
    if (!staticFiles.some((f) => f.arc === php)) {
      throw new Error(`Static zip missing ${php} next to index.html`);
    }
  }
  writeZip(staticZip, staticFiles);
  console.log('created', staticZip, fs.statSync(staticZip).size, 'files', staticFiles.length);
} else {
  console.warn('dist/ missing — skipped static zip');
}
