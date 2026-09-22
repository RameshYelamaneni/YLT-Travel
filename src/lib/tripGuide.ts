import type { Bus } from '../types';
import { tripBundlesFor } from '../data/tripBundles';
import { formatINR } from './format';
import { isNightService, refundPreview } from './busInsights';

/** Short fit note from our listing only. No outside search. */
export function tripGuideSentences(bus: Bus): string[] {
  const driver = bus.driverName
    ? `${bus.driverName} is the duty driver in the front cabin${bus.experienceYears ? `, with ${bus.experienceYears} years on this corridor` : ''}`
    : 'The duty driver is listed in the front cabin on the seat map';
  const rests = (bus.rest_stops ?? []).map((s) => s.name).filter(Boolean).slice(0, 3);
  const rest = rests.length
    ? `Rest ${rests.length > 1 ? 'stops' : 'stop'}: ${rests.join(', ')}.`
    : 'No extra rest halt is listed on this service.';
  const crew = bus.conductorName ? ` Conductor ${bus.conductorName} is on the same duty.` : '';

  const preview = refundPreview(bus);
  const cancel = `If you cancel: ${preview.headline.toLowerCase()} (${preview.detail}).`;

  const bits: string[] = [];
  if (bus.ladies_seats > 0) bits.push(`${bus.ladies_seats} ladies-quota seats are marked on the seat map`);
  if (bus.night_crew) bits.push('night crew is listed');
  else if (isNightService(bus)) bits.push('this departure is at night');
  const bundles = tripBundlesFor(bus);
  const pack = bundles[0]
    ? ` You can add ${bundles[0].title} for ${formatINR(bundles[0].price)} on the seat screen.`
    : '';
  const fit = `${bits.length ? `${bits.join(', and ')}.` : 'Seats are the standard coach layout on this listing.'}${pack}`;

  return [
    `${driver}. Our listing shows ${bus.punctuality}% on-time for this coach. ${rest}${crew}`,
    cancel,
    fit,
  ];
}
