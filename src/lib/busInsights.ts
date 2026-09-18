import type { Bus, CancellationPolicy, RouteStop } from '../types';
import { formatINR } from './format';

export type BusDetailsTab =
  | 'insights'
  | 'ratings'
  | 'offers'
  | 'boarding'
  | 'cancellation'
  | 'amenities'
  | 'policy';

export interface ResultChip {
  id: string;
  label: string;
  tab: BusDetailsTab;
  kind: 'trust' | 'amenity' | 'offer' | 'point';
}

export interface TripOffer {
  id: string;
  title: string;
  detail: string;
  badge: string;
  code?: string;
  applied?: boolean;
}

export interface CancelSlab {
  when: string;
  refundLabel: string;
  pct: number;
}

export interface SafetyItem {
  id: string;
  label: string;
  status: 'ready' | 'pending';
  detail: string;
}

function shiftIsoDate(date: string, days: number) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function isMostTrusted(bus: Bus) {
  return bus.rating >= 4.5 && bus.reviews >= 80;
}

export function hasYltSafe(bus: Bus) {
  return bus.sla_verified || bus.women_safety;
}

function amenityKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function tripAmenities(bus: Bus): string[] {
  const list = [...bus.amenities];
  if (bus.is_ac && !list.some((a) => amenityKey(a) === 'ac')) list.unshift('AC');
  if (bus.live_tracking && !list.some((a) => /gps/i.test(a))) list.push('GPS Tracking');
  if (bus.night_crew && !list.some((a) => amenityKey(a) === 'nightcrew')) list.push('Night crew');
  if (bus.meals && !list.some((a) => /snack|meal/i.test(a))) list.push('Meals');
  if (bus.accessible && !list.includes('Wheelchair access')) list.push('Wheelchair access');
  return list;
}

export function tickerLines(bus: Bus): string[] {
  const lines: string[] = [];
  if (bus.original_price > bus.price) {
    lines.push(`${formatINR(bus.original_price - bus.price)} off auto-applied on this fare`);
  }
  if (bus.delay_guarantee) lines.push('Delay cover: 10% back if late by 30+ min');
  if (bus.hotel_bundle_saving > 0) lines.push(`Save ${formatINR(bus.hotel_bundle_saving)} when you add a YLT hotel`);
  if (bus.prime) lines.push('YLT Prime boarding on this service');
  lines.push('YLT Rewards: complimentary ticket after 4 trips');
  return lines;
}

const CARD_CHIP_LIMIT = 4;

export function resultChips(bus: Bus): ResultChip[] {
  const amenities = tripAmenities(bus);
  const chips: ResultChip[] = [];
  const used = new Set<string>();

  const push = (chip: ResultChip, key: string) => {
    if (chips.length >= CARD_CHIP_LIMIT || used.has(key)) return;
    used.add(key);
    chips.push(chip);
  };

  if (bus.live_tracking) {
    push({ id: 'gps', label: 'GPS', tab: 'amenities', kind: 'amenity' }, 'gps');
  }
  if (bus.is_ac || amenities.some((a) => amenityKey(a) === 'ac')) {
    push({ id: 'am-AC', label: 'AC', tab: 'amenities', kind: 'amenity' }, 'ac');
  }
  push({ id: 'points', label: 'Boarding', tab: 'boarding', kind: 'point' }, 'boarding');
  if (bus.original_price > bus.price) {
    push({
      id: 'fare-off',
      label: `${formatINR(bus.original_price - bus.price)} off`,
      tab: 'offers',
      kind: 'offer',
    }, 'offer');
  } else if (bus.delay_guarantee) {
    push({ id: 'delay-off', label: 'Delay cover', tab: 'offers', kind: 'offer' }, 'offer');
  }
  if (chips.length < 3 && bus.night_crew) {
    push({ id: 'night', label: 'Night crew', tab: 'amenities', kind: 'amenity' }, 'nightcrew');
  }
  const fillKeys = new Set(['wifi', 'toilet']);
  for (const a of amenities) {
    if (chips.length >= CARD_CHIP_LIMIT) break;
    const key = amenityKey(a);
    if (!fillKeys.has(key)) continue;
    push({ id: `am-${a}`, label: a, tab: 'amenities', kind: 'amenity' }, key);
  }
  return chips;
}

export function resultChipOverflowCount(bus: Bus): number {
  const preview = resultChips(bus);
  const shown = new Set<string>();
  for (const chip of preview) {
    shown.add(amenityKey(chip.label));
    if (chip.id === 'gps') {
      shown.add('gps');
      shown.add('gpstracking');
    }
    if (chip.id === 'fare-off' || chip.id === 'delay-off') shown.add('offer');
  }

  let hidden = 0;
  for (const a of tripAmenities(bus)) {
    const key = amenityKey(a);
    if (key === 'gps' || key === 'gpstracking') {
      if (!shown.has('gps') && !shown.has('gpstracking')) hidden += 1;
      continue;
    }
    if (!shown.has(key)) hidden += 1;
  }
  if (bus.original_price > bus.price && !preview.some((c) => c.id === 'fare-off')) hidden += 1;
  if (bus.delay_guarantee && !preview.some((c) => c.id === 'delay-off')) hidden += 1;
  return hidden;
}

export function tripOffers(bus: Bus): TripOffer[] {
  const offers: TripOffer[] = [];
  if (bus.original_price > bus.price) {
    const cut = bus.original_price - bus.price;
    offers.push({
      id: 'flash',
      title: 'Flash fare',
      detail: `${formatINR(cut)} off per seat on this listed fare. Min fare ${formatINR(bus.price)}.`,
      badge: formatINR(cut),
      applied: true,
    });
  }
  if (bus.delay_guarantee) {
    offers.push({
      id: 'delay',
      title: 'Delay cover',
      detail: '10% of seat fare credited if this service is late by 30 minutes or more.',
      badge: '10%',
    });
  }
  if (bus.hotel_bundle_saving > 0) {
    offers.push({
      id: 'hotel',
      title: 'Hotel + last-mile bundle',
      detail: `Save ${formatINR(bus.hotel_bundle_saving)} when you add a verified hotel at checkout.`,
      badge: formatINR(bus.hotel_bundle_saving),
    });
  }
  offers.push({
    id: 'rewards',
    title: 'YLT Rewards',
    detail: 'Complimentary ticket after 4 completed trips on YLT. Applies to logged-in accounts.',
    badge: 'Free',
  });
  offers.push({
    id: 'group',
    title: 'Group booking',
    detail: '5% off when you book 4 or more seats on one PNR.',
    badge: '5%',
    code: 'YLTGROUP',
  });
  return offers;
}

export function ratingHistogram(rating: number, reviews: number): number[] {
  const n = Math.max(0, Math.round(reviews));
  const weights = [1, 2, 3, 4, 5].map((star) => Math.max(0.05, 1 / (1 + (star - rating) ** 2)));
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * n);
  const counts = raw.map((x) => Math.floor(x));
  let leftover = n - counts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < leftover; k++) counts[order[k % order.length].i] += 1;
  return counts;
}

export function ratingLabel(rating: number) {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Very good';
  if (rating >= 3.5) return 'Good';
  if (rating >= 3.0) return 'Average';
  return 'Needs attention';
}

export function travellerTags(bus: Bus): string[] {
  const tags: string[] = [];
  if (bus.rating >= 4) tags.push('Clean & hygienic');
  if (bus.punctuality >= 85) tags.push('Punctuality');
  if (bus.women_safety) tags.push('Women-safe crew');
  if (bus.live_tracking) tags.push('Live tracking');
  if (bus.meals) tags.push('Meals on board');
  if (bus.rating >= 4.2) tags.push('Overall experience');
  return tags.slice(0, 4);
}

export function safetyItems(bus: Bus): SafetyItem[] {
  const pending = 'Awaiting operator upload';
  return [
    {
      id: 'fitment',
      label: 'Fitment validity',
      status: 'pending',
      detail: pending,
    },
    {
      id: 'rc',
      label: 'RC status',
      status: 'pending',
      detail: pending,
    },
    {
      id: 'insurance',
      label: 'Vehicle insurance',
      status: 'pending',
      detail: pending,
    },
    {
      id: 'permit',
      label: 'Vehicle permit',
      status: 'pending',
      detail: pending,
    },
    {
      id: 'platform',
      label: 'YLT safety review',
      status: bus.sla_verified ? 'ready' : 'pending',
      detail: bus.sla_verified
        ? 'Operator passed YLT platform safety checks for this listing. Vehicle papers are still awaiting operator upload.'
        : pending,
    },
  ];
}

export function runningDays(bus: Bus): { date: string; label: string; status: 'listed' | 'pending' }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftIsoDate(bus.date, i - 6);
    const listed = date === bus.date;
    return {
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      status: listed ? 'listed' : 'pending',
    };
  });
}

export function cancellationSlabs(bus: Bus): { slabs: CancelSlab[]; notes: string[] } {
  const fare = bus.price;
  const policy: CancellationPolicy = bus.cancellation;
  const depDate = bus.date;
  const [hh, mm] = bus.departure_time.split(':').map(Number);
  const dep = new Date(`${depDate}T00:00:00`);
  dep.setHours(hh, mm, 0, 0);
  const fmt = (d: Date) =>
    d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

  const slab = (when: string, pct: number): CancelSlab => ({
    when,
    pct,
    refundLabel: pct <= 0 ? `${formatINR(0)} · 0% refund` : `${formatINR(Math.round(fare * (pct / 100)))} · ${pct}% refund`,
  });

  if (policy === 'free-until-6h') {
    const cut = new Date(dep.getTime() - 6 * 60 * 60 * 1000);
    return {
      slabs: [
        slab(`Before ${fmt(cut)}`, 100),
        slab(`After ${fmt(cut)}`, 0),
      ],
      notes: [
        'Full refund until 6 hours before departure on this operator policy.',
        'Refund amount is indicative of the listed seat fare.',
        'Partial cancellation of selected seats is allowed.',
      ],
    };
  }
  if (policy === 'partial') {
    const t24 = new Date(dep.getTime() - 24 * 60 * 60 * 1000);
    const t12 = new Date(dep.getTime() - 12 * 60 * 60 * 1000);
    return {
      slabs: [
        slab(`Before ${fmt(t24)}`, 85),
        slab(`Between ${fmt(t24)} & ${fmt(t12)}`, 50),
        slab(`After ${fmt(t12)}`, 0),
      ],
      notes: [
        'Refund amount is indicative of the listed seat fare.',
        'A small operator processing fee may apply at the time of cancellation.',
        'Partial cancellation of selected seats is allowed.',
      ],
    };
  }
  return {
    slabs: [slab('Any time after booking', 0)],
    notes: [
      'This operator lists the fare as non-refundable.',
      'Refund amount is indicative. Statutory cancellations follow applicable rules.',
    ],
  };
}

export function stopDateLabel(bus: Bus, stop: RouteStop, kind: 'boarding' | 'dropping') {
  let date = bus.date;
  if (kind === 'dropping' && toMins(stop.time) < toMins(bus.departure_time)) {
    date = shiftIsoDate(bus.date, 1);
  }
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const TRAVEL_POLICY = [
  {
    q: 'Do I need to buy a ticket for my child?',
    a: 'Children below five years of age can travel free along with adults if they share a seat. If a separate seat is needed, book a ticket. Sharing a berth with passengers from a different booking on a double berth is not permitted.',
  },
  {
    q: 'Will I be charged for excess luggage?',
    a: 'Yes, excess luggage may be chargeable. You may carry 2 pieces of luggage, 15 kg each. Carton boxes are accepted only at the operator’s discretion.',
  },
  {
    q: 'Can I travel with my pet?',
    a: 'Travelling with pets on this bus is not permitted unless the operator confirms it in writing before boarding.',
  },
  {
    q: 'Is there an alcohol / liquor policy?',
    a: 'Alcohol consumption and carrying liquor on board is prohibited. Operators may deboard passengers who do not follow this policy. Refunds are not processed in such cases.',
  },
  {
    q: 'Will the bus wait if boarding time has passed?',
    a: 'Operators do not wait beyond the listed departure time at a boarding point. There is no refund if you miss the bus by arriving late.',
  },
  {
    q: 'Onboard washroom policy',
    a: 'Washroom availability depends on the coach. Where fitted, use is subject to cleanliness and operator rules.',
  },
];
