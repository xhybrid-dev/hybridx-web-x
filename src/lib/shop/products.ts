// src/lib/shop/products.ts
//
// shop_products/{fileKey}: which version of each PDF is current, and what
// changed. Written by scripts/shop-upload.ts, read by the download page and
// the download route. Server only.
//
// This is what lets an updated PDF reach every past buyer without a deploy:
// the download page reads the current version at request time, and the
// signed URL points at whatever storagePath says now.

import { adminFirestore } from '@/lib/firebase-admin';
import { getShopFile, shopStoragePath } from './config';

export const PRODUCTS = 'shop_products';

export interface ChangelogEntry {
  version: number;
  date: string;
  note: string;
}

export interface ShopProductDoc {
  name: string;
  currentVersion: number;
  storagePath: string;
  filename: string;
  updatedAt: Date;
  changelog: ChangelogEntry[];
}

export async function getProductDocs(keys: string[]): Promise<Map<string, ShopProductDoc>> {
  const out = new Map<string, ShopProductDoc>();
  if (keys.length === 0) return out;
  const refs = keys.map((k) => adminFirestore.collection(PRODUCTS).doc(k));
  const snaps = await adminFirestore.getAll(...refs);
  snaps.forEach((snap, i) => {
    if (snap.exists) out.set(keys[i], snap.data() as ShopProductDoc);
  });
  return out;
}

/**
 * Record a newly uploaded version as current.
 *
 * Refuses to go backwards or to reuse a version number: a buyer's download
 * history records versions, and two different files under one number would
 * make that history meaningless.
 */
export async function publishVersion(key: string, version: number, note: string): Promise<ShopProductDoc> {
  const file = getShopFile(key);
  if (!file) throw new Error(`Unknown file key "${key}"`);
  if (!Number.isInteger(version) || version < 1) throw new Error('Version must be a whole number from 1');

  const ref = adminFirestore.collection(PRODUCTS).doc(key);
  return adminFirestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data() as ShopProductDoc) : null;
    if (current && version <= current.currentVersion) {
      throw new Error(`Version ${version} is not newer than the current version ${current.currentVersion}`);
    }
    const now = new Date();
    const next: ShopProductDoc = {
      name: file.name,
      currentVersion: version,
      storagePath: shopStoragePath(key, version),
      filename: file.downloadFilename,
      updatedAt: now,
      changelog: [...(current?.changelog ?? []), { version, date: now.toISOString().slice(0, 10), note }],
    };
    tx.set(ref, next);
    return next;
  });
}
