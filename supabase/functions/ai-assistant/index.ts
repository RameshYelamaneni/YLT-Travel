import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, email } = await req.json() as { prompt?: string; email?: string };
    if (!prompt || typeof prompt !== "string") {
      return json({ reply: "Please ask a question so I can help." }, 400);
    }

    const text = prompt.toLowerCase().trim();
    const emailProvided = (email ?? "").trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const wantsBookings = /\b(book|booking|pnr|ticket|reservation|trip|ride|my (bus|car|pool))\b/.test(text)
      || (emailProvided.length > 0 && /\b(email|mail|account|details|status|refund|cancel)\b/.test(text));

    if (wantsBookings && emailProvided) {
      const { data, error } = await supabase
        .from("bookings")
        .select("pnr,operator,from_city,to_city,travel_date,departure_time,seats,total_amount,status,payment_status")
        .ilike("contact_email", emailProvided)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        return json({ reply: `I couldn't fetch your bookings right now: ${error.message}. Please try again.` });
      }
      if (!data || data.length === 0) {
        return json({ reply: `I couldn't find any bookings for ${emailProvided}. Double-check the email or book a trip first.` });
      }

      const lines = data.map((b: any) => {
        const seats = Array.isArray(b.seats) && b.seats.length ? b.seats.join(", ") : "—";
        return `• PNR ${b.pnr} — ${b.operator}: ${b.from_city} → ${b.to_city} on ${b.travel_date} at ${b.departure_time}. Seats: ${seats}. ₹${b.total_amount}. Status: ${b.status}. Payment: ${b.payment_status}.`;
      });
      return json({ reply: `Here are your bookings for ${emailProvided}:\n${lines.join("\n")}` });
    }

    if (wantsBookings && !emailProvided) {
      return json({ reply: "To pull up your bookings, please share the email you used while booking." });
    }

    return json({ reply: routeFaq(text) });
  } catch (err) {
    return json({ reply: `Sorry, something went wrong: ${(err as Error).message}. Please try again.` }, 500);
  }
});

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function routeFaq(text: string): string {
  if (/\b(hi|hello|hey|good (morning|evening|afternoon))\b/.test(text) && text.length < 20) {
    return "Hi! I'm the YLT assistant. Ask me about your bookings (share your email), or about buses, cars, car pools, payments, refunds, or the operator ERP.";
  }
  if (/\b(bus|volvo|sleeper|ac bus)\b/.test(text)) {
    return "YLT aggregates intercity buses across 10+ South Indian cities. Search by origin, destination and date to see live availability with seat maps, amenities, and instant PNR. Pick your seats, choose boarding/dropping points, and pay — your digital ticket with QR is available in My Bookings.";
  }
  if (/\b(car|rental|self.?drive|chauffeur|outstation|airport)\b/.test(text)) {
    return "YLT offers six car rental modes: chauffeured, outstation, airport, hourly, subscription and self-drive. All come with surge-aware pricing, optional insurance, and downloadable PDF tickets.";
  }
  if (/\b(pool|carpool|share|car pool)\b/.test(text)) {
    return "Car Pool lets you book a seat in an SLA-verified driver's car on popular intercity routes. Browse pools by route and date, book seats, pay online, and get a digital ticket with driver contact.";
  }
  if (/\b(pay|payment|upi|card|wallet|refund)\b/.test(text)) {
    return "We support UPI, credit/debit cards and wallets via a PCI-compliant gateway. PNR is generated instantly on payment. Refunds for cancellations go back to the original method within 3-5 business days. Fares include all taxes — no hidden charges.";
  }
  if (/\b(erp|operator|fleet|dispatch|driver roster)\b/.test(text)) {
    return "Agent partners get an ERP: Fleet Manager, Expense Ledger, Driver Roster, and an AI Dispatch Assistant. Log in via the ERP tab in the login modal. Operator credentials are issued by core admins.";
  }
  if (/\b(admin|director|smtp|settings)\b/.test(text)) {
    return "Core admins manage directors, agent partners, SMTP email settings, and app configuration from the Admin Panel. Admin sessions auto-expire after 5 minutes of inactivity.";
  }
  if (/\b(login|sign in|otp|password|account)\b/.test(text)) {
    return "Sign in with email OTP (passwordless) or email + password. Sessions last 7 days. Forgot your password? Use the OTP flow, then reset from profile settings.";
  }
  return "I can help with bus, car and car pool bookings, payments and refunds, your account, the operator ERP, and the admin panel. Tip: share your booking email and ask 'show my bookings' to pull up your tickets.";
}
