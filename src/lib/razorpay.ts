import { apiUrl } from './api';

export async function payWithRazorpay(opts: {
  amount: number;
  name: string;
  description: string;
  email?: string;
}): Promise<
  | { ok: true; paymentId: string; orderId?: string; signature?: string }
  | { ok: false; message: string }
> {
  let key = '';
  let order: { id?: string; amount?: number } | null = null;

  try {
    const orderRes = await fetch(apiUrl('/api/payments/create-order'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: opts.amount, receipt: `bus_${Date.now()}` }),
    });
    const orderData = await orderRes.json();
    if (orderRes.ok && orderData.success) {
      key = orderData.key_id;
      order = orderData.order;
    }
  } catch {
    /* continue if public key is configured */
  }

  if (!key) key = String(import.meta.env.VITE_RAZORPAY_KEY_ID || '');
  if (!key) {
    return { ok: false, message: 'Add Razorpay Key ID in Admin → Payments (stored on the server).' };
  }

  await loadScript();

  return new Promise((resolve) => {
    const Razorpay = (window as any).Razorpay;
    const rzp = new Razorpay({
      key,
      amount: order?.amount ?? Math.round(opts.amount * 100),
      currency: 'INR',
      name: 'YLT Travels',
      description: opts.description,
      ...(order?.id ? { order_id: order.id } : {}),
      prefill: { email: opts.email, name: opts.name },
      theme: { color: '#0b1f3a' },
      handler: async (response: { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature?: string }) => {
        if (order?.id) {
          if (!response.razorpay_signature) {
            resolve({ ok: false, message: 'Payment verification failed.' });
            return;
          }
          try {
            const verify = await fetch(apiUrl('/api/payments/verify'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const data = await verify.json();
            if (!verify.ok || !data.success) {
              resolve({ ok: false, message: data.message ?? data.error ?? 'Payment verification failed.' });
              return;
            }
          } catch {
            resolve({ ok: false, message: 'Payment verification failed.' });
            return;
          }
        }
        resolve({
          ok: true,
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id || order?.id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => resolve({ ok: false, message: 'Payment cancelled.' }),
      },
    });
    rzp.open();
  });
}

function loadScript() {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).Razorpay) { resolve(); return; }
    const el = document.createElement('script');
    el.src = 'https://checkout.razorpay.com/v1/checkout.js';
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Could not load Razorpay.'));
    document.body.appendChild(el);
  });
}
