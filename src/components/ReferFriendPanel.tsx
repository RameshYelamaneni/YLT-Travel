import { useEffect, useState } from 'react';
import { fetchMyReferral, type MyReferral } from '../lib/attraction';
import { formatINR } from '../lib/format';
import { useAuth } from '../lib/auth';

export default function ReferFriendPanel() {
  const { user } = useAuth();
  const [data, setData] = useState<MyReferral | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    fetchMyReferral()
      .then((row) => { if (live) setData(row); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Could not load your code.'); });
    return () => { live = false; };
  }, [user]);

  if (!user) {
    return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in to get a refer code. After a friend pays for their first trip with your code, you receive ₹50 YLT Saver credit.</p>;
  }

  async function copy() {
    if (!data?.code) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Share your code. After your friend’s first paid YLT trip is recorded, {formatINR(data?.credit || 50)} YLT Saver credit is stored as a one-time coupon on your email.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {data && (
        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-crimson-600">Your code</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{data.code}</p>
          <button type="button" onClick={copy} className="mt-2 text-xs font-semibold text-crimson-600">{copied ? 'Copied' : 'Copy code'}</button>
        </div>
      )}
      {data && data.coupons.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Saver credit ready to use at pay</p>
          <ul className="mt-2 space-y-1.5">
            {data.coupons.map((c) => (
              <li key={c.code} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono font-bold">{c.code}</span>
                <span>{formatINR(c.amount)} · {c.uses_left} use</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
