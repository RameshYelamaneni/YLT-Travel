import type { Bus, Seat, RouteStop, CancellationPolicy } from '../types';

const OPERATORS = [
  { name: 'YLT Express', type: 'Volvo A/C Sleeper (2+1)', ac: true, sleeper: true, volvo: true, base: 780 },
  { name: 'YLT Premium', type: 'Scania A/C Sleeper', ac: true, sleeper: true, volvo: true, base: 1100 },
  { name: 'YLT Coach', type: 'A/C Seater (2+2)', ac: true, sleeper: false, volvo: false, base: 520 },
];

/** Generic catalog crew (not real people). Photos live in /public/crew. */
const CATALOG_CREW: Record<string, { driverName: string; driverPhoto: string; experienceYears: number; conductorName: string }> = {
  'YLT Express': {
    driverName: 'Ravi Teja N.',
    driverPhoto: '/crew/driver-ravi.svg',
    experienceYears: 12,
    conductorName: 'Suresh Babu',
  },
  'YLT Premium': {
    driverName: 'Anand Kumar P.',
    driverPhoto: '/crew/driver-anand.svg',
    experienceYears: 15,
    conductorName: 'Lakshmi Narayana',
  },
  'YLT Coach': {
    driverName: 'Mohan Reddy K.',
    driverPhoto: '/crew/driver-mohan.svg',
    experienceYears: 9,
    conductorName: 'Praveen Rao',
  },
};

export function catalogCrewFor(operator: string) {
  const key = Object.keys(CATALOG_CREW).find((name) => operator.toLowerCase().includes(name.toLowerCase().replace(/^ylt\s+/i, '')) || operator.toLowerCase() === name.toLowerCase());
  if (CATALOG_CREW[operator]) return CATALOG_CREW[operator];
  if (key) return CATALOG_CREW[key];
  if (/express/i.test(operator)) return CATALOG_CREW['YLT Express'];
  if (/premium/i.test(operator)) return CATALOG_CREW['YLT Premium'];
  if (/coach/i.test(operator)) return CATALOG_CREW['YLT Coach'];
  return {
    driverName: 'Duty driver',
    driverPhoto: '/crew/driver-placeholder.svg',
    experienceYears: 8,
    conductorName: 'Onboard attendant',
  };
}

const AMENITIES = [
  'WiFi', 'Charging Point', 'Water Bottle', 'Blanket', 'Reading Light', 'CCTV',
  'USB Port', 'Toilet', 'Snacks', 'Pillow', 'GPS', 'Emergency Exit',
];

const VIA: Record<string, string[]> = {
  'Hyderabad|Bengaluru': ['Kurnool', 'Anantapur'],
  'Bengaluru|Hyderabad': ['Kurnool', 'Anantapur'],
  'Hyderabad|Chennai': ['Nellore', 'Gudur'],
  'Chennai|Hyderabad': ['Nellore', 'Gudur'],
  'Bengaluru|Chennai': ['Hosur', 'Vellore'],
  'Chennai|Bengaluru': ['Vellore', 'Hosur'],
  'Hyderabad|Vijayawada': ['Suryapet'],
  'Vijayawada|Hyderabad': ['Suryapet'],
  'Bengaluru|Mysuru': ['Maddur'],
  'Mysuru|Bengaluru': ['Maddur'],
};

const STOPS: Record<string, string[]> = {
  Hyderabad: ['MGBS', 'Jubilee Bus Station', 'Gachibowli', 'Miyapur', 'LB Nagar', 'Secunderabad'],
  Bengaluru: ['Majestic', 'Electronic City', 'Silk Board', 'Hebbal', 'Whitefield', 'Mysore Road'],
  Chennai: ['Koyambedu CMBT', 'Guindy', 'T Nagar', 'Tambaram', 'Airport'],
  Tirupati: ['Tirupati Bus Stand', 'Renigunta', 'Alipiri'],
  Vijayawada: ['Pandit Nehru Bus Station', 'Benz Circle', 'Gannavaram'],
  Visakhapatnam: ['RTC Complex', 'Gajuwaka', 'Dwaraka Nagar'],
  Coimbatore: ['Gandhipuram', 'Ukkadam', 'Avinashi Road'],
  Kochi: ['Vyttila Hub', 'Kaloor', 'Edappally'],
  Mysuru: ['Suburban Bus Stand', 'City Bus Stand'],
  Madurai: ['Mattuthavani', 'Periyar Bus Stand'],
};

export function seededRand(seed: number) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function hhmm(h: number, m: number) {
  return `${pad(((h % 24) + 24) % 24)}:${pad(((m % 60) + 60) % 60)}`;
}

function addMins(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return hhmm(Math.floor(total / 60), total % 60);
}

function stopsFor(city: string, time: string, rand: () => number, boarding: boolean): RouteStop[] {
  const names = STOPS[city] ?? [city];
  const count = 2 + Math.floor(rand() * Math.min(3, names.length));
  const picked = [...names].sort(() => rand() - 0.5).slice(0, count);
  return picked.map((name, i) => ({
    name,
    time: addMins(time, boarding ? i * 12 : i * 18),
  }));
}

const REST_CORRIDOR: Record<string, { name: string; note: string; halt: number }[]> = {
  'Hyderabad|Bengaluru': [
    { name: 'Kurnool highway kitchen', note: 'Dinner / tea halt', halt: 20 },
    { name: 'Anantapur rest bay', note: 'Washroom + snacks', halt: 15 },
    { name: 'Hosur tea halt', note: 'Last stretch before Bengaluru', halt: 12 },
  ],
  'Bengaluru|Hyderabad': [
    { name: 'Hosur tea halt', note: 'First stretch after Bengaluru', halt: 12 },
    { name: 'Anantapur rest bay', note: 'Washroom + snacks', halt: 15 },
    { name: 'Kurnool highway kitchen', note: 'Breakfast / tea halt', halt: 20 },
  ],
};

export function restStopsFor(from: string, to: string, departure: string, durationMins: number, via: string[], rand: () => number): RouteStop[] {
  const key = `${from}|${to}`;
  const corridor = REST_CORRIDOR[key];
  if (corridor) {
    const n = durationMins >= 480 ? 3 : 2;
    return corridor.slice(0, n).map((stop, i) => ({
      name: stop.name,
      time: addMins(departure, Math.round(durationMins * ((i + 1) / (n + 1)))),
      halt_mins: stop.halt,
      note: stop.note,
    }));
  }
  if (durationMins < 210 && via.length === 0) return [];
  const cities = via.length ? via : [`En-route halt`];
  const n = Math.min(3, Math.max(2, cities.length));
  return cities.slice(0, n).map((name, i) => ({
    name: `${name} rest stop`,
    time: addMins(departure, Math.round(durationMins * ((i + 1) / (n + 1)))),
    halt_mins: 12 + Math.floor(rand() * 10),
    note: 'Washroom + tea',
  }));
}

export function generateBuses(from: string, to: string, date: string): Bus[] {
  const rand = seededRand((from + to + date).split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const count = 16 + Math.floor(rand() * 6);
  const via = VIA[`${from}|${to}`] ?? [];

  return Array.from({ length: count }).map((_, i) => {
    const op = OPERATORS[Math.floor(rand() * OPERATORS.length)];
    const depH = Math.floor(rand() * 24);
    const depM = [0, 15, 30, 45][Math.floor(rand() * 4)];
    const dur = 240 + Math.floor(rand() * 420);
    const departure_time = hhmm(depH, depM);
    const arrival_time = addMins(departure_time, dur);
    const seats_total = op.sleeper ? 36 : 40;
    const seats_available = 6 + Math.floor(rand() * 26);
    const original = op.base + Math.floor(rand() * 280);
    const drop = rand() > 0.55 ? Math.floor(8 + rand() * 18) : 0;
    const price = Math.max(399, Math.round(original * (1 - drop / 100)));
    const rating = 3.6 + rand() * 1.4;

    return {
      id: `BUS-${date.replace(/-/g, '')}-${i}`,
      operator: op.name,
      bus_type: op.type,
      service_number: `${2010 + i}${from.slice(0, 3).toUpperCase()}${to.slice(0, 3).toUpperCase()}`,
      departure_time,
      arrival_time,
      duration_mins: dur,
      price,
      original_price: drop ? original : price,
      rating,
      reviews: 40 + Math.floor(rand() * 900),
      is_ac: op.ac,
      is_sleeper: op.sleeper,
      is_volvo: op.volvo,
      live_tracking: rand() > 0.28,
      sla_verified: rand() > 0.35,
      women_safety: inSlot(departure_time, 0, 6) || inSlot(departure_time, 21, 24) || rand() > 0.45,
      amenities: AMENITIES.filter(() => rand() > 0.42).slice(0, 5),
      from,
      to,
      date,
      via,
      seats_total,
      seats_available,
      single_seats: Math.max(0, Math.floor(seats_available * (0.15 + rand() * 0.2))),
      ladies_seats: Math.max(0, Math.floor(3 + rand() * 6)),
      window_seats: Math.max(1, Math.floor(seats_available * 0.4)),
      boarding_points: stopsFor(from, departure_time, rand, true),
      dropping_points: stopsFor(to, arrival_time, rand, false),
      rest_stops: restStopsFor(from, to, departure_time, dur, via, rand),
      cancellation: (['free-until-6h', 'partial', 'non-refundable'] as CancellationPolicy[])[Math.floor(rand() * 3)],
      rest_stop_rating: 3.5 + rand() * 1.5,
      delay_mins: rand() > 0.78 ? Math.floor(8 + rand() * 35) : 0,
      co2_kg: Math.round(12 + rand() * 18),
      hotel_bundle_saving: rand() > 0.6 ? Math.floor(120 + rand() * 280) : 0,
      punctuality: Math.round(78 + rand() * 21),
      meals: rand() > 0.55,
      accessible: rand() > 0.72,
      night_crew: inSlot(departure_time, 0, 6) || inSlot(departure_time, 21, 24) || rand() > 0.4,
      delay_guarantee: rand() > 0.5,
      prime: rand() > 0.7,
      insurance_available: true,
      smart_score: 0,
      listing_source: 'catalog' as const,
      ...catalogCrewFor(op.name),
    };
  }).map((b) => ({
    ...b,
    smart_score: Math.round(
      b.rating * 12 + b.punctuality * 0.45 + (b.delay_guarantee ? 6 : 0) + (b.live_tracking ? 4 : 0) + (b.women_safety ? 5 : 0) - b.price / 80,
    ),
  }));
}

export function generateSeats(bus: Bus): Seat[] {
  const rand = seededRand(bus.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const seats: Seat[] = [];
  for (let i = 1; i <= 20; i++) {
    seats.push({
      id: `S-${i}`,
      label: bus.is_sleeper ? `L${i}` : `${i}`,
      type: bus.is_sleeper ? 'sleeper-lower' : 'seater',
      price: bus.price + (i <= 10 ? 50 : 0),
      is_booked: false,
      deck: 'lower',
      is_ladies: i <= 4,
      is_window: i % 4 === 1 || i % 4 === 0,
      is_single: i % 5 === 0,
    });
  }
  if (bus.is_sleeper) {
    for (let i = 1; i <= 16; i++) {
      seats.push({
        id: `U-${i}`,
        label: `U${i}`,
        type: 'sleeper-upper',
        price: bus.price,
        is_booked: false,
        deck: 'upper',
        is_ladies: i <= 2,
        is_window: i % 2 === 0,
        is_single: i % 4 === 0,
      });
    }
  }
  return seats;
}

export function hourOf(time: string) {
  return Number(time.slice(0, 2));
}

export function inSlot(time: string, start: number, end: number) {
  const h = hourOf(time);
  return h >= start && h < end;
}

export const TIME_SLOTS = [
  { id: 'night', label: '00:00 – 06:00', start: 0, end: 6 },
  { id: 'morning', label: '06:00 – 12:00', start: 6, end: 12 },
  { id: 'afternoon', label: '12:00 – 18:00', start: 12, end: 18 },
  { id: 'evening', label: '18:00 – 24:00', start: 18, end: 24 },
] as const;
