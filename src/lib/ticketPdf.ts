import { qrMatrix, splitRoute, TYPE_LABEL, type TicketData } from './ticket';

function pdfEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function toWinAnsi(s: string) {
  return s.replace(/₹/g, 'Rs.').replace(/→/g, '-').replace(/[^\x20-\x7E]/g, '?');
}

/** Boarding-pass PDF (A4) matching redBus / AbhiBus layout: crimson header, PNR, QR, fare. */
export function buildTicketPdf(ticket: TicketData): Uint8Array {
  const { from, to } = splitRoute(ticket.route);
  const matrix = qrMatrix(ticket.qrData) || qrMatrix(ticket.pnr);
  const ops: string[] = [];

  const rgb = (r: number, g: number, b: number) => `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`;
  const RG = (r: number, g: number, b: number) => `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG`;
  const rect = (x: number, y: number, w: number, h: number, fill?: [number, number, number]) => {
    if (fill) ops.push(rgb(...fill));
    ops.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  };
  const text = (str: string, x: number, y: number, size: number, bold = false, color: [number, number, number] = [17, 17, 17]) => {
    ops.push('BT');
    ops.push(rgb(...color));
    ops.push(`/${bold ? 'F2' : 'F1'} ${size} Tf`);
    ops.push(`1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm`);
    ops.push(`(${pdfEscape(toWinAnsi(str))}) Tj`);
    ops.push('ET');
  };

  // Header
  rect(0, 742, 595, 100, [220, 38, 38]);
  rect(0, 742, 595, 8, [159, 18, 57]);
  text('YLT TRAVELS', 36, 812, 18, true, [255, 255, 255]);
  text(TYPE_LABEL[ticket.type].toUpperCase() + '  ·  CONFIRMED', 36, 792, 10, false, [254, 226, 226]);
  text('Show this e-ticket & QR at boarding', 36, 762, 9, false, [254, 202, 202]);

  // PNR card
  rect(400, 758, 160, 68, [255, 255, 255]);
  text('PNR', 414, 808, 8, true, [159, 18, 57]);
  text(ticket.pnr, 414, 782, 14, true, [17, 17, 17]);
  text('Keep this number handy', 414, 768, 7, false, [107, 114, 128]);

  // Route block
  text('BOARDING', 36, 710, 8, true, [107, 114, 128]);
  text(ticket.departure, 36, 682, 26, true, [220, 38, 38]);
  text(from, 36, 658, 16, true);
  text(ticket.date, 36, 640, 10, false, [107, 114, 128]);

  text('DROPPING', 300, 710, 8, true, [107, 114, 128]);
  text(ticket.duration || 'On time', 300, 682, 16, true);
  text(to, 300, 658, 16, true);

  ops.push(RG(254, 202, 202));
  ops.push('1.2 w 36 620 523 0 m l S');

  const rows: [string, string][] = [
    ['Operator', ticket.operator],
    ['Service', ticket.busType || TYPE_LABEL[ticket.type]],
    ['Date of journey', ticket.date],
    ['Seat no.', ticket.seats || '—'],
    ['Passenger', ticket.passengers || ticket.contactEmail || 'Guest'],
    ['Boarding point', ticket.boardingPoint || from],
    ['Mobile', ticket.contactPhone || '—'],
    ['Fare', `Rs. ${ticket.amount}`],
    ['Taxes', `Rs. ${ticket.taxes}`],
    ['Total paid', `Rs. ${ticket.total}`],
  ];
  let y = 590;
  for (const [label, value] of rows) {
    text(label.toUpperCase(), 36, y + 10, 7, true, [107, 114, 128]);
    text(String(value).slice(0, 42), 36, y - 4, 11, true);
    ops.push('0.92 0.92 0.93 RG 0.4 w 36 ' + (y - 12).toFixed(1) + ' 340 0 m l S');
    y -= 32;
  }

  // QR panel
  rect(400, 430, 160, 200, [250, 250, 250]);
  ops.push(RG(229, 231, 235));
  ops.push('1 w 400 430 160 200 re S');
  text('BOARDING QR', 418, 610, 8, true, [159, 18, 57]);
  if (matrix) {
    const n = matrix.length;
    const box = 128;
    const cell = box / n;
    const ox = 416;
    const oy = 448;
    ops.push(rgb(15, 23, 42));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          const py = oy + (n - 1 - r) * cell;
          ops.push(`${(ox + c * cell).toFixed(2)} ${py.toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re f`);
        }
      }
    }
  }
  text(ticket.pnr, 418, 438, 8, true, [107, 114, 128]);

  rect(36, 88, 523, 48, [255, 247, 247]);
  text('Total paid', 52, 108, 10, false, [107, 114, 128]);
  text(`Rs. ${ticket.total}`, 430, 106, 18, true, [220, 38, 38]);

  text('Carry a government photo ID. Report 15 minutes before departure.', 36, 64, 8, false, [107, 114, 128]);
  text('YLT Travels  ·  Tirupati, Andhra Pradesh  ·  ylttravels.com', 36, 48, 8, false, [156, 163, 175]);
  text('Inventory confirmed via CRS. This PDF is your boarding pass.', 36, 34, 8, false, [156, 163, 175]);

  const stream = ops.join('\n');
  const byteLen = (s: string) => new TextEncoder().encode(s).length;
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${byteLen(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let out = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(byteLen(out));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = byteLen(out);
  out += `xref\n0 ${objects.length + 1}\n`;
  out += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

export function ticketPdfBase64(ticket: TicketData): string {
  const bytes = buildTicketPdf(ticket);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function downloadTicketPdf(ticket: TicketData) {
  const bytes = buildTicketPdf(ticket);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `YLT-ETicket-${ticket.pnr}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
