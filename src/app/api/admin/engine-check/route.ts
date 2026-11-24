import { NextResponse } from 'next/server';
import { WRITER_MODEL } from '@/ai/genkit';
import { getAdminSession } from '@/lib/admin-auth';
import { diagnose, engineSkipped, type EngineSnapshot } from '@/lib/guides/engine/diagnose';
import { liveModels } from '@/lib/guides/engine/models';
import { getEngineStatus, getLockedUntil, listActiveRuns, pipelineStatus } from '@/lib/guides/engine/run';
import { isDraftable, listTopics } from '@/lib/guides/queue';
import { getEngineSettings, listAllGuides } from '@/lib/guides/store';

/**
 * Admin-only drafting-engine diagnostic (src/lib/guides/engine/).
 *
 * Answers "why is nothing being drafted?": whether the hourly job is reaching
 * the engine, whether Gemini answers a one-word test right now, whether the
 * pipeline is full by design, and what the queue and the last run say. The
 * findings come most likely cause first, each with its area (settings,
 * scheduling, gemini, time limit, code, reviewer, waiting, queue). Read-only:
 * the one model call is a ping, and nothing is written.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500);
const geminiKey = () => !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Not authorised' }, { status: 401, headers: NO_STORE });

  const now = new Date();
  const [settings, lastRun, lockedUntil, guides, topics, activeRuns] = await Promise.all([
    getEngineSettings(),
    getEngineStatus(),
    getLockedUntil(),
    listAllGuides(),
    listTopics(),
    listActiveRuns(),
  ]);

  let ping: EngineSnapshot['ping'];
  let pingMs: number | undefined;
  if (geminiKey()) {
    const started = Date.now();
    try {
      await liveModels.ping!();
      ping = { ok: true };
    } catch (e) {
      ping = { ok: false, error: message(e) };
    }
    pingMs = Date.now() - started;
  }

  const snapshot: EngineSnapshot = {
    now,
    mode: process.env.CONTENT_ENGINE_MODE,
    paused: settings.paused,
    geminiKey: geminiKey(),
    writerModel: WRITER_MODEL,
    lastRun,
    pipeline: pipelineStatus(guides, now),
    activeRuns,
    topics,
    draftable: topics.filter((t) => isDraftable(t)).length,
    ping,
  };

  const byStatus: Record<string, number> = {};
  for (const t of topics) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;

  return NextResponse.json(
    {
      findings: diagnose(snapshot),
      writer: { model: WRITER_MODEL, key: snapshot.geminiKey, ping: ping ? { ...ping, ms: pingMs } : 'not tried: no key' },
      reviewer: { key: !!process.env.ANTHROPIC_API_KEY },
      mode: snapshot.mode ?? null,
      paused: settings.paused,
      lastRun: lastRun ? { ...lastRun, minutesAgo: Math.round((now.getTime() - Date.parse(lastRun.at)) / 60_000) } : null,
      lock: { held: lockedUntil > now.getTime(), until: lockedUntil ? new Date(lockedUntil).toISOString() : null },
      pipeline: snapshot.pipeline,
      activeRuns: activeRuns.map(({ slug, stage, kind, attempts, error, updatedAt }) => ({ slug, stage, kind, attempts, error, updatedAt })),
      queue: {
        byStatus,
        draftable: snapshot.draftable,
        skippedByEngine: engineSkipped(topics).map((t) => ({ question: t.question, reason: t.lastError ?? null, at: t.updatedAt })),
      },
    },
    { headers: NO_STORE },
  );
}
