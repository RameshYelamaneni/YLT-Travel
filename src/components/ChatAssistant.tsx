import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';

interface Msg { id?: string; role: 'user' | 'ai'; content: string }

const SUGGESTIONS = [
  'Show my bookings',
  'How do I book a bus?',
  'How do refunds work?',
  'Tell me about car rentals',
];

export default function ChatAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', content: "Hi! I'm the YLT assistant. Ask about your bookings, buses, cars, payments, or the operator ERP." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const thread = (email.trim() || user?.email || 'guest').toLowerCase();

  useEffect(() => { if (user?.email) setEmail(user.email); }, [user]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy, open]);

  useEffect(() => {
    if (!open) return;
    let stop = false;
    async function pull() {
      try {
        const res = await apiFetch(`/api/chat.php?thread=${encodeURIComponent(thread)}&email=${encodeURIComponent(thread)}`);
        const data = await res.json();
        const rows: any[] = data.messages ?? [];
        if (!stop && rows.length) {
          setMessages(rows.map((r) => ({
            id: r.id,
            role: r.role === 'user' ? 'user' : 'ai',
            content: r.content,
          })));
        }
      } catch { /* keep local */ }
    }
    pull();
    const t = window.setInterval(pull, 4000);
    return () => { stop = true; window.clearInterval(t); };
  }, [open, thread]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setMessages((m) => [...m, { role: 'user', content: prompt }]);
    setInput('');
    setBusy(true);
    try {
      const res = await apiFetch('/api/chat.php', {
        method: 'POST',
        body: JSON.stringify({ prompt, email: thread, thread, channel: 'web' }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'ai', content: data.reply ?? data.error ?? 'Sorry, I did not get a response.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', content: 'Network error. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat with YLT assistant"
        className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-navy-900 text-gold-400 shadow-lg transition hover:scale-105 hover:bg-navy-800 active:scale-95 sm:h-14 sm:w-14"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[var(--bg-page)]" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-3 z-50 flex h-[min(75vh,560px)] w-[min(96vw,380px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl animate-fade-up sm:right-5">
          <div className="flex items-center gap-3 border-b border-[var(--border)] bg-crimson-600 px-4 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><Bot className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-3.5 w-3.5" /> YLT Assistant</p>
              <p className="text-[11px] text-white/70">Live · MySQL · updates every 4s</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>

          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2">
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Signed in as</span>
            <span className="flex-1 truncate text-xs" style={{ color: 'var(--text-primary)' }}>{user?.email || 'Guest — sign in to see your tickets'}</span>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4 scrollbar-thin">
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${m.role === 'user' ? 'bg-crimson-600/15 text-crimson-600' : 'bg-emerald-500/15 text-emerald-600'}`}>
                  {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-crimson-600 text-white' : 'bg-[var(--bg-raised)]'}`} style={m.role === 'ai' ? { color: 'var(--text-primary)' } : undefined}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600"><Bot className="h-3.5 w-3.5" /></div>
                <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-raised)] px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-2.5 py-1 text-[11px] font-medium transition hover:border-crimson-500/40 hover:text-crimson-600" style={{ color: 'var(--text-secondary)' }}>{s}</button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-surface)] px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about bookings, buses, payments…"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none transition focus:border-crimson-500/50"
              style={{ color: 'var(--text-primary)' }}
            />
            <button type="submit" disabled={busy || !input.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-crimson-600 text-white transition hover:bg-crimson-500 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
