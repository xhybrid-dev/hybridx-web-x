import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  MAGNETS,
  getMagnet,
  magnetAssetUrl,
  magnetConfirmPath,
  magnetDownloadPath,
  requireMagnet,
} from '../magnets';
import { isValidLeadSource } from '../leads';

/**
 * The registry's own invariants.
 *
 * Every one of these was previously a property nothing checked, held together
 * by whoever copied the last funnel getting every constant right. They share a
 * failure mode: none of them throws. A magnet with the wrong slug captures
 * leads under another funnel and rejects every download token it issues; one
 * with an underscored tag has that tag dropped on arrival and disappears from
 * the segment its campaign targets; one pointing at a missing file returns a
 * 500 to somebody who has just handed over an address. All of it looks fine
 * from the outside until a campaign sends to nobody.
 */

const TAG_PATTERN = /^[a-z0-9:-]{1,40}$/;

describe('every magnet', () => {
  it.each(MAGNETS.map((m) => [m.slug, m] as const))('%s is internally consistent', (_slug, magnet) => {
    // The slug becomes a permanent route in the mailing system.
    expect(isValidLeadSource(magnet.slug), 'slug').toBe(true);
    // The tag rule is stricter than the slug rule — no underscores — and the
    // receiving end drops what fails it rather than reporting an error.
    expect(TAG_PATTERN.test(magnet.tag), 'tag').toBe(true);
    expect(magnet.pagePath.startsWith('/'), 'pagePath').toBe(true);
    expect(magnet.name.length, 'name').toBeGreaterThan(0);
    expect(magnet.rateLimitBucket.length, 'rateLimitBucket').toBeGreaterThan(0);
  });

  it('has a unique slug, tag and rate-limit bucket', () => {
    for (const key of ['slug', 'tag', 'rateLimitBucket'] as const) {
      const values = MAGNETS.map((m) => m[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it('never reuses the slug spelling as the tag', () => {
    // The easy mistake, and it fails silently on the far side: slugs allow
    // underscores and tags do not.
    for (const magnet of MAGNETS) {
      expect(magnet.tag, magnet.slug).not.toBe(magnet.slug);
    }
  });
});

describe('delivery and asset must agree', () => {
  it('gives every confirmed-opt-in magnet a confirm path', () => {
    // Without one there is nowhere for the emailed link to land, and
    // magnetConfirmPath throws at send time — after the lead is already saved.
    for (const magnet of MAGNETS.filter((m) => m.delivery === 'confirmed')) {
      expect(magnet.confirmPath, magnet.slug).toBeTruthy();
      expect(magnetConfirmPath(magnet).startsWith('/'), magnet.slug).toBe(true);
    }
  });

  it('gates every confirmed-opt-in magnet behind a token', () => {
    // A public asset with confirmed delivery is a gate with the door open: the
    // email asks for a confirmation the file does not require.
    for (const magnet of MAGNETS.filter((m) => m.delivery === 'confirmed')) {
      expect(magnet.asset.kind, magnet.slug).toBe('gated');
    }
  });

  it('keeps every immediate magnet on a public asset', () => {
    // The reverse: immediate delivery emails the asset URL directly, and a
    // gated one has no URL until a token exists.
    for (const magnet of MAGNETS.filter((m) => m.delivery === 'immediate')) {
      expect(magnet.asset.kind, magnet.slug).toBe('public');
    }
  });
});

describe('the files actually exist', () => {
  it.each(
    MAGNETS.filter((m) => m.asset.kind === 'gated').map((m) => [m.slug, m] as const),
  )('%s has its PDF in private/', (_slug, magnet) => {
    // Outside /public deliberately: a static URL would let anyone skip the
    // email. Which also means nothing else would notice the file was missing
    // until somebody confirmed and got a 500.
    if (magnet.asset.kind !== 'gated') throw new Error('filtered above');
    expect(existsSync(join(process.cwd(), 'private', magnet.asset.file))).toBe(true);
  });

  it.each(
    MAGNETS.filter((m) => m.asset.kind === 'public').map((m) => [m.slug, m] as const),
  )('%s has its PDF in public/', (_slug, magnet) => {
    if (magnet.asset.kind !== 'public') throw new Error('filtered above');
    expect(existsSync(join(process.cwd(), 'public', magnet.asset.url))).toBe(true);
  });
});

describe('email copy is complete', () => {
  it.each(MAGNETS.map((m) => [m.slug, m] as const))('%s says everything it needs to', (_slug, magnet) => {
    const { email } = magnet;
    for (const field of [
      'subject',
      'heading',
      'intro',
      'buttonLabel',
      'insight',
      'footerLinkLabel',
      'reason',
    ] as const) {
      expect(email[field]?.length, field).toBeGreaterThan(0);
    }
    expect(email.accent, 'accent').toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(email.accentText, 'accentText').toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('clears 4.5:1 between every button label and its accent', () => {
    // The reason accentText is declared at all. White on the ATHX orange is
    // 3.56:1, and the button label is bold 16px — not "large text" — so it
    // needs 4.5:1. Every magnet copied that button from the last one.
    for (const magnet of MAGNETS) {
      const ratio = contrast(magnet.email.accentText, magnet.email.accent);
      expect(ratio, `${magnet.slug}: ${magnet.email.accentText} on ${magnet.email.accent}`)
        .toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('lookup', () => {
  it('finds a magnet by slug', () => {
    expect(getMagnet('athx_2027_guide')?.slug).toBe('athx_2027_guide');
  });

  it('returns undefined for an unknown slug rather than guessing', () => {
    expect(getMagnet('not_a_magnet')).toBeUndefined();
  });

  it('throws on an unknown slug where there is nothing sensible to serve', () => {
    // Unlike a funnel slug, which is captured even when unrecognised because
    // the lead is worth more than the classification, an unknown magnet means a
    // page is wired to something that does not exist. That should be loud.
    expect(() => requireMagnet('not_a_magnet')).toThrow(/Unknown magnet/);
  });
});

describe('URL building', () => {
  it('escapes the token, which is base64url with a dot separator', () => {
    const url = magnetDownloadPath('athx_2027_guide', 'abc.def+/=');
    expect(url).toContain(encodeURIComponent('abc.def+/='));
    expect(url.startsWith('/api/magnet/athx_2027_guide/download?token=')).toBe(true);
  });

  it('returns the public URL for an immediate magnet, token or not', () => {
    const magnet = requireMagnet('build_a_bigger_engine');
    expect(magnetAssetUrl(magnet, null)).toBe(
      magnet.asset.kind === 'public' ? magnet.asset.url : '',
    );
  });

  it('refuses to build a gated link without a token', () => {
    // Silently returning a bare path would publish the private file at a URL
    // the gate does not check.
    expect(() => magnetAssetUrl(requireMagnet('athx_2027_guide'), null)).toThrow(/needs a token/);
  });
});

/** WCAG relative luminance contrast, so the assertion above is self-contained. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = channels.map((c) =>
      c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
