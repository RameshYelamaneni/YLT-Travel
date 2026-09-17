import { Loader2 } from 'lucide-react';

export function ErpLoader({ label = 'Loading…', size = 40 }: { label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="relative" style={{ width: size, height: size }}>
        <Loader2
          className="erp-loader-ring absolute inset-0 text-crimson-500"
          style={{ width: size, height: size }}
        />
        <div
          className="erp-loader-core absolute rounded-full bg-crimson-500/30"
          style={{ width: size * 0.4, height: size * 0.4, left: size * 0.3, top: size * 0.3 }}
        />
      </div>
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

export function ErpLineLoader() {
  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-[var(--bg-raised)]">
      <div
        className="erp-loader-bar absolute inset-y-0 w-1/3 rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, #cd2c40, #22d3ee, transparent)' }}
      />
    </div>
  );
}
