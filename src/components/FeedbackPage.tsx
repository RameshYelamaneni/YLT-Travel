import { useEffect, useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '../lib/api';
import { useNav } from '../store/nav';

export default function FeedbackPage({ token }: { token: string }) {
  const { go } = useNav();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [pnr, setPnr] = useState('');
  const [kind, setKind] = useState('trip');
  const [already, setAlready] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/feedback.php?token=${encodeURIComponent(token)}`));
        const data = await res.json();
        if (!res.ok || data.error) { setError(data.error ?? 'Invalid link.'); setLoading(false); return; }
        setTitle(data.title ?? '');
        setPnr(data.pnr ?? '');
        setKind(data.booking_type === 'hotel' ? 'stay' : 'trip');
        setAlready(!!data.already);
        setDone(!!data.already);
      } catch { setError('Network error.'); }
      setLoading(false);
    })();
  }, [token]);

  async function submit() {
    if (score < 1) return;
    const res = await fetch(apiUrl('/api/feedback.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, score, comment }),
    });
    const data = await res.json();
    if (!res.ok || data.error) { setError(data.error ?? 'Could not save.'); return; }
    setDone(true);
  }

  return (
    <div className="container-fluid flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: 'var(--border)' }}>
        <p className="text-center text-xs font-bold uppercase tracking-widest text-gold-600">YLT Travels</p>
        <h1 className="mt-2 text-center font-display text-2xl font-bold">Rate your {kind}</h1>
        {loading ? <p className="mt-6 text-center text-sm text-slate-500">Loading…</p> : error ? (
          <p className="mt-6 text-center text-sm text-red-500">{error}</p>
        ) : done ? (
          <div className="mt-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 font-semibold">Thank you. Your rating is saved.</p>
            <button className="btn-primary mt-6 w-full" onClick={() => go({ name: 'home' })}>Back to home</button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-center text-sm text-slate-600">{title}</p>
            <p className="mt-1 text-center font-mono text-xs text-slate-400">PNR {pnr}</p>
            <div className="mt-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setScore(n)} className="p-1" aria-label={`${n} stars`}>
                  <Star className={`h-8 w-8 ${(hover || score) >= n ? 'fill-gold-500 text-gold-500' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <textarea className="mt-5 w-full rounded-xl border p-3 text-sm" rows={4} placeholder="How was the ride or stay? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button className="btn-primary mt-4 w-full" disabled={score < 1} onClick={() => void submit()}>Submit rating</button>
          </>
        )}
      </div>
    </div>
  );
}
