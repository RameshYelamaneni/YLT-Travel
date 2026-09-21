export type TirumalaOrigin = 'Hyderabad' | 'Bengaluru' | 'Chennai';

export interface TirumalaPackage {
  slug: string;
  origin: TirumalaOrigin;
  originCode: 'HYD' | 'BLR' | 'MAA';
  title: string;
  nights: number;
  days: number;
  priceFrom: number;
  distanceHint: string;
  durationHint: string;
  summary: string;
  includes: string[];
  excludes: string[];
  itinerary: { day: string; title: string; detail: string }[];
}

export const TIRUMALA_PACKAGES: TirumalaPackage[] = [
  {
    slug: 'hyd-tirumala',
    origin: 'Hyderabad',
    originCode: 'HYD',
    title: 'Hyderabad to Tirumala darshan package',
    nights: 1,
    days: 2,
    priceFrom: 4499,
    distanceHint: '~560 km',
    durationHint: 'Overnight AC sleeper',
    summary: 'Board in Hyderabad, sleep on an AC sleeper, reach Tirupati at dawn, and return the next night after darshan.',
    includes: [
      'Onward and return AC sleeper bus (Hyderabad ↔ Tirupati)',
      '1 night Tirupati hotel near the bus stand',
      'Local transfer toward Alipiri / footpath base',
      'Queue guidance for regular (Sarva Darshan) slots',
      'GST on the package fare',
    ],
    excludes: [
      'TTD special entry, VIP, or Seeghra darshan tickets',
      'Laddu / prasadam beyond what TTD issues at the counter',
      'Personal expenses and meals not listed',
    ],
    itinerary: [
      { day: 'Night 0', title: 'Depart Hyderabad', detail: 'Report at the Hyderabad boarding point. Overnight AC sleeper to Tirupati.' },
      { day: 'Day 1', title: 'Tirupati stay + Tirumala', detail: 'Hotel check-in, local transfer, darshan as per TTD queue, evening rest in Tirupati.' },
      { day: 'Night 1', title: 'Return to Hyderabad', detail: 'Board the return sleeper. Drop in Hyderabad next morning.' },
    ],
  },
  {
    slug: 'blr-tirumala',
    origin: 'Bengaluru',
    originCode: 'BLR',
    title: 'Bengaluru to Tirumala darshan package',
    nights: 1,
    days: 2,
    priceFrom: 4299,
    distanceHint: '~250 km',
    durationHint: 'Evening / night AC bus',
    summary: 'Leave Bengaluru in the evening, reach Tirupati the same night or at dawn, complete darshan, and ride back.',
    includes: [
      'Onward and return AC bus (Bengaluru ↔ Tirupati)',
      '1 night Tirupati hotel',
      'Local transfer toward Alipiri',
      'Queue guidance for regular darshan',
      'GST on the package fare',
    ],
    excludes: [
      'TTD special entry or VIP darshan',
      'Hill transport beyond the listed transfer',
      'Meals not listed on the voucher',
    ],
    itinerary: [
      { day: 'Evening 0', title: 'Depart Bengaluru', detail: 'Board at Majestic / agreed point. AC coach to Tirupati.' },
      { day: 'Day 1', title: 'Tirumala darshan', detail: 'Hotel rest, transfer, darshan as per TTD, return coach to Bengaluru the same night or next morning.' },
    ],
  },
  {
    slug: 'maa-tirumala',
    origin: 'Chennai',
    originCode: 'MAA',
    title: 'Chennai to Tirumala darshan package',
    nights: 1,
    days: 2,
    priceFrom: 3999,
    distanceHint: '~150 km',
    durationHint: 'Early morning or night AC bus',
    summary: 'Short hop from Chennai — Koyambedu to Tirupati, hotel rest, darshan, and a same-corridor return.',
    includes: [
      'Onward and return AC bus (Chennai ↔ Tirupati)',
      '1 night Tirupati hotel',
      'Local transfer toward Alipiri',
      'Queue guidance for regular darshan',
      'GST on the package fare',
    ],
    excludes: [
      'TTD special entry or VIP darshan',
      'Break-journey sightseeing not on the voucher',
      'Meals not listed',
    ],
    itinerary: [
      { day: 'Night 0 / Dawn 1', title: 'Depart Chennai', detail: 'Board at Koyambedu CMBT or the listed point. AC coach to Tirupati.' },
      { day: 'Day 1', title: 'Tirumala darshan', detail: 'Hotel check-in, transfer, darshan as per TTD, return coach to Chennai.' },
    ],
  },
];

export function packageBySlug(slug?: string): TirumalaPackage | undefined {
  if (!slug) return undefined;
  return TIRUMALA_PACKAGES.find((p) => p.slug === slug);
}
