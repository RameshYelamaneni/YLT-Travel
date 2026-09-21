import { create } from 'zustand';

export interface CheckoutItem {
  type: 'bus' | 'car' | 'carpool' | 'lastmile' | 'hotel' | 'package';
  label: string;
  amount: number;
}

interface CheckoutState {
  items: CheckoutItem[];
  totalFare: number;
  taxes: number;
  grandTotal: number;
  insurance: boolean;
  pnr: string | null;
  setItems: (items: CheckoutItem[]) => void;
  setInsurance: (v: boolean) => void;
  setPnr: (pnr: string) => void;
  recalc: () => void;
  reset: () => void;
}

const TAX_RATE = 0.05;

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  items: [],
  totalFare: 0,
  taxes: 0,
  grandTotal: 0,
  insurance: false,
  pnr: null,
  setItems: (items) => { set({ items }); get().recalc(); },
  setInsurance: (insurance) => { set({ insurance }); get().recalc(); },
  setPnr: (pnr) => set({ pnr }),
  recalc: () => {
    const { items, insurance } = get();
    const base = items.reduce((s, i) => s + i.amount, 0);
    const insAmt = insurance ? Math.round(base * 0.03) : 0;
    const totalFare = base + insAmt;
    const taxes = Math.round(totalFare * TAX_RATE);
    set({ totalFare, taxes, grandTotal: totalFare + taxes });
  },
  reset: () => set({ items: [], totalFare: 0, taxes: 0, grandTotal: 0, insurance: false, pnr: null }),
}));
