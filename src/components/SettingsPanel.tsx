import { useState } from 'react';
import { Settings, Sun, Moon, X, Check } from 'lucide-react';
import { useTheme, type Theme } from '../store/theme';

export default function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const options: { id: Theme; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'light', label: 'Light', icon: Sun,  desc: 'Bright daytime look' },
    { id: 'dark',  label: 'Dark',  icon: Moon, desc: 'Easy on the eyes at night' },
  ];

  return (
    <>
      {/* Floating gear — sits above the chat button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Settings"
        className="fixed bottom-20 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-crimson-600 text-white shadow-lg transition hover:scale-105 hover:bg-crimson-500 active:scale-95"
      >
        <Settings className="h-5 w-5 animate-spin-slow" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="surface relative w-full max-w-sm p-5 animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-crimson-500" />
                <h3 className="font-display text-lg font-bold">Settings</h3>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose your preferred theme.</p>

            <div className="mt-4 space-y-2">
              {options.map((o) => {
                const active = theme === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => { setTheme(o.id); }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                      active ? 'border-crimson-500/50 bg-crimson-500/10' : 'border-[var(--border)] hover:bg-[var(--bg-raised)]'
                    }`}
                  >
                    <div className={`grid h-10 w-10 place-items-center rounded-lg ${active ? 'bg-crimson-600 text-white' : 'bg-[var(--bg-raised)]'}`} style={!active ? { color: 'var(--text-secondary)' } : undefined}>
                      <o.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{o.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.desc}</p>
                    </div>
                    {active && <Check className="h-5 w-5 text-crimson-500" />}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Current theme: <span className="font-semibold text-crimson-500">{theme}</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
