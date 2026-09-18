import { Palette } from 'lucide-react';
import { THEMES, useTheme, themeLabel, type Theme } from '../store/theme';

export default function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={compact ? '' : 'px-1 py-2.5'}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          <Palette className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          Theme
        </span>
        <span className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{themeLabel(theme)}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id as Theme)}
              aria-pressed={active}
              aria-label={`${t.label} theme`}
              className="min-h-[3.25rem] rounded-xl border p-2 text-left transition active:scale-[0.98]"
              style={{
                borderColor: active ? 'var(--crimson)' : 'var(--border)',
                backgroundColor: active ? 'var(--bg-raised)' : 'var(--bg-input)',
                boxShadow: active ? '0 0 0 1px var(--crimson)' : undefined,
              }}
            >
              <span className="flex h-5 overflow-hidden rounded-md ring-1 ring-black/10">
                {t.swatches.map((c) => (
                  <span key={c} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className="mt-1.5 block text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
