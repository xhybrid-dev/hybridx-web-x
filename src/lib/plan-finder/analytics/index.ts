// The admin analytics, in one import: daily rollups, merging, the derived
// report and the rule-based insights (handover/entry-funnel/docs/05).
export { rollupDay, mergeDays, emptyDoc } from './rollup';
export type { RollupDoc, FlatEvent } from './rollup';
export { report, shares, MIN_ARM_SESSIONS } from './report';
export type { Report, Share } from './report';
export { insights, DEFAULT_THRESHOLDS } from './insights';
export type { Insight, Severity } from './insights';
export { STEP_NAMES, BUCKETS } from './model';
