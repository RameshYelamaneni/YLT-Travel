import { useMemo, useState } from 'react';
import {
  Search, Headphones, Ticket, Ban, Wallet, Bus, Hotel, CreditCard, User,
  Mail, Phone, ChevronDown, BookOpen,
} from 'lucide-react';
import type { View } from '../store/nav';

type TopicId = 'book' | 'cancel' | 'refund' | 'seats' | 'hotels' | 'payments' | 'account';

interface Faq {
  id: string;
  topic: TopicId;
  q: string;
  a: string;
}

const TOPICS: { id: TopicId; label: string; hint: string; icon: typeof Ticket }[] = [
  { id: 'book', label: 'Book', hint: 'Search, pay, PNR', icon: Ticket },
  { id: 'cancel', label: 'Cancel', hint: 'Stop a confirmed trip', icon: Ban },
  { id: 'refund', label: 'Refund', hint: 'Money back timelines', icon: Wallet },
  { id: 'seats', label: 'Seats', hint: 'Pick and change seats', icon: Bus },
  { id: 'hotels', label: 'Hotels', hint: 'Stays and check-in', icon: Hotel },
  { id: 'payments', label: 'Payments', hint: 'UPI, cards, failed pay', icon: CreditCard },
  { id: 'account', label: 'Account', hint: 'Sign in and bookings', icon: User },
];

const FAQS: Faq[] = [
  {
    id: 'book-1', topic: 'book', q: 'How do I book a bus?',
    a: 'Open Buses, enter from, to, and travel date, then choose a service and seats. Pay on the checkout screen. A PNR is created only after payment succeeds. You can open that PNR any time under Bookings with the same email.',
  },
  {
    id: 'book-2', topic: 'book', q: 'Where do I find my ticket after paying?',
    a: 'Go to Bookings and sign in or look up the PNR emailed to you. Keep the same email you used at checkout so the ticket stays attached to your account.',
  },
  {
    id: 'book-3', topic: 'book', q: 'Can I book a hotel on YLT Travels too?',
    a: 'Yes. Use Hotels, pick city and dates, then pay. Hotel confirmations also appear under Bookings. Bus and hotel bookings are separate PNRs even if you travel on the same trip.',
  },
  {
    id: 'cancel-1', topic: 'cancel', q: 'How do I cancel a bus ticket?',
    a: 'Open Bookings, select the PNR, and choose Cancel if the service still allows it. The amount you get back follows the cancellation window shown on that ticket. If Cancel is not offered, the operator has closed the window — email YLT Care with the PNR.',
  },
  {
    id: 'cancel-2', topic: 'cancel', q: 'What if the operator cancels the service?',
    a: 'YLT Care will move the fare back to the original payment method. Watch the email on the booking. You do not need to file a second request unless the refund is missing after the usual bank window.',
  },
  {
    id: 'cancel-3', topic: 'cancel', q: 'Can I change the travel date instead of cancelling?',
    a: 'Date changes are not automatic. Cancel within the allowed window, then book the new date as a fresh ticket. Fare on the new date can differ.',
  },
  {
    id: 'refund-1', topic: 'refund', q: 'How long does a refund take?',
    a: 'YLT Travels releases the refund to the original UPI or card as soon as the cancellation is confirmed. Banks usually post it in 3–7 working days. We do not hold a stored wallet balance.',
  },
  {
    id: 'refund-2', topic: 'refund', q: 'Will I get a full refund?',
    a: 'Full refunds apply when YLT or the operator cancels the trip. If you cancel, the ticket’s cancellation policy decides the amount. Charges already taken by the bank are not added back.',
  },
  {
    id: 'refund-3', topic: 'refund', q: 'The amount has not reached my account.',
    a: 'Wait the bank window first. Then email care@ylttravels.com with PNR, payment reference, and the last four digits of the UPI or card. YLT Care traces the payout from there.',
  },
  {
    id: 'seats-1', topic: 'seats', q: 'How do I pick seats?',
    a: 'After you choose a service, the seat map shows open, taken, and ladies-only seats. Tap the seats you want, then continue to pay. Seats are held only after payment succeeds.',
  },
  {
    id: 'seats-2', topic: 'seats', q: 'Can I change seats after booking?',
    a: 'Seat changes are not self-serve. Email YLT Care with the PNR and the seats you want. We can move you only if those seats are still free on that service.',
  },
  {
    id: 'seats-3', topic: 'seats', q: 'What if two tickets show the same seat?',
    a: 'Do not board on an unclear seat. Write to care@ylttravels.com with both PNRs. YLT Care will confirm the assignment with the operator before departure.',
  },
  {
    id: 'hotels-1', topic: 'hotels', q: 'How do I book a stay?',
    a: 'Open Hotels, choose city and nights, pick a room, and pay. Your hotel PNR is listed under Bookings. Carry a government ID that matches the guest name at check-in.',
  },
  {
    id: 'hotels-2', topic: 'hotels', q: 'How do hotel cancellations work?',
    a: 'Each stay shows its own free-cancel time on the booking. Cancel from Bookings before that time for a refund to the original payment method. After the window, the stay is non-refundable.',
  },
  {
    id: 'hotels-3', topic: 'hotels', q: 'The hotel asks for extra at the desk.',
    a: 'Room fare paid on YLT Travels is prepaid. Extra beds, meals, or late checkout are settled at the property. If the desk asks you to pay the room again, email YLT Care with the PNR before you pay twice.',
  },
  {
    id: 'pay-1', topic: 'payments', q: 'Which payments does YLT Travels accept?',
    a: 'UPI and cards on the checkout page. There is no stored YLT wallet. Promo codes, when listed on Offers, are entered at pay — expired codes will not apply.',
  },
  {
    id: 'pay-2', topic: 'payments', q: 'Payment failed but money left my account.',
    a: 'Wait two minutes and check Bookings. If no PNR appears, the bank usually reverses the debit on its own. Do not pay a second time until you confirm there is no ticket. Still missing? Email the payment reference to YLT Care.',
  },
  {
    id: 'pay-3', topic: 'payments', q: 'A promo code is not applying.',
    a: 'Codes are case-sensitive and tied to dates, routes, or hotels. If Offers no longer lists the code, it has ended. YLT Care cannot revive an expired campaign.',
  },
  {
    id: 'acc-1', topic: 'account', q: 'How do I see all my trips?',
    a: 'Sign in and open Bookings. Tickets stay with the email used at checkout. If you booked as a guest, use that same email when you create an account.',
  },
  {
    id: 'acc-2', topic: 'account', q: 'I cannot sign in.',
    a: 'Use the email on the ticket. Request a fresh OTP or password reset from Sign In. YLT Care can help if the email itself is wrong — send the PNR and a reachable phone number.',
  },
  {
    id: 'acc-3', topic: 'account', q: 'Who can see my booking?',
    a: 'Only you (signed in) and YLT Care when you share the PNR. Partner ERP staff see trips they operate, not your password. Never send OTP codes to anyone claiming to be support.',
  },
];

const CARE_MAIL = 'care@ylttravels.com';
const CARE_PHONE = '+91 99999 99999';

function matchesQuery(faq: Faq, q: string) {
  if (!q) return true;
  return `${faq.q} ${faq.a}`.toLowerCase().includes(q);
}

export default function HelpPage({ go }: { go: (v: View) => void }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<TopicId>('book');
  const [topicLocked, setTopicLocked] = useState(false);
  const [openId, setOpenId] = useState<string | null>('book-1');

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => FAQS.filter((f) => matchesQuery(f, q)), [q]);
  const topicCounts = useMemo(() => {
    const m: Record<string, number> = {};
    hits.forEach((f) => { m[f.topic] = (m[f.topic] || 0) + 1; });
    return m;
  }, [hits]);

  const searching = q.length > 0;
  const activeTopic = searching && (!topicLocked || !topicCounts[topic]) ? (hits[0]?.topic || topic) : topic;
  const visible = searching && !topicLocked ? hits : hits.filter((f) => f.topic === activeTopic);

  function pickTopic(id: TopicId) {
    setTopic(id);
    setTopicLocked(true);
    const first = FAQS.find((f) => f.topic === id && matchesQuery(f, q));
    setOpenId(first?.id || null);
  }

  function onSearch(value: string) {
    setQuery(value);
    setTopicLocked(false);
    const next = value.trim().toLowerCase();
    const first = FAQS.find((f) => matchesQuery(f, next));
    if (first) {
      setTopic(first.topic);
      setOpenId(first.id);
    } else {
      setOpenId(null);
    }
  }

  return (
    <div className="pb-16">
      <section className="bg-crimson-600 text-white">
        <div className="container-fluid grid gap-5 py-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">YLT Care</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Answers for your trip</h1>
            <p className="mt-2 max-w-xl text-sm text-white/90">Search first. Open a topic only if you want to browse. No sign-in required to read help.</p>
            <label className="relative mt-5 block max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-transparent focus:ring-white/70"
                placeholder="Try cancel, refund, PNR, hotel, seat…"
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                type="search"
                autoComplete="off"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25" onClick={() => go({ name: 'bookings' })}>Find my booking</button>
              <button type="button" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25" onClick={() => go({ name: 'routes' })}>Search buses</button>
              <button type="button" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25" onClick={() => go({ name: 'hotels' })}>Search hotels</button>
            </div>
          </div>

          <aside className="rounded-2xl bg-white p-4 text-slate-800 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-crimson-50 text-crimson-700">
                <Headphones className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-crimson-700">24/7 YLT Care</p>
                <p className="font-display text-lg font-bold">Talk to a person</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">Include your PNR. We do not ask for OTP or passwords.</p>
            <a href={`mailto:${CARE_MAIL}`} className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-crimson-800 hover:bg-crimson-50">
              <Mail className="h-4 w-4 shrink-0" /> {CARE_MAIL}
            </a>
            <a href="tel:+919999999999" className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              <Phone className="h-4 w-4 shrink-0" /> {CARE_PHONE}
            </a>
          </aside>
        </div>
      </section>

      <div className="container-fluid mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:overflow-visible" aria-label="Help topics">
          {TOPICS.map((t) => {
            const count = topicCounts[t.id] || 0;
            const on = t.id === activeTopic;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTopic(t.id)}
                disabled={searching && count === 0}
                className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${on ? 'bg-crimson-50 font-semibold text-crimson-800' : 'border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)]'} ${searching && count === 0 ? 'opacity-40' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="block">{t.label}</span>
                    <span className="hidden text-xs font-normal text-slate-500 lg:block">{t.hint}</span>
                  </span>
                </span>
                <span className="text-xs tabular-nums text-slate-400">{searching ? count : FAQS.filter((f) => f.topic === t.id).length}</span>
              </button>
            );
          })}
        </nav>

        <div>
          <div className="mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <BookOpen className="h-4 w-4" />
            {searching
              ? `${hits.length} match${hits.length === 1 ? '' : 'es'} for “${query.trim()}”${topicLocked ? ` in ${TOPICS.find((t) => t.id === topic)?.label}` : ''}`
              : `${TOPICS.find((t) => t.id === activeTopic)?.label} — tap a question`}
          </div>

          {!visible.length && (
            <div className="rounded-2xl border px-4 py-8 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              No answer matches that search. Email {CARE_MAIL} with your PNR, or pick another topic.
            </div>
          )}

          <ul className="space-y-2">
            {visible.map((faq) => {
              const open = openId === faq.id;
              return (
                <li key={faq.id} className="rounded-2xl border bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => setOpenId(open ? null : faq.id)}
                    aria-expanded={open}
                  >
                    <span className="font-semibold">{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <p className="border-t px-4 py-3 text-sm leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                      {faq.a}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
