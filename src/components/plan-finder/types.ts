import type { FormatId, GoalId, LevelId, ObstacleId, PlaceId } from '@/lib/plan-finder/content';

/** Where the finder was opened from. The values are the tracking schema's `finder_open.source`. */
export type OpenSource = 'tile' | 'nav' | 'prompt' | 'band' | 'section' | 'hash' | 'entry' | 'link';

/** A request to open the finder, from a tile, a link or a shared result. `nonce` makes each one new. */
export interface OpenRequest {
  nonce: number;
  source: OpenSource;
  step?: number;
  goal?: GoalId;
  place?: PlaceId;
  obst?: ObstacleId[];
  /** Answers restored from a shared `#plan=` link; opens on the result. */
  hash?: { goal: GoalId; level: LevelId; place: PlaceId; obst: ObstacleId[]; format: FormatId; race: string };
}

/** What the page script needs to know about the dialog when the visitor leaves. */
export interface FinderStatus {
  open: boolean;
  step: number;
  resultReady: boolean;
}
