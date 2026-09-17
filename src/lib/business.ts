/**
 * YLT Transit business logic: commission, dynamic pricing, subscriptions.
 */

export const TAX_RATE = 0.05;

// ---- Commission model ----
export const COMMISSION = {
  bus: 0.08,        // 8% of bus ticket
  car: 0.12,        // 12% of car rental
  carpool: 0.10,    // 10% of car pool seat
  lastmile: 0.15,   // 15% of last-mile fare
  slaPremium: 0.05, // +5% when SLA-verified badge applied
  operatorPlan: {
    starter: 4999,
    pro: 9999,
    enterprise: 24999,
  },
} as const;

export function commissionFor(type: 'bus' | 'car' | 'carpool' | 'lastmile', amount: number, slaVerified = false): number {
  const base = amount * COMMISSION[type];
  const premium = slaVerified ? amount * COMMISSION.slaPremium : 0;
  return Math.round(base + premium);
}

// ---- Dynamic pricing ----
export type PricingContext = {
  hour: number;          // 0-23
  isWeekend: boolean;
  isFestival: boolean;
  demandMultiplier?: number; // 1.0 = normal
};

export function surgeMultiplier(ctx: PricingContext): number {
  let m = 1.0;
  // Peak hours: 7-10 AM, 5-8 PM
  if ((ctx.hour >= 7 && ctx.hour <= 10) || (ctx.hour >= 17 && ctx.hour <= 20)) m += 0.25;
  // Weekend
  if (ctx.isWeekend) m += 0.15;
  // Festival
  if (ctx.isFestival) m += 0.40;
  // Demand-based surge (last-mile / carpool)
  if (ctx.demandMultiplier && ctx.demandMultiplier > 1) m += (ctx.demandMultiplier - 1) * 0.5;
  return Math.min(m, 2.5); // cap at 2.5x
}

export function applySurge(baseFare: number, ctx: PricingContext): number {
  return Math.round(baseFare * surgeMultiplier(ctx));
}

export function currentPricingContext(demandMultiplier = 1): PricingContext {
  const now = new Date();
  const day = now.getDay();
  return {
    hour: now.getHours(),
    isWeekend: day === 0 || day === 6,
    isFestival: false, // would come from a festival calendar
    demandMultiplier,
  };
}

// ---- Subscription plans ----
export const SUBSCRIPTION_PLANS = [
  { id: 'weekly', label: 'Weekly', duration_days: 7, base_car: 'Hatchback', price: 4999 },
  { id: 'monthly', label: 'Monthly', duration_days: 30, base_car: 'Sedan', price: 14999 },
  { id: 'corporate', label: 'Corporate', duration_days: 90, base_car: 'SUV', price: 39999 },
] as const;

// ---- Airport pickup (fixed fare + SLA) ----
export const AIRPORT_FIXED_FARES: Record<string, number> = {
  Hyderabad: 599,
  Bengaluru: 649,
  Chennai: 549,
  Tirupati: 399,
  Vijayawada: 449,
  Visakhapatnam: 499,
  Coimbatore: 399,
};

export function airportFare(city: string, slaVerified: boolean): number {
  const base = AIRPORT_FIXED_FARES[city] ?? 499;
  return slaVerified ? Math.round(base * 1.1) : base;
}
