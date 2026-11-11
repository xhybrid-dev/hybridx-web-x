// src/lib/guides/harvest/live.ts
//
// The harvest wired to the real world: Search Console through the runtime's
// own identity, Keyword Planner once its credentials exist, and the site's
// mail transport for the weekly summary.
// Imported only by the hourly maintenance job.

import { sendEmail } from '@/lib/email/service';
import { liveSearchConsole } from '@/lib/google/search-console';
import { liveKeywordPlanner } from '@/lib/google/keyword-planner';
import { buildSummaryEmail } from '../email';
import type { HarvestDeps } from './run';

export const liveHarvestDeps: HarvestDeps = {
  sc: liveSearchConsole,
  // Off until the Keyword Planner credentials exist (src/lib/google/keyword-planner.ts).
  ads: liveKeywordPlanner,
  // An admin notification, not list mail: no unsubscribe header.
  async send(email) {
    const { subject, html, text } = buildSummaryEmail(email);
    await sendEmail({ to: email.to, subject, html, text, transactional: true });
  },
  now: () => new Date(),
};
