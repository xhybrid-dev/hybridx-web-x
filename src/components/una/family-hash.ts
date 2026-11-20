import { APP_BY_SLUG, type AppSlug } from '@/lib/una-family';

/**
 * /una#<slug> deep links (the JSON-LD `url` of every app, plus older links to
 * sections that no longer exist) must keep working now the apps share one
 * explorer. A slug selects its app; an alias selects one too; the section
 * names only mean "scroll to the explorer".
 */
const APP_ALIASES: Readonly<Record<string, AppSlug>> = {
  'x-training': 'training',
};

/** Old section ids, kept as anchors so existing links still land in the right place. */
export const FAMILY_SECTION_IDS = ['ecosystem', 'apps', 'x-training'] as const;

export function slugFromHash(hash: string): AppSlug | null {
  const clean = hash.replace(/^#/, '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(APP_BY_SLUG, clean)) return clean as AppSlug;
  if (Object.prototype.hasOwnProperty.call(APP_ALIASES, clean)) return APP_ALIASES[clean];
  return null;
}

/** True when the hash points at the explorer, whether or not it names an app. */
export function isFamilyHash(hash: string): boolean {
  const clean = hash.replace(/^#/, '').trim().toLowerCase();
  return clean === 'family' || (FAMILY_SECTION_IDS as readonly string[]).includes(clean) || slugFromHash(hash) !== null;
}
