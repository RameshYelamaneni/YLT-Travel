import { create } from 'zustand';
import type { AddressInput, CarRentalOption, CarRentalService, CarPoolListing } from '../data/mockCars';

interface CarState {
  pickupCity: string;
  pickupAddress: string;
  dropoffAddress: string;
  date: string;
  time: string;
  carType: 'all' | 'Sedan' | 'SUV' | 'Hatchback' | 'Luxury';
  mode: 'all' | 'self-drive' | 'chauffeured';
  service: 'all' | CarRentalService;
  selectedCar: CarRentalOption | null;
  selectedPool: CarPoolListing | null;
  address: AddressInput | null;
  insurance: boolean;
  set: <K extends keyof CarState>(key: K, value: CarState[K]) => void;
  setAddress: (a: AddressInput) => void;
  reset: () => void;
}

const initial = {
  pickupCity: 'Hyderabad',
  pickupAddress: '',
  dropoffAddress: '',
  date: new Date().toISOString().slice(0, 10),
  time: '10:00',
  carType: 'all' as const,
  mode: 'all' as const,
  service: 'all' as const,
  selectedCar: null,
  selectedPool: null,
  address: null,
  insurance: false,
};

export const useCarStore = create<CarState>((set) => ({
  ...initial,
  set: (key, value) => set({ [key]: value } as Partial<CarState>),
  setAddress: (address) => set({ address }),
  reset: () => set(initial),
}));
