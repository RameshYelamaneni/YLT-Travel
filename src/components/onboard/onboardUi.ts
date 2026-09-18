export const field =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15';
export const label = 'text-sm font-semibold text-slate-700';

export const CITIES = [
  'Tirupati', 'Chennai', 'Hyderabad', 'Bengaluru', 'Vijayawada', 'Visakhapatnam',
  'Nellore', 'Guntur', 'Coimbatore', 'Kochi', 'Madurai', 'Mysuru',
];

export function passwordOk(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
}
