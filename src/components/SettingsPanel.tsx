import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import ThemePicker from './ThemePicker';
import { useTheme, themeLabel } from '../store/theme';

export default function SettingsPanel() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Settings"
        className="fixed bottom-20 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-navy-900 text-gold-400 shadow-lg transition hover:scale-105 hover:bg-navy-800 active:scale-95"
      >
        <Settings className="h-5 w-5 animate-spin-slow" />
      </button>

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
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose your preferred theme. Applied immediately.</p>
            <div className="mt-4">
              <ThemePicker compact />
            </div>
            <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Current theme: <span className="font-semibold text-crimson-500">{themeLabel(theme)}</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
