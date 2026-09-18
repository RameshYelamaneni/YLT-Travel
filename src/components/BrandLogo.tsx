/** Compact navy/gold YLT mark used in header, ticket, and favicon. */
export function YltLogo({ size = 36, title = 'YLT Travels' }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title}>
      <rect width="64" height="64" rx="14" fill="#0b1f3a" />
      <rect x="3.5" y="3.5" width="57" height="57" rx="12" stroke="#d4a017" strokeWidth="3" />
      <text x="32" y="40" textAnchor="middle" fontFamily="Arial Black, Impact, Segoe UI, sans-serif" fontSize="22" fontWeight="800" fill="#f5c14a">YLT</text>
      <path d="M16 48h32" stroke="#d4a017" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
