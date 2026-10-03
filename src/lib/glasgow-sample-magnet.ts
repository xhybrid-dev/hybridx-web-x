// src/lib/glasgow-sample-magnet.ts
//
// The Glasgow sample's entry from the magnet registry, resolved once.
// See src/lib/athx-magnet.ts for why this is a module rather than a literal.

import { requireMagnet } from '@/lib/magnets';

export const GLASGOW_SAMPLE_MAGNET = requireMagnet('hyrox_glasgow_2027_sample');
