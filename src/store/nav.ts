import { create } from 'zustand';
import type { HotelBooking } from '../types-hotel';

import {
  detectOnboardPortal,
  detectOnboardScreen,
  parseOnboardKind,
  type OnboardKind,
  type OnboardScreen,
} from '../lib/onboardHost';

export type View =
  | { name: 'home' }
  | { name: 'results'; from: string; to: string; date: string; returnDate?: string }
  | { name: 'routes' }
  | { name: 'offers' }
  | { name: 'about' }
  | { name: 'dashboard' }
  | { name: 'bookings' }
  | { name: 'admin' }
  | { name: 'operator' }
  | { name: 'partner' }
  | { name: 'cars' }
  | { name: 'carpool' }
  | { name: 'hotels' }
  | { name: 'hotelResults' }
  | { name: 'hotelDetails'; hotelId: string }
  | { name: 'hotelCheckout'; hotelId: string; roomId: string }
  | { name: 'hotelConfirmation'; booking: HotelBooking }
  | { name: 'help' }
  | { name: 'careers' }
  | { name: 'feedback'; token: string }
  | { name: 'onboard'; kind: OnboardKind; screen?: OnboardScreen; type?: OnboardKind };

interface NavState {
  view: View;
  go: (v: View) => void;
}

export const useNav = create<NavState>((set) => ({
  view: viewFromPath(),
  go: (v) => {
    set({ view: v });
    const path = pathFromView(v);
    if (path) {
      const cur = `${window.location.pathname}${window.location.search}${window.location.hash || ''}`;
      if (cur !== path) window.history.pushState({ ylt: v.name }, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
}));

function operatorHost(): boolean {
  const host = window.location.hostname.toLowerCase();
  return host === 'onboardvendor.ylttravels.com' || host.startsWith('onboardvendor.');
}

function agentHost(): boolean {
  const host = window.location.hostname.toLowerCase();
  return host === 'agent.ylttravels.com' || host.startsWith('agent.');
}

function insuranceHost(): boolean {
  const host = window.location.hostname.toLowerCase();
  return host === 'insurance.ylttravels.com' || host.startsWith('insurance.');
}

export function viewFromPath(): View {
  if (typeof window === 'undefined') return { name: 'home' };
  const portal = detectOnboardPortal();
  const p = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  if (p === '/partner' || p === '/admin' || p === '/operator') return { name: p.slice(1) as 'partner' | 'admin' | 'operator' };
  if (portal) {
    const screen = detectOnboardScreen(portal);
    const type = parseOnboardKind(new URLSearchParams(window.location.search).get('type')) || (screen === 'registration' ? portal : undefined);
    return { name: 'onboard', kind: portal === 'operator' && type && screen === 'registration' ? portal : portal, screen, type };
  }
  if (p === '/help') return { name: 'help' };
  if (p === '/careers') return { name: 'careers' };
  if (p === '/bookings') return { name: 'bookings' };
  if (p === '/hotels') return { name: 'hotels' };
  if (p === '/buses' || p === '/routes') return { name: 'routes' };
  if (p === '/partner') return { name: 'partner' };
  if (p === '/admin') return { name: 'admin' };
  if (p === '/cars') return { name: 'cars' };
  if (p === '/about') return { name: 'about' };
  if (p === '/offers') return { name: 'offers' };
  if (p === '/registration' || p === '/signin') return { name: 'home' };
  if (p === '/onboard/vendor' || p.startsWith('/onboard/vendor')) {
    return { name: 'onboard', kind: 'operator', screen: detectOnboardScreen('operator'), type: parseOnboardKind(new URLSearchParams(window.location.search).get('type')) || 'operator' };
  }
  if (p === '/onboard/agent' || p.startsWith('/onboard/agent')) {
    return { name: 'onboard', kind: 'agent', screen: detectOnboardScreen('agent'), type: 'agent' };
  }
  if (p === '/onboard/hotel' || p.startsWith('/onboard/hotel')) {
    return { name: 'onboard', kind: 'hotel', screen: detectOnboardScreen('hotel') === 'landing' ? 'registration' : detectOnboardScreen('hotel'), type: 'hotel' };
  }
  if (p === '/onboard/insurance' || p === '/partners/insurance') {
    return { name: 'onboard', kind: 'insurance', screen: detectOnboardScreen('insurance'), type: 'insurance' };
  }
  return { name: 'home' };
}

function pathFromView(v: View): string | null {
  switch (v.name) {
    case 'help': return '/help';
    case 'careers': return '/careers';
    case 'bookings': return '/bookings';
    case 'hotels': return '/hotels';
    case 'routes': return '/buses';
    case 'home': return '/';
    case 'partner': return '/partner';
    case 'admin': return '/admin';
    case 'cars': return '/cars';
    case 'about': return '/about';
    case 'offers': return '/offers';
    case 'onboard': {
      const screen = v.screen || 'landing';
      const type = v.type || v.kind;
      const q = screen === 'registration' ? `?type=${type}` : '';
      if (operatorHost()) {
        if (screen === 'signin') return '/signin';
        if (screen === 'registration') return `/registration${q}`;
        if (screen === 'guide') return '/#learn';
        return '/';
      }
      if (agentHost()) {
        if (screen === 'registration') return `/registration?type=agent`;
        return '/';
      }
      if (insuranceHost()) {
        if (screen === 'registration') return `/registration?type=insurance`;
        return '/';
      }
      if (v.kind === 'operator') {
        if (screen === 'signin') return '/onboard/vendor/signin';
        if (screen === 'registration') return `/onboard/vendor/registration${q || '?type=operator'}`;
        if (screen === 'guide') return '/onboard/vendor#learn';
        return '/onboard/vendor';
      }
      if (v.kind === 'agent') {
        if (screen === 'registration') return '/onboard/agent/registration?type=agent';
        return '/onboard/agent';
      }
      if (v.kind === 'hotel') return `/onboard/hotel/registration?type=hotel`;
      if (screen === 'registration') return '/onboard/insurance/registration?type=insurance';
      return '/onboard/insurance';
    }
    default: return null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    useNav.setState({ view: viewFromPath() });
  });
}
