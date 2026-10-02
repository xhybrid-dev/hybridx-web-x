// src/lib/shop/storage.ts
//
// The private bucket holding the shop's PDFs. Server only.
//
// Nothing in the bucket is publicly readable: storage.rules denies every
// client, and the Admin SDK reaches it with the backend's own credentials.
// Buyers get a V4 signed URL that lasts five minutes, minted per click.
//
// Signing on App Hosting uses the backend's service account through the IAM
// signBlob API, which needs that account to hold "Service Account Token
// Creator" on itself. docs/shop-setup.md has the command; without it every
// download fails with a permissions error naming iam.serviceAccounts.signBlob.

import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/lib/firebase-admin';
import { storageBucketName } from './env';

export const SIGNED_URL_TTL_MS = 5 * 60 * 1000;

function bucket() {
  return getStorage(adminApp).bucket(storageBucketName());
}

/** A short-lived URL that downloads `path` as `filename`. */
export async function signedDownloadUrl(path: string, filename: string): Promise<string> {
  const [url] = await bucket()
    .file(path)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
      responseDisposition: `attachment; filename="${filename}"`,
      responseType: 'application/pdf',
    });
  return url;
}

/** Upload a PDF. Used by scripts/shop-upload.ts. */
export async function uploadPdf(path: string, data: Buffer): Promise<void> {
  await bucket()
    .file(path)
    .save(data, {
      resumable: false,
      contentType: 'application/pdf',
      metadata: { cacheControl: 'private, no-store' },
    });
}
