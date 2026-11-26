import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limit';

// The two public calculators that call Gemini (the treadmill workout builder and
// the elevation-adjusted splits) are server actions anyone can post to, and
// each call spends the site's Gemini credit. They once had no limit on input
// size or on how often one person could call them, so one script could run the
// credit down. The credit has run out before (24 November 2026, for the
// content engine), and that took drafting down with it.

/** Calls per person per hour, per action. A person building a workout makes a handful. */
export const AI_CALLS_PER_HOUR = 12;
const HOUR_MS = 60 * 60 * 1000;

export class AiLimitError extends Error {
  constructor() {
    super('You have used a lot of AI requests this hour. Please wait a little while and try again.');
    this.name = 'AiLimitError';
  }
}

/** The caller's address, as App Hosting forwards it. Empty when there is none. */
async function callerIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '';
}

/**
 * Call at the top of an AI server action. Throws AiLimitError past the limit.
 * Like the capture forms' limiter it fails open if Firestore is unreachable, and
 * does not limit a caller whose address it cannot see (limiting "no address"
 * would throttle everyone together).
 */
export async function guardAiCall(action: string, perHour = AI_CALLS_PER_HOUR): Promise<void> {
  const ip = await callerIp();
  if (!ip) return;
  const { allowed } = await checkRateLimit(`ai:${action}:${ip}`, HOUR_MS, perHour);
  if (!allowed) throw new AiLimitError();
}
