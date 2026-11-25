// src/lib/site-health/live.ts
//
// runSiteHealth wired to the real site, Firestore and the mail transport. Imported only by the
// hourly job and the admin page. Production only: a developer's machine must not email anyone
// about localhost.

import { createHash } from 'node:crypto';
import { adminFirestore } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email/service';
import { getEngineSettings, reviewAddress } from '@/lib/guides/store';
import sitemap from '@/lib/sitemap';
import { SITE_CONFIG } from '@/lib/seo';
import type { PageSnapshot, SiteTarget } from './analyse';
import { runSiteHealth, type HealthDeps, type HealthRun, type HealthState } from './run';

export const HEALTH_COLLECTION = 'siteHealth';
const PRODUCTION_ORIGIN = 'https://hybridx.club';
const TIMEOUT_MS = 8_000;
const AGENT = 'HybridXSiteCheck/1.0 (+https://hybridx.club/about)';

const docId = (key: string) => createHash('sha1').update(key).digest('hex').slice(0, 24);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function listHealthStates(): Promise<HealthState[]> {
  const snap = await adminFirestore.collection(HEALTH_COLLECTION).get();
  return snap.docs.map((d) => d.data() as HealthState);
}

export function liveHealthDeps(origin: string = SITE_CONFIG.url): HealthDeps {
  return {
    origin,
    async paths() {
      const entries = await sitemap();
      return [...new Set(entries.map((e) => new URL(e.url)).filter((u) => u.origin === origin).map((u) => u.pathname))];
    },
    async fetchPage(path): Promise<PageSnapshot> {
      const res = await fetch(`${origin}${path}`, { redirect: 'manual', headers: { 'user-agent': AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      return { path, status: res.status, location: res.headers.get('location'), headers: res.headers, html: res.status === 200 ? await res.text() : '' };
    },
    async fetchTarget(target: SiteTarget) {
      const res = await fetch(target.url(origin), {
        redirect: target.manualRedirect ? 'manual' : 'follow',
        headers: { 'user-agent': AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return { status: res.status, location: res.headers.get('location'), headers: res.headers, body: res.status < 400 || res.status === 404 ? await res.text() : '' };
    },
    loadStates: listHealthStates,
    async saveStates(states) {
      const batch = adminFirestore.batch();
      for (const s of states) batch.set(adminFirestore.collection(HEALTH_COLLECTION).doc(docId(s.key)), s);
      await batch.commit();
    },
    async deleteStates(keys) {
      const batch = adminFirestore.batch();
      for (const k of keys) batch.delete(adminFirestore.collection(HEALTH_COLLECTION).doc(docId(k)));
      await batch.commit();
    },
    async alert(items) {
      const to = reviewAddress(await getEngineSettings());
      if (!to) return false;
      const lines = items.flatMap((i) => i.issues.map((x) => `${i.label}: ${x.message}`));
      const subject = `HybridX site check: ${items.length} ${items.length === 1 ? 'thing needs' : 'things need'} attention`;
      const text = `${lines.join('\n')}\n\nSee all of it at ${origin}/admin/site-health (sign in first). A persistent problem is mentioned again after three days.`;
      const html = `<p>${lines.map(esc).join('<br>')}</p><p><a href="${origin}/admin/site-health">Open the site health page</a> (sign in first). A persistent problem is mentioned again after three days.</p>`;
      // An admin notification, not list mail: no unsubscribe header.
      await sendEmail({ to, subject, text, html, transactional: true });
      return true;
    },
    now: () => new Date(),
  };
}

export async function liveSiteHealth(): Promise<HealthRun> {
  if (process.env.NODE_ENV !== 'production' || SITE_CONFIG.url !== PRODUCTION_ORIGIN) return { checked: 0, errors: 0, warnings: 0, alerted: 0, skipped: 'not production' };
  return runSiteHealth(liveHealthDeps());
}
