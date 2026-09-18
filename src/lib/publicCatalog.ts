/** Merge restored demo catalog with live partner inventory. Live rows always win. */

export function catalogIdentity(name: string, city: string): string {
  const n = String(name || '')
    .toLowerCase()
    .replace(/^ylt\s+/, '')
    .replace(/[^a-z0-9]+/g, '');
  const c = String(city || '').trim().toLowerCase();
  return `${n}|${c}`;
}

export function busCatalogIdentity(row: {
  from?: string;
  to?: string;
  date?: string;
  operator?: string;
  departure_time?: string;
}): string {
  return [
    row.from,
    row.to,
    row.date,
    String(row.operator || '').replace(/^ylt\s+/i, ''),
    row.departure_time,
  ].map((v) => String(v || '').trim().toLowerCase()).join('|');
}

/**
 * Live partner/API rows first. Catalog rows append only when id and
 * identity key are new — never overwrites a live row.
 */
export function mergeLiveWithCatalog<T extends { id: string }>(
  live: T[],
  catalog: T[],
  identity?: (row: T) => string,
): T[] {
  const byId = new Map<string, T>();
  const keys = new Set<string>();
  const out: T[] = [];

  const take = (row: T, isLive: boolean) => {
    const id = String(row?.id || '').trim();
    if (!id || byId.has(id)) return;
    const key = identity ? identity(row) : '';
    if (!isLive && key && keys.has(key)) return;
    byId.set(id, row);
    if (key) keys.add(key);
    out.push(row);
  };

  for (const row of live) take(row, true);
  for (const row of catalog) take(row, false);
  return out;
}
