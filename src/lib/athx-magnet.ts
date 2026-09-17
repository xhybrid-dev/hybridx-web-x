// src/lib/athx-magnet.ts
//
// The ATHX funnel's entry from the magnet registry, resolved once.
//
// A one-line module, and it earns its place: `requireMagnet` throws on an
// unknown slug, so importing this is what turns a mistyped slug from a silent
// runtime failure — leads filed under the wrong funnel, every download token
// rejected — into a build that fails at the page which got it wrong.

import { requireMagnet } from '@/lib/magnets';

export const ATHX_MAGNET = requireMagnet('athx_2027_guide');
