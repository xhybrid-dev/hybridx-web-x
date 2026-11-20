import { describe, expect, it } from 'vitest';
import { FAMILY_SECTION_IDS, isFamilyHash, slugFromHash } from '@/components/una/family-hash';
import { APPS } from '@/lib/una-family';

/*
 * /una#<slug> is the `url` of every app in the page's JSON-LD, and the old
 * section ids (#ecosystem, #apps, #x-training) may be linked from elsewhere.
 * All of them have to keep landing on the explorer.
 */
describe('/una deep links', () => {
  it('selects every app from its own slug', () => {
    for (const app of APPS) {
      expect(slugFromHash(`#${app.slug}`)).toBe(app.slug);
      expect(isFamilyHash(`#${app.slug}`)).toBe(true);
    }
  });

  it('maps #x-training to the X Training app', () => {
    expect(slugFromHash('#x-training')).toBe('training');
  });

  it('treats the old section ids as the explorer without picking an app', () => {
    for (const id of FAMILY_SECTION_IDS) expect(isFamilyHash(`#${id}`)).toBe(true);
    expect(slugFromHash('#ecosystem')).toBeNull();
    expect(slugFromHash('#apps')).toBeNull();
    expect(isFamilyHash('#family')).toBe(true);
  });

  it('is case-insensitive and ignores anything else, including object prototype names', () => {
    expect(slugFromHash('#STREAK')).toBe('streak');
    expect(slugFromHash('#glances')).toBeNull();
    expect(isFamilyHash('#glances')).toBe(false);
    expect(slugFromHash('#constructor')).toBeNull();
    expect(slugFromHash('#__proto__')).toBeNull();
    expect(slugFromHash('')).toBeNull();
  });
});
