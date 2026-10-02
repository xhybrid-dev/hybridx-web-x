/**
 * Upload a new version of a shop PDF and make it current.
 *
 *   npx tsx scripts/shop-upload.ts <fileKey> <file.pdf> <version> "<changelog note>"
 *
 *   npx tsx scripts/shop-upload.ts glasgow-2027-guide \
 *     private/shop-source/HybridX_HYROX_Glasgow_2027_Guide.pdf 1 "First edition"
 *
 * Writes shop/{fileKey}/v{version}.pdf to the private bucket, then updates
 * shop_products/{fileKey} so every buyer's download page shows the new
 * version straight away. No deploy is needed.
 *
 * Credentials: Application Default Credentials (`gcloud auth
 * application-default login` as an owner of hybridx-hub), or
 * GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env, the same as
 * the rest of the site's local tooling.
 *
 * The version must be higher than the current one. Old versions stay in the
 * bucket, so a bad upload is undone by uploading the previous file again
 * under the next number.
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { getShopFile, shopStoragePath } from '../src/lib/shop/config';

async function main() {
  const [key, path, versionArg, ...noteParts] = process.argv.slice(2);
  const note = noteParts.join(' ').trim();
  const version = Number(versionArg);

  if (!key || !path || !versionArg || !note) {
    console.error('Usage: npx tsx scripts/shop-upload.ts <fileKey> <file.pdf> <version> "<changelog note>"');
    process.exit(1);
  }
  const file = getShopFile(key);
  if (!file) {
    console.error(`Unknown file key "${key}". Keys are listed in src/lib/shop/config.ts.`);
    process.exit(1);
  }
  if (!Number.isInteger(version) || version < 1) {
    console.error('Version must be a whole number from 1.');
    process.exit(1);
  }

  const data = await readFile(path);
  if (data.subarray(0, 5).toString('latin1') !== '%PDF-') {
    console.error(`${path} does not look like a PDF.`);
    process.exit(1);
  }

  // Imported here so a usage error above never needs credentials.
  const { uploadPdf } = await import('../src/lib/shop/storage');
  const { getProductDocs, publishVersion } = await import('../src/lib/shop/products');

  // Checked before uploading as well as inside publishVersion: the upload
  // would otherwise overwrite an older version's file before being refused.
  const current = (await getProductDocs([key])).get(key);
  if (current && version <= current.currentVersion) {
    console.error(`Version ${version} is not newer than the current version ${current.currentVersion}.`);
    process.exit(1);
  }

  const storagePath = shopStoragePath(key, version);
  console.log(`Uploading ${path} (${Math.round(data.byteLength / 1024)} KB) to ${storagePath}…`);
  await uploadPdf(storagePath, data);

  const doc = await publishVersion(key, version, note);
  console.log(`${file.name} is now version ${doc.currentVersion}.`);
  console.log(`Changelog: ${doc.changelog.map((c) => `v${c.version} ${c.date} ${c.note}`).join(' | ')}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
