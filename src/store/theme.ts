import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEMES = [
  {
    id: 'ylt-red',
    label: 'YLT Red',
    desc: 'Original crimson, navy & gold',
    swatches: ['#0b1f3a', '#c41e3a', '#d4a017'],
  },
  {
    id: 'navy-gold',
    label: 'Navy Gold',
    desc: 'Navy chrome with gold CTAs',
    swatches: ['#071428', '#1e4a7a', '#d4a017'],
  },
  {
    id: 'emerald',
    label: 'Emerald',
    desc: 'Fresh green professional',
    swatches: ['#f3faf7', '#ffffff', '#059669'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    desc: 'Dark charcoal night mode',
    swatches: ['#0c0e12', '#23262b', '#e8b02a'],
  },
  {
    id: 'light',
    label: 'Light / Day',
    desc: 'Bright daytime look',
    swatches: ['#f4f5f7', '#ffffff', '#0b1f3a'],
  },
  {
    id: 'high-contrast',
    label: 'High contrast',
    desc: 'Maximum readability',
    swatches: ['#000000', '#ffffff', '#ffe600'],
  },
  {
    id: 'scarlet',
    label: 'Scarlet',
    desc: 'Bright transit red on white',
    swatches: ['#d84e55', '#ffffff', '#1a1a1a'],
  },
  {
    id: 'amber',
    label: 'Amber',
    desc: 'Warm orange on white',
    swatches: ['#f97316', '#ffffff', '#0f172a'],
  },
] as const;

export type Theme = (typeof THEMES)[number]['id'];

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));
const DARK_THEMES = new Set<Theme>(['ylt-red', 'navy-gold', 'midnight', 'high-contrast']);

export const DEFAULT_THEME: Theme = 'ylt-red';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && THEME_IDS.has(value);
}

export function normalizeTheme(value: unknown): Theme {
  if (value === 'dark') return 'midnight';
  if (isTheme(value)) return value;
  return DEFAULT_THEME;
}

export function themeLabel(id: Theme): string {
  return THEMES.find((t) => t.id === id)?.label ?? 'YLT Red';
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme | string) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => {
        const next = normalizeTheme(theme);
        set({ theme: next });
        applyTheme(next);
      },
    }),
    {
      name: 'ylt-theme',
      version: 1,
      migrate: (persisted) => {
        const raw = (persisted as { theme?: unknown } | undefined)?.theme;
        // Pre-picker store only had light/dark. Restore brand red as default.
        if (raw === 'dark') return { theme: 'midnight' as Theme };
        if (raw === 'light') return { theme: DEFAULT_THEME };
        return { theme: normalizeTheme(raw) };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    }
  )
);

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const id = normalizeTheme(theme);
  root.setAttribute('data-theme', id);
  const dark = DARK_THEMES.has(id);
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
}
