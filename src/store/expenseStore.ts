import { create } from 'zustand';

export interface ExpenseEntry {
  id: string;
  car_id: string;
  category: 'fuel' | 'maintenance' | 'toll';
  amount: number;
  date: string;
  note: string;
}

const seed: ExpenseEntry[] = [
  { id: 'CE-01', car_id: 'FC-001', category: 'fuel', amount: 3200, date: '2026-07-15', note: 'CNG refill' },
  { id: 'CE-02', car_id: 'FC-002', category: 'maintenance', amount: 8500, date: '2026-07-14', note: 'Oil change + filter' },
  { id: 'CE-03', car_id: 'FC-001', category: 'toll', amount: 450, date: '2026-07-16', note: 'Outer Ring Road toll' },
  { id: 'CE-04', car_id: 'FC-003', category: 'fuel', amount: 2800, date: '2026-07-16', note: 'Petrol refill' },
];

interface ExpenseState {
  entries: ExpenseEntry[];
  add: (e: ExpenseEntry) => void;
  remove: (id: string) => void;
  exportCsv: () => string;
  exportJson: () => string;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  entries: seed,
  add: (e) => set((s) => ({ entries: [...s.entries, e] })),
  remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
  exportCsv: () => {
    const rows = [['id', 'car_id', 'category', 'amount', 'date', 'note']];
    get().entries.forEach((e) => rows.push([e.id, e.car_id, e.category, String(e.amount), e.date, e.note]));
    return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  },
  exportJson: () => JSON.stringify(get().entries, null, 2),
}));
