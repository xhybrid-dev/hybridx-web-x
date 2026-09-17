// src/lib/race-card-magnet.ts
//
// The race-card funnel's entry from the magnet registry, resolved once.
// See src/lib/athx-magnet.ts for why this is a module rather than a literal.

import { requireMagnet } from '@/lib/magnets';

export const RACE_CARD_MAGNET = requireMagnet('hyrox_rules_card');
