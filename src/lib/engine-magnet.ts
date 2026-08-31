// src/lib/engine-magnet.ts
//
// The VO2max guide's entry from the magnet registry, resolved once.
// See src/lib/athx-magnet.ts for why this is a module rather than a literal.

import { requireMagnet } from '@/lib/magnets';

export const ENGINE_MAGNET = requireMagnet('build_a_bigger_engine');
