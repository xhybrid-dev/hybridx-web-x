// src/lib/shop/downloads.ts
//
// Issuing a download. Server only.
//
// The download page lists files; the button calls this, which checks the
// order, counts recent downloads, mints a five-minute signed URL and records
// the download. The count is the rate limit: it reads the same records the
// download history is made of, so there is no second counter to drift.

import { createHash } from 'node:crypto';
import { adminFirestore } from '@/lib/firebase-admin';
import { getShopFile } from './config';
import { downloadLimits } from './env';
import { findOrderByToken } from './orders';
import { signedDownloadUrl } from './storage';
import { PRODUCTS, type ShopProductDoc } from './products';

export const DOWNLOADS = 'shop_downloads';
const DAY_MS = 24 * 60 * 60 * 1000;

export type DownloadResult =
  | { ok: true; url: string }
  | { ok: false; status: 400 | 403 | 404 | 429 | 503; message: string };

/** One-way, salted, so the record can spot one IP hammering an order without storing the IP. */
export function hashIp(ip: string): string | null {
  if (!ip || ip === 'unknown') return null;
  const salt = process.env.LEAD_TOKEN_SECRET ?? '';
  return createHash('sha256').update(`shop-ip:${salt}:${ip}`).digest('hex').slice(0, 32);
}

export async function requestDownload(input: { token: unknown; product: unknown; ip: string }): Promise<DownloadResult> {
  const { token, product, ip } = input;
  const file = typeof product === 'string' ? getShopFile(product) : undefined;
  if (!file) return { ok: false, status: 400, message: 'Unknown product.' };

  const found = typeof token === 'string' ? await findOrderByToken(token) : null;
  if (!found) return { ok: false, status: 404, message: 'This download link is not valid.' };
  const { id: orderId, order } = found;

  if (order.status !== 'paid') {
    return { ok: false, status: 403, message: 'This order was refunded, so its downloads are no longer available.' };
  }
  if (!order.files.includes(file.key)) {
    return { ok: false, status: 403, message: 'That file is not part of this order.' };
  }

  const limits = downloadLimits();
  const downloads = adminFirestore.collection(DOWNLOADS);
  const since = new Date(Date.now() - DAY_MS);
  const [perProduct, total] = await Promise.all([
    downloads
      .where('orderId', '==', orderId)
      .where('product', '==', file.key)
      .where('at', '>=', since)
      .count()
      .get(),
    downloads.where('orderId', '==', orderId).count().get(),
  ]);
  if (perProduct.data().count >= limits.perProductPerDay) {
    return {
      ok: false,
      status: 429,
      message: `This file has been downloaded ${limits.perProductPerDay} times in the last 24 hours. Please try again tomorrow, or reply to your order email if you need help.`,
    };
  }
  if (total.data().count >= limits.total) {
    return {
      ok: false,
      status: 429,
      message: 'This order has reached its download limit. Reply to your order email and we will sort it out.',
    };
  }

  const productSnap = await adminFirestore.collection(PRODUCTS).doc(file.key).get();
  const productDoc = productSnap.exists ? (productSnap.data() as ShopProductDoc) : null;
  if (!productDoc?.storagePath || !productDoc.currentVersion) {
    console.error('[shop] download requested for a file that has not been uploaded', { product: file.key });
    return { ok: false, status: 503, message: 'This file is not available right now. Please try again later.' };
  }

  const url = await signedDownloadUrl(productDoc.storagePath, file.downloadFilename);

  await downloads.add({
    orderId,
    product: file.key,
    version: productDoc.currentVersion,
    at: new Date(),
    ipHash: hashIp(ip),
  });

  return { ok: true, url };
}
