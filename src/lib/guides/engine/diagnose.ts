// src/lib/guides/engine/diagnose.ts
//
// Why the drafting engine is or is not drafting, in plain words, from a
// snapshot of its state: the answer behind /api/admin/engine-check. Pure, so
// each verdict is pinned by a test, and the route only gathers the snapshot.
//
// Findings come most likely cause first. Each names its area, so "is it
// Gemini, the schedule or the code?" has a one-word answer:
//
//   settings     switched off, or paused in /admin/guides/settings
//   scheduling   the hourly job is not reaching the engine
//   gemini       the writer is not answering, or its drafts keep failing
//   time limit   runs end before they can start a model call
//   code         a run threw
//   reviewer     the second review (Claude) keeps failing; slows, never stops
//   waiting      nothing wrong: the pipeline is full until Jon reviews
//   queue        nothing left that can be drafted
//   ok           nothing found: the next hourly run should draft

import type { Topic } from '../queue';
import { OUT_OF_TIME, WRITER_DOWN, type EngineStatus, type Run } from './run';

export type Area = 'settings' | 'scheduling' | 'gemini' | 'time limit' | 'code' | 'reviewer' | 'waiting' | 'queue' | 'ok';

export interface Finding {
  area: Area;
  says: string;
}

export interface EngineSnapshot {
  now: Date;
  /** CONTENT_ENGINE_MODE as deployed. */
  mode: string | undefined;
  paused: boolean;
  geminiKey: boolean;
  writerModel: string;
  lastRun: EngineStatus | null;
  pipeline: { room: boolean; waiting: number; ahead: number };
  activeRuns: Pick<Run, 'slug' | 'stage' | 'attempts' | 'error'>[];
  topics: Pick<Topic, 'status' | 'question' | 'failures' | 'lastError' | 'updatedAt'>[];
  /** Topics the engine could draft now (queued, and any tool they need exists). */
  draftable: number;
  /** The one-word test of the writer, if it was made. */
  ping?: { ok: true } | { ok: false; error: string };
}

/** The hourly job runs on the hour; past this, it has missed at least one. */
const STALE_AFTER_MS = 90 * 60_000;

const hoursAgo = (ms: number) => {
  const h = ms / 3_600_000;
  return h < 48 ? `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}` : `${Math.round(h / 24)} days`;
};

/** Topics the engine itself skipped, after two drafts that came to nothing. */
export const engineSkipped = (topics: EngineSnapshot['topics']) =>
  topics.filter((t) => t.status === 'skipped' && (t.failures ?? 0) >= 2).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export function diagnose(s: EngineSnapshot): Finding[] {
  const out: Finding[] = [];
  const say = (area: Area, says: string) => out.push({ area, says });

  if (s.mode !== 'on') {
    say('settings', `CONTENT_ENGINE_MODE is ${s.mode ? `"${s.mode}"` : 'not set'}, not "on", so the engine drafts nothing. It is set in apphosting.yaml.`);
    return out;
  }
  if (s.paused) say('settings', 'Paused in /admin/guides/settings: no drafts and no review emails until it is resumed.');

  if (!s.geminiKey) say('gemini', 'GEMINI_API_KEY is not set in this deploy, so every draft fails. It is bound in apphosting.yaml.');
  else if (s.ping && !s.ping.ok) {
    say('gemini', `Gemini did not answer a one-word test (${s.writerModel}): ${s.ping.error}. No draft can succeed until it does: check the key, its quota and billing in Google AI Studio, and that the model still exists.`);
  }

  const last = s.lastRun;
  if (!last) {
    say('scheduling', 'No engine run has been recorded. The hourly job has not reached the engine since this version was deployed: check the Cloud Scheduler job "marketing-maintenance" and its run history.');
  } else {
    const age = s.now.getTime() - Date.parse(last.at);
    if (age > STALE_AFTER_MS) {
      say(
        'scheduling',
        `The last engine run was ${hoursAgo(age)} ago; it should run every hour. The hourly job is not calling, or is being refused: 401s in the Cloud Scheduler job's history mean its Authorization header and CRON_SECRET differ.`,
      );
    }
    if (last.error) say('code', `The last run failed with an error: ${last.error}`);
    if (last.skipped && last.skipped !== 'paused in settings') say('code', `The last run did nothing: ${last.skipped}.`);
    const down = last.log.find((l) => l.startsWith(WRITER_DOWN));
    if (down && !(s.ping && !s.ping.ok)) say('gemini', `In the last run, ${down}. It answers now, so the next run should draft.`);
    const failed = last.log.filter((l) => l.startsWith('topic "'));
    if (failed.length) say('gemini', `The last run's draft failed: ${failed.join('; ')}`);
    if (last.log.some((l) => l.startsWith(OUT_OF_TIME))) {
      say(
        'time limit',
        `The last run ran out of time before a model call (${last.log.find((l) => l.startsWith(OUT_OF_TIME))}). If that shows hour after hour with no drafts, the runs are too slow to reach the writer.`,
      );
    }
  }

  for (const r of s.activeRuns) {
    if (r.stage === 'review' && r.error) say('reviewer', `"${r.slug}" is waiting on its second review, which has failed ${r.attempts} time(s): ${r.error}. It goes to you without one after 3 tries.`);
  }

  const skipped = engineSkipped(s.topics);
  if (skipped.length) {
    const cutOff = skipped.filter((t) => /cut off/.test(t.lastError ?? '')).length;
    say(
      cutOff > skipped.length / 2 ? 'time limit' : 'gemini',
      `${skipped.length} topic(s) were skipped by the engine after two failed drafts. Latest reason: "${skipped[0].lastError ?? 'none recorded'}" ("${skipped[0].question}"). ` +
        `If the reasons are an outage or a time limit rather than the topics, put them back in the queue.`,
    );
  }

  if (!s.pipeline.room) {
    say(
      'waiting',
      `Holding back by design: ${s.pipeline.waiting} waiting for your review and ${s.pipeline.ahead} scheduled and not yet live. It drafts only while fewer than 2 wait and fewer than 3 are waiting or scheduled. Approve, schedule or turn one down, and the next hourly run drafts another.`,
    );
  } else if (s.draftable === 0) {
    say('queue', `Nothing in the topic queue can be drafted (${s.topics.length} topic(s), none queued and ready). Add a question or put a skipped topic back in /admin/guides/topics.`);
  }

  if (!out.length) {
    say('ok', `Nothing wrong found. The pipeline has room and ${s.draftable} topic(s) are ready, so the next hourly run should start a draft.`);
  }
  return out;
}
