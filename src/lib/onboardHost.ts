export type OnboardKind = 'operator' | 'agent' | 'insurance' | 'hotel';
export type OnboardScreen = 'landing' | 'signin' | 'registration' | 'guide';

const LOCAL = /^(localhost|127\.0\.0\.1)$/i;

export function currentHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
}

export function isLocalHostName(host = currentHostname()): boolean {
  return LOCAL.test(host);
}

export function detectOnboardPortal(): OnboardKind | null {
  if (typeof window === 'undefined') return null;
  const host = currentHostname();
  if (host === 'onboardvendor.ylttravels.com' || host.startsWith('onboardvendor.')) return 'operator';
  if (host === 'agent.ylttravels.com' || host.startsWith('agent.')) return 'agent';
  if (host === 'insurance.ylttravels.com' || host.startsWith('insurance.')) return 'insurance';

  const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/onboard/vendor' || path.startsWith('/onboard/vendor')) return 'operator';
  if (path === '/onboard/agent' || path.startsWith('/onboard/agent')) return 'agent';
  if (path === '/onboard/hotel' || path.startsWith('/onboard/hotel')) return 'hotel';
  if (path === '/onboard/insurance' || path === '/partners/insurance' || path.startsWith('/onboard/insurance')) return 'insurance';

  const q = new URLSearchParams(window.location.search);
  const portal = (q.get('portal') || q.get('onboard') || '').toLowerCase();
  if (portal === 'vendor' || portal === 'operator') return 'operator';
  if (portal === 'agent') return 'agent';
  if (portal === 'hotel') return 'hotel';
  if (portal === 'insurance') return 'insurance';

  const hash = (window.location.hash || '').toLowerCase();
  if (hash.includes('onboard-vendor') || hash.includes('onboard-operator')) return 'operator';
  if (hash.includes('onboard-agent')) return 'agent';
  if (hash.includes('onboard-hotel')) return 'hotel';
  if (hash.includes('onboard-insurance')) return 'insurance';
  return null;
}

export function parseOnboardKind(raw: string | null | undefined): OnboardKind | null {
  const v = String(raw || '').toLowerCase();
  if (v === 'operator' || v === 'vendor' || v === 'bus') return 'operator';
  if (v === 'agent') return 'agent';
  if (v === 'hotel' || v === 'property') return 'hotel';
  if (v === 'insurance') return 'insurance';
  return null;
}

export function detectOnboardScreen(kind: OnboardKind | null): OnboardScreen {
  if (typeof window === 'undefined') return 'landing';
  const p = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  const q = new URLSearchParams(window.location.search);
  if (p === '/signin' || p.endsWith('/signin') || q.get('view') === 'signin') return 'signin';
  if (p === '/registration' || p.endsWith('/registration') || p.endsWith('/signup') || p === '/signup') return 'registration';
  if (p.endsWith('/guide') || q.get('view') === 'guide') return 'guide';
  if (kind === 'agent' || kind === 'insurance') return 'signin';
  return 'landing';
}

export function onboardPublicHref(kind: OnboardKind, screen: OnboardScreen = 'landing'): string {
  const q = kind === 'hotel' && screen === 'registration' ? '?type=hotel' : screen === 'registration' && kind !== 'operator' ? `?type=${kind}` : '';
  if (isLocalHostName()) {
    if (kind === 'operator') {
      if (screen === 'signin') return '/onboard/vendor/signin';
      if (screen === 'registration') return `/onboard/vendor/registration${q || '?type=operator'}`;
      if (screen === 'guide') return '/onboard/vendor#learn';
      return '/onboard/vendor';
    }
    if (kind === 'agent') {
      if (screen === 'registration') return '/onboard/agent/registration?type=agent';
      return '/onboard/agent';
    }
    if (kind === 'hotel') return `/onboard/hotel/registration?type=hotel`;
    if (screen === 'registration') return '/onboard/insurance/registration?type=insurance';
    return '/onboard/insurance';
  }
  if (kind === 'operator') {
    if (screen === 'signin') return 'https://onboardvendor.ylttravels.com/signin';
    if (screen === 'registration') return `https://onboardvendor.ylttravels.com/registration${q || '?type=operator'}`;
    if (screen === 'guide') return 'https://onboardvendor.ylttravels.com/#learn';
    return 'https://onboardvendor.ylttravels.com';
  }
  if (kind === 'agent') {
    if (screen === 'registration') return 'https://agent.ylttravels.com/registration?type=agent';
    return 'https://agent.ylttravels.com';
  }
  if (kind === 'hotel') return 'https://onboardvendor.ylttravels.com/registration?type=hotel';
  if (screen === 'registration') return 'https://insurance.ylttravels.com/registration?type=insurance';
  return 'https://insurance.ylttravels.com';
}

/** Same-host paths stay in this tab. Other hostnames always open in a new tab. */
export function offsiteLinkProps(href: string): { href: string; target?: '_blank'; rel?: string } {
  if (leavesCurrentOrigin(href)) {
    return { href, target: '_blank', rel: 'noopener noreferrer' };
  }
  return { href };
}

export function leavesCurrentOrigin(href: string): boolean {
  if (!href || href.startsWith('/') || href.startsWith('#')) return false;
  if (typeof window === 'undefined') return /^https?:\/\//i.test(href);
  try {
    const next = new URL(href, window.location.origin);
    return next.hostname.toLowerCase() !== window.location.hostname.toLowerCase();
  } catch {
    return false;
  }
}

export function onboardTitle(kind: OnboardKind): string {
  if (kind === 'operator') return 'Bus operator';
  if (kind === 'insurance') return 'Insurance partner';
  if (kind === 'hotel') return 'Hotel partner';
  return 'Travel agent';
}

export function onboardKindLabel(kind: string | undefined): string {
  const k = parseOnboardKind(kind) || (kind as OnboardKind);
  if (k === 'operator') return 'Bus operator';
  if (k === 'hotel') return 'Hotel partner';
  if (k === 'insurance') return 'Insurance partner';
  if (k === 'agent') return 'Travel agent';
  return 'Partner';
}

/** Where to send a session after 30-minute idle logout. */
export function idleLoginHref(): string {
  if (typeof window === 'undefined') return '/?login=1';
  const host = currentHostname();
  const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  if (host === 'onboardvendor.ylttravels.com' || host.startsWith('onboardvendor.')) return '/signin';
  if (host === 'agent.ylttravels.com' || host.startsWith('agent.')) return '/';
  if (host === 'insurance.ylttravels.com' || host.startsWith('insurance.')) return '/';
  if (path === '/onboard/vendor' || path.startsWith('/onboard/vendor')) return '/onboard/vendor/signin';
  if (path === '/onboard/agent' || path.startsWith('/onboard/agent')) return '/onboard/agent';
  if (path === '/onboard/insurance' || path.startsWith('/onboard/insurance')) return '/onboard/insurance';
  return '/?login=1';
}

export function alreadyOnIdleLogin(href = idleLoginHref()): boolean {
  if (typeof window === 'undefined') return false;
  const now = `${window.location.pathname}${window.location.search}`;
  const target = href.startsWith('http') ? href : `${window.location.origin}${href}`;
  try {
    const a = new URL(now, window.location.origin);
    const b = new URL(target, window.location.origin);
    return a.pathname.replace(/\/+$/, '') === b.pathname.replace(/\/+$/, '') && a.search === b.search;
  } catch {
    return false;
  }
}
