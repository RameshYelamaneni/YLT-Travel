import type { Bus } from '../types';
import { TIRUMALA_PACKAGES } from './tirumalaPackages';
import { formatINR } from '../lib/format';

export type TripBundleKind = 'hotel' | 'package';

export interface TripBundle {
  id: string;
  kind: TripBundleKind;
  title: string;
  city: string;
  detail: string;
  price: number;
  saving?: number;
  hrefView: { name: 'hotels' } | { name: 'packages'; slug?: string } | { name: 'hotelResults' };
}

function cityAlias(city: string) {
  if (/bengaluru|bangalore/i.test(city)) return ['Bengaluru', 'Bangalore'];
  return [city];
}

/** One-tap stay / Tirumala upsell from existing catalog hotels + packages. */
export function tripBundlesFor(bus: Bus): TripBundle[] {
  const dest = bus.to;
  const origin = bus.from;
  const save = bus.hotel_bundle_saving || 180;
  const out: TripBundle[] = [];

  const destHotels: { city: string; title: string; price: number; detail: string }[] = [];
  if (/tirupati|tirumala/i.test(dest)) {
    destHotels.push({
      city: 'Tirupati',
      title: 'YLT Temple View Residency',
      price: Math.max(1499, 2100 - save),
      detail: 'Walk to the RTC stand. Early checkout for darshan.',
    });
  } else if (/hyderabad/i.test(dest)) {
    destHotels.push({
      city: 'Hyderabad',
      title: 'YLT Business Suites',
      price: Math.max(2199, 3200 - save),
      detail: 'Jubilee Hills stay after the overnight coach.',
    });
  } else if (/chennai/i.test(dest)) {
    destHotels.push({
      city: 'Chennai',
      title: 'YLT City Comfort',
      price: Math.max(1299, 1900 - save),
      detail: '200m from CMBT — same-night check-in.',
    });
  } else if (/bengaluru|bangalore/i.test(dest)) {
    destHotels.push({
      city: 'Bengaluru',
      title: 'YLT Heritage Inn',
      price: Math.max(1599, 2400 - save),
      detail: 'Beside Kempegowda stand. 24×7 front desk.',
    });
  } else {
    destHotels.push({
      city: dest,
      title: `Stay in ${dest}`,
      price: Math.max(1299, 1800 - Math.min(save, 400)),
      detail: 'Partner hotel near the dropping point.',
    });
  }

  for (const h of destHotels) {
    out.push({
      id: `hotel-${h.city}`,
      kind: 'hotel',
      title: h.title,
      city: h.city,
      detail: h.detail,
      price: h.price,
      saving: save,
      hrefView: { name: 'hotelResults' },
    });
  }

  const viaHotel = (bus.via[0] || bus.rest_stops?.[0]?.name || '').replace(/ rest stop| highway.*$/i, '').trim();
  if (viaHotel && !cityAlias(dest).some((c) => viaHotel.toLowerCase().includes(c.toLowerCase()))) {
    out.push({
      id: `hotel-enroute-${viaHotel}`,
      kind: 'hotel',
      title: `Highway halt · ${viaHotel}`,
      city: viaHotel,
      detail: 'Optional en-route night halt if you break the journey.',
      price: 1299,
      hrefView: { name: 'hotels' },
    });
  }

  const pkg = TIRUMALA_PACKAGES.find((p) =>
    cityAlias(origin).some((c) => c.toLowerCase() === p.origin.toLowerCase())
    || cityAlias(dest).some((c) => /tirupati/i.test(c) && cityAlias(origin).some((o) => o.toLowerCase() === p.origin.toLowerCase())),
  ) || (/tirupati|tirumala/i.test(dest) ? TIRUMALA_PACKAGES[0] : undefined);

  if (pkg) {
    out.push({
      id: `pkg-${pkg.slug}`,
      kind: 'package',
      title: pkg.title,
      city: 'Tirumala',
      detail: `${pkg.nights} night · from ${formatINR(pkg.priceFrom)} · bus + Tirupati hotel`,
      price: pkg.priceFrom,
      hrefView: { name: 'packages', slug: pkg.slug },
    });
  } else if (!/tirupati|tirumala/i.test(dest)) {
    out.push({
      id: 'pkg-browse',
      kind: 'package',
      title: 'Tirumala darshan packages',
      city: 'Tirupati',
      detail: 'Add a bus + hotel package from Hyderabad, Bengaluru, or Chennai.',
      price: TIRUMALA_PACKAGES[0].priceFrom,
      hrefView: { name: 'packages' },
    });
  }

  return out.slice(0, 3);
}
