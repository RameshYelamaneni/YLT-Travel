import { useRef, type ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function RippleButton({ variant = 'primary', className = '', children, onClick, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  function spawnRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 0.6;
    const ripple = document.createElement('span');
    ripple.className = 'erp-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 200);
  }

  return (
    <button
      ref={ref}
      className={`${variant === 'primary' ? 'btn-primary' : 'btn-ghost'} ${className}`}
      onClick={(e) => { spawnRipple(e); onClick?.(e); }}
      {...rest}
    >
      {children}
    </button>
  );
}
