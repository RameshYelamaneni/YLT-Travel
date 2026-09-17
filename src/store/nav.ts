import { create } from 'zustand';
import type { HotelBooking } from '../types-hotel';

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
  | { name: 'help' };

interface NavState {
  view: View;
  go: (v: View) => void;
}

export const useNav = create<NavState>((set) => ({
  view: { name: 'home' },
  go: (v) => {
    set({ view: v });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
}));
