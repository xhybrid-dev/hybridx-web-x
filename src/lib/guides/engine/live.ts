// src/lib/guides/engine/live.ts
//
// The engine wired to the real world: Gemini and Claude for the model calls,
// and the site's mail transport for review emails. Imported only by the hourly
// maintenance job, so tests and pages never load a model SDK through it.

import { sendEmail } from '@/lib/email/service';
import { buildReviewEmail } from '../email';
import { liveModels } from './models';
import type { EngineDeps } from './run';

export const liveDeps: EngineDeps = {
  models: liveModels,
  // An admin notification, not list mail: no unsubscribe header.
  async send(email) {
    const { subject, html, text } = buildReviewEmail(email);
    await sendEmail({ to: email.to, subject, html, text, transactional: true });
  },
  now: () => new Date(),
};
