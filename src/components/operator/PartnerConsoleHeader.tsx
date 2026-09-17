import { useEffect, useRef } from 'react';

/**
 * Premium transport ERP header animation.
 * A single continuous gradient wave flows horizontally behind the title,
 * with subtle neon glow pulses around the text. Seamless 7s loop.
 * Pure CSS/SVG — no external Lottie dependency required.
 */
export default function PartnerConsoleHeader() {
  const ref = useRef<HTMLDivElement>(null);

  // Pause animations when the banner scrolls out of view to save CPU.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        el.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
        el.querySelectorAll<SVGElement>('[data-anim]').forEach((n) => {
          n.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
        });
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl border"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(120deg, #0b0f1a 0%, #131a2b 40%, #0e1422 70%, #0a0e18 100%)',
        }}
      />

      {/* Single continuous gradient wave flowing horizontally */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1400 220"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="erpWave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#cd2c40" stopOpacity="0" />
            <stop offset="25%" stopColor="#cd2c40" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#cd2c40" stopOpacity="0" />
          </linearGradient>
          <filter id="erpGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Single flowing wave — seamless horizontal drift (tiles every 700px) */}
        <path
          data-anim
          d="M-700,150 C-500,110 -300,170 0,130 C300,90 500,160 700,120 C900,80 1100,150 1400,110 L1400,220 L-700,220 Z"
          fill="url(#erpWave)"
          filter="url(#erpGlow)"
          style={{ animation: 'erp-wave-flow 7s linear infinite' }}
        />
      </svg>

      {/* Soft radial vignette to keep focus on the text */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 55%, rgba(205,44,64,0.14) 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, rgba(34,211,238,0.08) 0%, transparent 50%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-10 text-center sm:py-12">
        <span
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70 backdrop-blur"
          style={{ animation: 'erp-badge-pulse 4s ease-in-out infinite' }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-crimson-400" style={{ animation: 'erp-dot-blink 1.4s ease-in-out infinite' }} />
          Enterprise Edition
        </span>

        <h1
          className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          style={{
            color: '#fff',
            textShadow:
              '0 0 12px rgba(205,44,64,0.55), 0 0 28px rgba(205,44,64,0.35), 0 0 48px rgba(34,211,238,0.18)',
            animation: 'erp-text-glow 6s ease-in-out infinite',
          }}
        >
          YLT Transit{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(90deg, #ff6b81, #cd2c40, #22d3ee, #ff6b81)',
              backgroundSize: '300% 100%',
              animation: 'erp-title-shimmer 6s ease-in-out infinite',
            }}
          >
            Partner Console
          </span>
        </h1>

        <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
          The unified operating system for intercity bus &amp; car fleet dispatch.
        </p>
      </div>

      {/* Bottom hairline glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(205,44,64,0.7), rgba(34,211,238,0.5), transparent)',
          backgroundSize: '200% 100%',
          animation: 'erp-line-sweep 7s linear infinite',
        }}
        data-anim
      />
    </div>
  );
}
