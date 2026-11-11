// src/lib/guides/harvest/volumes.ts
//
// Keyword Planner volumes for the topic queue (docs/content-engine-plan.md,
// step 10). A stage of the weekly harvest, after Search Console: every queued
// topic not checked in the last four weeks gets the UK monthly searches for
// its best phrase, scored like a search we do not rank for yet, so demand the
// site cannot see in Search Console still moves a topic up (queue.ts,
// demandScore). One request for the whole queue.

import { asKeyword, historicalMetrics, topicKeywords, type AdsConfig, type KeywordPlannerDeps, type KeywordVolume } from '@/lib/google/keyword-planner';
import { setTopic, type Topic, type TopicVolume } from '../queue';
import { fit, opportunity } from './analyse';

/** A topic's volume is checked again after this. */
export const VOLUME_STALE_MS = 28 * 86_400_000;

/** Monthly searches scored as a group would be with no page of ours in the results. */
export function volumeScore(avgMonthly: number, phrase: string): number {
  return Math.round(avgMonthly * opportunity(0) * fit(phrase) * 10) / 10;
}

/** The topic's best phrase: the one with the most searches, by Google's text or a close variant. */
export function bestVolume(keywords: string[], results: KeywordVolume[]): KeywordVolume | null {
  const found = keywords
    .map((k) => results.find((r) => asKeyword(r.keyword) === k))
    .filter((r): r is KeywordVolume => !!r)
    .sort((a, b) => b.avgMonthly - a.avgMonthly);
  return found[0] ?? null;
}

export function needsVolume(t: Pick<Topic, 'status' | 'volume'>, now: Date): boolean {
  return t.status === 'queued' && (!t.volume || now.getTime() - Date.parse(t.volume.checkedAt) >= VOLUME_STALE_MS);
}

/** Checks the queue's volumes. Returns how many topics were checked. Throws Keyword Planner's error, explained. */
export async function refreshVolumes(deps: KeywordPlannerDeps, config: AdsConfig, topics: Topic[], now: Date): Promise<number> {
  const due = topics.filter((t) => needsVolume(t, now));
  if (!due.length) return 0;
  const phrases = new Map(due.map((t) => [t.id, topicKeywords(t)]));
  const results = await historicalMetrics(deps, config, [...phrases.values()].flat());
  for (const t of due) {
    const best = bestVolume(phrases.get(t.id) ?? [], results);
    const volume: TopicVolume = best
      ? { keyword: best.keyword, avgMonthly: best.avgMonthly, recent: best.recent, score: volumeScore(best.avgMonthly, best.keyword), checkedAt: now.toISOString() }
      : { keyword: phrases.get(t.id)?.[0] ?? '', avgMonthly: 0, recent: 0, score: 0, checkedAt: now.toISOString() };
    await setTopic(t.id, { volume }, now);
  }
  return due.length;
}
