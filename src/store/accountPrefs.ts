import { create } from 'zustand';

const KEY = 'ylt-account-prefs';

type Prefs = {
  notifications: boolean;
  bookingForWomen: boolean;
};

function load(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Prefs>;
    return {
      notifications: raw.notifications !== false,
      bookingForWomen: Boolean(raw.bookingForWomen),
    };
  } catch {
    return { notifications: true, bookingForWomen: false };
  }
}

function persist(p: Prefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export const useAccountPrefs = create<Prefs & {
  setNotifications: (v: boolean) => void;
  setBookingForWomen: (v: boolean) => void;
}>((set, get) => ({
  ...load(),
  setNotifications: (notifications) => {
    const next = { notifications, bookingForWomen: get().bookingForWomen };
    persist(next);
    set(next);
  },
  setBookingForWomen: (bookingForWomen) => {
    const next = { notifications: get().notifications, bookingForWomen };
    persist(next);
    set(next);
  },
}));
