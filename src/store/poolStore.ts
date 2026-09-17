import { create } from 'zustand';
import type { CarPoolListing } from '../data/mockCars';

interface PoolState {
  fromCity: string;
  toCity: string;
  carType: 'all' | 'Hatchback' | 'Sedan' | 'SUV';
  verifiedOnly: boolean;
  sort: 'price-low' | 'price-high' | 'rating' | 'duration' | 'departure';
  selectedPool: CarPoolListing | null;
  seats: number;
  set: <K extends keyof PoolState>(key: K, value: PoolState[K]) => void;
  reset: () => void;
}

const initial = {
  fromCity: 'all' as const,
  toCity: 'all' as const,
  carType: 'all' as const,
  verifiedOnly: false,
  sort: 'price-low' as const,
  selectedPool: null,
  seats: 1,
};

export const usePoolStore = create<PoolState>((set) => ({
  ...initial,
  set: (key, value) => set({ [key]: value } as Partial<PoolState>),
  reset: () => set(initial),
}));
