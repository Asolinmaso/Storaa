import crypto from "crypto";

export function razorpayConfig() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  };
}

export const paymentsEnabled = () => {
  const c = razorpayConfig();
  return !!(c.keyId && c.keySecret);
};

async function call<T>(path: string, body: unknown): Promise<T> {
  const { keyId, keySecret } = razorpayConfig();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay ${path} failed: ${JSON.stringify(data)}`);
  return data as T;
}

/** Creates a Razorpay order. `amountRupees` is converted to paise. */
export function createRazorpayOrder(amountRupees: number, receipt: string) {
  return call<{ id: string; amount: number; currency: string }>("/orders", {
    amount: Math.round(amountRupees * 100),
    currency: "INR",
    receipt,
  });
}

export function refundRazorpayPayment(paymentId: string) {
  return call<{ id: string }>(`/payments/${paymentId}/refund`, {});
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Checkout success signature: HMAC-SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", razorpayConfig().keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = razorpayConfig().webhookSecret;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
