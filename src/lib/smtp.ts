// @ts-nocheck — Node SMTP helper used only by Vite middleware, not the browser bundle.
import net from 'node:net';
import tls from 'node:tls';

export type SmtpConfig = {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_secure: boolean;
};

export type MailAttachment = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

function b64(data: Uint8Array | string) {
  return Buffer.from(typeof data === 'string' ? data : Buffer.from(data)).toString('base64');
}

function chunk64(s: string) {
  return s.match(/.{1,76}/g)?.join('\r\n') ?? s;
}

export async function sendSmtp(
  cfg: SmtpConfig,
  opts: { to: string; subject: string; html: string; attachments?: MailAttachment[] },
): Promise<void> {
  const host = cfg.smtp_host;
  const port = cfg.smtp_port || (cfg.smtp_secure ? 465 : 587);
  const socket = await connect(host, port, cfg.smtp_secure);
  const io = wrap(socket);

  await io.expect('220');
  await io.cmd(`EHLO ylttravels.com`, '250');
  if (!cfg.smtp_secure) {
    await io.cmd('STARTTLS', '220');
    const upgraded = await upgrade(socket, host);
    const tlsIo = wrap(upgraded);
    await tlsIo.cmd(`EHLO ylttravels.com`, '250');
    await authAndSend(tlsIo, cfg, opts);
    upgraded.end();
    return;
  }
  await authAndSend(io, cfg, opts);
  socket.end();
}

async function authAndSend(
  io: ReturnType<typeof wrap>,
  cfg: SmtpConfig,
  opts: { to: string; subject: string; html: string; attachments?: MailAttachment[] },
) {
  if (cfg.smtp_user) {
    await io.cmd('AUTH LOGIN', '334');
    await io.cmd(b64(cfg.smtp_user), '334');
    await io.cmd(b64(cfg.smtp_password), '235');
  }
  const from = cfg.smtp_from_email;
  await io.cmd(`MAIL FROM:<${from}>`, '250');
  await io.cmd(`RCPT TO:<${opts.to}>`, '250');
  await io.cmd('DATA', '354');
  await io.raw(buildMime(cfg, opts) + '\r\n.');
  await io.expect('250');
  await io.cmd('QUIT', '221');
}

function buildMime(
  cfg: SmtpConfig,
  opts: { to: string; subject: string; html: string; attachments?: MailAttachment[] },
) {
  const boundary = `ylt_${Date.now()}`;
  const headers = [
    `From: ${cfg.smtp_from_name} <${cfg.smtp_from_email}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  const parts = [
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    chunk64(b64(opts.html)),
  ];
  for (const att of opts.attachments || []) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${att.contentType}; name="${att.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename}"`,
      '',
      chunk64(b64(att.bytes)),
    );
  }
  parts.push(`--${boundary}--`);
  return `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
}

function connect(host: string, port: number, secure: boolean): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const sock = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(sock))
      : net.connect({ host, port }, () => resolve(sock));
    sock.setTimeout(20000);
    sock.on('error', reject);
    sock.on('timeout', () => reject(new Error('SMTP timeout')));
  });
}

function upgrade(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const t = tls.connect({ socket, servername: host }, () => resolve(t));
    t.on('error', reject);
  });
}

function wrap(socket: net.Socket) {
  let buf = '';
  socket.on('data', (d) => { buf += d.toString('utf8'); });
  async function expect(code: string) {
    const start = Date.now();
    while (Date.now() - start < 20000) {
      if (new RegExp(`^${code}[ -]`, 'm').test(buf) && /\d{3} .+\r?\n/.test(buf)) {
        const out = buf;
        buf = '';
        if (!out.split('\n').some((l) => l.startsWith(code))) {
          /* keep waiting for final line */
        }
        if (new RegExp(`^${code} `, 'm').test(out) || out.includes(`\n${code} `)) return out;
        if (out.match(new RegExp(`${code} `))) return out;
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error(`SMTP expected ${code}, got: ${buf.slice(0, 200)}`);
  }
  return {
    expect,
    async cmd(line: string, code: string) {
      socket.write(line + '\r\n');
      return expect(code);
    },
    async raw(payload: string) {
      socket.write(payload + '\r\n');
    },
  };
}
