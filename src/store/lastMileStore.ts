import { create } from 'zustand';
import type { LastMileCar, AddressInput } from '../data/mockCars';

interface LastMileState {
  selectedCar: LastMileCar | null;
  address: AddressInput | null;
  fare: number;
  surgeMultiplier: number;
  set: <K extends keyof LastMileState>(key: K, value: LastMileState[K]) => void;
  setCar: (car: LastMileCar | null) => void;
  setAddress: (a: AddressInput | null) => void;
  setFare: (fare: number) => void;
  reset: () => void;
}

const initial = {
  selectedCar: null,
  address: null,
  fare: 0,
  surgeMultiplier: 1,
};

export const useLastMileStore = create<LastMileState>((set) => ({
  ...initial,
  set: (key, value) => set({ [key]: value } as Partial<LastMileState>),
  setCar: (selectedCar) => set({ selectedCar }),
  setAddress: (address) => set({ address }),
  setFare: (fare) => set({ fare }),
  reset: () => set(initial),
}));
