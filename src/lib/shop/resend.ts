// src/lib/shop/resend.ts
//
// "I lost my download link." Server only.
//
// The caller always gets the same answer, whether or not the address has an
// order, so this cannot be used to find out who bought what. The work itself
// runs after the response has been sent (see the route), so the response
// time does not give it away either.

import { createHash } from 'node:crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendResendEmail } from './email';
import { orderItemNames, paidOrdersForEmail } from './orders';

export const RESEND_RESPONSE = 'If this address has an order, a link has been sent.';

const HOUR_MS = 60 * 60 * 1000;
const RESEND_LIMIT = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

/** True when this address or this IP has asked three times in the last hour. */
export async function resendRateLimited(email: string, ip: string): Promise<boolean> {
  const emailKey = createHash('sha256').update(email).digest('hex').slice(0, 32);
  const checks = [checkRateLimit(`shop-resend-email:${emailKey}`, HOUR_MS, RESEND_LIMIT)];
  if (ip && ip !== 'unknown') checks.push(checkRateLimit(`shop-resend-ip:${ip}`, HOUR_MS, RESEND_LIMIT));
  const results = await Promise.all(checks);
  return results.some((r) => !r.allowed);
}

/** Send every paid order's link for `email`, if there are any. Never throws. */
export async function sendLinksFor(email: string): Promise<void> {
  try {
    const orders = await paidOrdersForEmail(email);
    if (orders.length === 0) return;
    await sendResendEmail(
      email,
      orders.map(({ order }) => ({
        token: order.downloadToken,
        shortId: order.shortId,
        itemNames: orderItemNames(order),
      })),
    );
  } catch (err) {
    console.error('[shop] resend failed:', err instanceof Error ? err.message : String(err));
  }
}
