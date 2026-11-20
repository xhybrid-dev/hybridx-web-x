import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPS,
  APP_BY_SLUG,
  ATHLETE_WEEKS,
  FAMILY,
  GLANCES,
  INDEPENDENCE_NOTICE,
  LINE_FIELDS,
  RECORDERS,
  STANDALONE_APPS,
  STREAK,
  TRAINING_MEDICAL_NOTICE,
  TRAINING_PLANS,
  UNA_LIGHT_THEME,
  VO2_ESTIMATE_NOTICE,
  WATCH_RENDER,
  WATCH_RENDERS,
  type AppSlug,
  type RecorderSlug,
} from '@/lib/una-family';
import { simulateWeekLoad } from '@/lib/una-maths';

const PUBLIC_DIR = path.resolve(__dirname, '../../..', 'public');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPngDimensions(publicRelativePath: string): { width: number; height: number } {
  expect(
    publicRelativePath.startsWith('/'),
    `asset path must start with '/': ${publicRelativePath}`,
  ).toBe(true);
  expect(
    publicRelativePath.includes('..'),
    `asset path must not traverse directories: ${publicRelativePath}`,
  ).toBe(false);
  const abs = path.join(PUBLIC_DIR, publicRelativePath.slice(1));
  expect(existsSync(abs), `missing asset on disk: public${publicRelativePath}`).toBe(true);
  const buf = readFileSync(abs);
  expect(buf.length, `truncated PNG: ${publicRelativePath}`).toBeGreaterThanOrEqual(24);
  expect(
    buf.subarray(0, 8).equals(PNG_SIGNATURE),
    `invalid PNG signature: ${publicRelativePath}`,
  ).toBe(true);
  expect(
    buf.subarray(12, 16).toString('ascii'),
    `missing IHDR chunk: ${publicRelativePath}`,
  ).toBe('IHDR');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace(/^#/, '');
  expect(clean, `invalid hex colour: ${hex}`).toMatch(/^[0-9a-fA-F]{6}$/);
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const s = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const la = relativeLuminance(fgHex);
  const lb = relativeLuminance(bgHex);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
  return out;
}

describe('X family inventory & domain structure', () => {
  it('defines all 7 connected apps with matching FAMILY alias, RECORDERS and STREAK', () => {
    const expectedSlugs: AppSlug[] = ['race', 'ride', 'run', 'streak', 'trail', 'training', 'workout'];

    expect(APPS).toHaveLength(7);
    expect(FAMILY).toEqual(APPS);
    expect(APPS.map((a) => a.slug).sort()).toEqual(expectedSlugs);

    expect(RECORDERS).toHaveLength(6);
    expect(RECORDERS.map((a) => a.slug)).not.toContain('streak');
    expect(RECORDERS).toEqual(APPS.filter((a) => a.slug !== 'streak'));

    expect(STREAK.slug).toBe('streak');
    expect(APPS).toContain(STREAK);

    for (const app of APPS) {
      expect(APP_BY_SLUG[app.slug]).toBe(app);
    }
  });

  it('gives every app complete metadata, >= 6 features, >= 6 screens and backwards-compatible mirrors', () => {
    for (const app of APPS) {
      expect(app.name.trim().length, `${app.slug} name`).toBeGreaterThan(0);
      expect(app.watchName.trim().length, `${app.slug} watchName`).toBeGreaterThan(0);
      expect(app.tab.trim().length, `${app.slug} tab`).toBeGreaterThan(0);
      expect(app.role.trim().length, `${app.slug} role`).toBeGreaterThan(0);
      expect(app.tagline.trim().length, `${app.slug} tagline`).toBeGreaterThan(0);
      expect(app.summary.trim().length, `${app.slug} summary`).toBeGreaterThan(0);
      expect(app.athleteBenefit.trim().length, `${app.slug} athleteBenefit`).toBeGreaterThan(0);

      expect(app.ground).toBe(app.palette.ground);
      expect(app.ink).toBe(app.palette.inkOnDark);
      expect(app.accent).toBe(app.palette.accent);
      expect(app.watch).toBe(app.palette.watch);
      expect(app.page).toBe(app.detailHref);

      expect(app.features.length, `${app.slug} features`).toBeGreaterThanOrEqual(6);
      for (const f of app.features) {
        expect(f.title.trim().length).toBeGreaterThan(0);
        expect(f.detail.trim().length).toBeGreaterThan(0);
        expect(f.body).toBe(f.detail);
      }

      expect(app.screens.length, `${app.slug} screens`).toBeGreaterThanOrEqual(6);
      const uniqueFiles = new Set(app.screens.map((sc) => sc.file));
      expect(uniqueFiles.size, `${app.slug} unique screen files`).toBe(app.screens.length);
      for (const sc of app.screens) {
        expect(sc.src).toBe(sc.file);
        expect(sc.label.trim().length).toBeGreaterThan(0);
        expect(sc.caption.trim().length).toBeGreaterThan(0);
      }
    }

    expect(APP_BY_SLUG.training.screens).toHaveLength(8);
    expect(APP_BY_SLUG.workout.screens).toHaveLength(7);
    expect(APP_BY_SLUG.workout.screens[0].file).toBe('/una/screens/workout/open-sets.png');
  });

  it('defines all 3 built-in X Training plans (10K, Half Marathon, 8-Week VO2max Block)', () => {
    expect(TRAINING_PLANS).toHaveLength(3);
    expect(TRAINING_PLANS.map((p) => p.id)).toEqual(['10k', 'half', 'vo2max']);
    for (const plan of TRAINING_PLANS) {
      expect(plan.name.trim().length).toBeGreaterThan(0);
      expect(plan.weeks.trim().length).toBeGreaterThan(0);
      expect(plan.headline.trim().length).toBeGreaterThan(0);
      expect(plan.summary.trim().length).toBeGreaterThan(0);
      expect(plan.longRunRange.trim().length).toBeGreaterThan(0);
      expect(plan.streakAndRunNote.trim().length).toBeGreaterThan(0);
      expect(plan.keyWorkouts.length).toBeGreaterThanOrEqual(3);
      expect(plan.phases.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('defines 3 connected Glances, 3 valid 7-day Athlete Weeks, >= 2 standalone apps, and 8 LINE_FIELDS', () => {
    expect(GLANCES).toHaveLength(3);
    expect(new Set(GLANCES.map((g) => g.slug)).size).toBe(3);
    expect(GLANCES.map((g) => g.slug)).toEqual(['streak-glance', 'run-glance', 'training-glance']);
    for (const g of GLANCES) {
      expect(g.headline.trim().length).toBeGreaterThan(0);
      expect(g.detail.trim().length).toBeGreaterThan(0);
      expect(g.previews.length).toBeGreaterThanOrEqual(3);
    }

    expect(ATHLETE_WEEKS).toHaveLength(3);
    expect(ATHLETE_WEEKS.map((w) => w.id)).toEqual(['hyrox-prep', 'half-marathon', '10k-engine']);
    for (const preset of ATHLETE_WEEKS) {
      expect(preset.days).toHaveLength(7);
      expect(Number.isInteger(preset.weeklyTarget)).toBe(true);
      expect(preset.weeklyTarget).toBeGreaterThanOrEqual(1);
      expect(preset.weeklyTarget).toBeLessThanOrEqual(7);
      expect(preset.startingFitness).toBeGreaterThan(0);
      expect(preset.startingFatigue).toBeGreaterThan(0);

      for (const d of preset.days) {
        if (d.app === null) {
          expect(d.load, `${preset.id} ${d.day} rest load`).toBe(0);
        } else {
          expect(d.load, `${preset.id} ${d.day} active load`).toBeGreaterThan(0);
        }
      }

      const sim = simulateWeekLoad(
        preset.days.map((d) => d.load),
        preset.startingFitness,
        preset.startingFatigue,
      );
      expect(sim).toHaveLength(7);
      for (const day of sim) {
        expect(Number.isFinite(day.fitness)).toBe(true);
        expect(Number.isFinite(day.fatigue)).toBe(true);
        expect(Number.isFinite(day.form)).toBe(true);
        expect(['Fresh', 'Steady', 'Building', 'Overreaching']).toContain(day.word);
      }
    }

    expect(STANDALONE_APPS.length).toBeGreaterThanOrEqual(2);
    expect(STANDALONE_APPS.map((s) => s.slug)).toEqual(expect.arrayContaining(['weigh-in', 'trail-quest']));
    for (const standalone of STANDALONE_APPS) {
      expect(standalone.href).toMatch(/^(?:\/|https:\/\/)/);
    }

    expect(LINE_FIELDS).toHaveLength(8);
  });
});

describe('On-disk PNG assets & IHDR integrity', () => {
  it('verifies all 7 app icons and 3 glance icons are valid 256x256 PNGs', () => {
    for (const app of APPS) {
      expect(readPngDimensions(app.icon), app.icon).toEqual({ width: 256, height: 256 });
    }
    for (const glance of GLANCES) {
      expect(readPngDimensions(glance.icon), glance.icon).toEqual({ width: 256, height: 256 });
    }
  });

  it('verifies standalone app icons exist with valid positive PNG dimensions', () => {
    for (const standalone of STANDALONE_APPS) {
      if (standalone.icon) {
        const dims = readPngDimensions(standalone.icon);
        expect(dims.width, standalone.icon).toBeGreaterThan(0);
        expect(dims.height, standalone.icon).toBeGreaterThan(0);
      }
    }
  });

  it('verifies every watch screen across all 7 apps is a valid 480x480 PNG', () => {
    let totalScreens = 0;
    for (const app of APPS) {
      for (const sc of app.screens) {
        expect(readPngDimensions(sc.file), sc.file).toEqual({ width: 480, height: 480 });
        totalScreens += 1;
      }
    }
    expect(totalScreens).toBe(45);
  });

  it('verifies all 9 glance preview strips are valid PNGs within watch strip bounds', () => {
    let totalPreviews = 0;
    for (const glance of GLANCES) {
      for (const preview of glance.previews) {
        const { width, height } = readPngDimensions(preview.file);
        expect(width, preview.file).toBeGreaterThanOrEqual(165);
        expect(width, preview.file).toBeLessThanOrEqual(480);
        expect(height, preview.file).toBeGreaterThanOrEqual(100);
        expect(height, preview.file).toBeLessThanOrEqual(480);
        totalPreviews += 1;
      }
    }
    expect(totalPreviews).toBe(9);
  });

  it('verifies all three UNA Watch hardware renders are valid 860x1185 PNGs', () => {
    expect(WATCH_RENDERS).toEqual(WATCH_RENDER);
    for (const [finish, file] of Object.entries(WATCH_RENDERS)) {
      expect(readPngDimensions(file), `${finish}: ${file}`).toEqual({ width: 860, height: 1185 });
    }
  });
});

describe('WCAG 2.1 colour contrast & HybridX Yellow guardrails', () => {
  it('guarantees WCAG 2.1 AA (>= 4.5:1) across every app palette pair and bans yellow ink on light', () => {
    for (const app of APPS) {
      const p = app.palette;
      expect(contrastRatio(p.inkOnLight, '#FFFFFF'), `${app.slug} inkOnLight on white`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.inkOnLight, p.lightTint), `${app.slug} inkOnLight on lightTint`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.inkOnDark, p.ground), `${app.slug} inkOnDark on ground`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.inkOnDark, p.deep), `${app.slug} inkOnDark on deep`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.onAccent, p.accent), `${app.slug} onAccent on accent`).toBeGreaterThanOrEqual(4.5);
      expect(p.inkOnLight.toUpperCase(), `${app.slug} must never use HybridX Yellow as light-surface ink`).not.toBe(
        '#FADB5C',
      );
      expect(Object.keys(WATCH_RENDERS)).toContain(p.watch);
    }
  });

  it('verifies UNA_LIGHT_THEME text tokens clear WCAG 2.1 AA across all four daylight surfaces', () => {
    const surfaces = [
      UNA_LIGHT_THEME.canvas,
      UNA_LIGHT_THEME.surface,
      UNA_LIGHT_THEME.surfaceTealSoft,
      UNA_LIGHT_THEME.surfaceTealTint,
    ];
    const textTokens = [
      UNA_LIGHT_THEME.inkPrimary,
      UNA_LIGHT_THEME.inkSecondary,
      UNA_LIGHT_THEME.unaTealText,
      UNA_LIGHT_THEME.unaTealDeep,
      UNA_LIGHT_THEME.unaOrangeText,
    ];

    for (const bg of surfaces) {
      for (const fg of textTokens) {
        expect(contrastRatio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }

    // Solid CTA and badge pairs
    expect(contrastRatio(UNA_LIGHT_THEME.obsidian, UNA_LIGHT_THEME.hybridxYellow)).toBeGreaterThanOrEqual(14);
    expect(contrastRatio(UNA_LIGHT_THEME.obsidian, UNA_LIGHT_THEME.unaTeal)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(UNA_LIGHT_THEME.obsidian, UNA_LIGHT_THEME.unaOrange)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Ecosystem graph consistency (6 -> 1 -> 6 & 3-way VO2max mesh)', () => {
  it('assigns unique act_<slug>.json slots to all 6 recorders and streak_now.json to X Streak', () => {
    const files = RECORDERS.map((r) => r.ecosystem.writesFile);
    expect(new Set(files).size).toBe(6);
    for (const f of files) {
      expect(f).toMatch(/^act_[a-z]+\.json$/);
    }
    expect([...files].sort()).toEqual([
      'act_race.json',
      'act_ride.json',
      'act_run.json',
      'act_trail.json',
      'act_training.json',
      'act_workout.json',
    ]);

    for (const r of RECORDERS) {
      expect(r.ecosystem.sendsToStreak.length, `${r.slug} sendsToStreak`).toBeGreaterThanOrEqual(1);
      expect(r.ecosystem.receivesBack.length, `${r.slug} receivesBack`).toBeGreaterThanOrEqual(1);
    }

    expect(STREAK.ecosystem.writesFile).toBe('streak_now.json');
    expect(STREAK.ecosystem.writesFile).not.toMatch(/^act_/);
    expect(STREAK.ecosystem.sendsToStreak.length).toBeGreaterThanOrEqual(1);
    expect(STREAK.ecosystem.receivesBack.length).toBeGreaterThanOrEqual(1);
  });

  it('validates all peer links and asserts the 3-way VO2max mesh (Trail + Training <-> Run)', () => {
    const validSlugs = new Set<AppSlug>(APPS.map((a) => a.slug));
    for (const app of APPS) {
      for (const link of app.ecosystem.peerLinks ?? []) {
        expect(validSlugs.has(link.target), `${app.slug} -> ${link.target}`).toBe(true);
        expect(link.target, `${app.slug} must not self-link`).not.toBe(app.slug);
        expect(link.label.trim().length).toBeGreaterThan(0);
        expect(link.detail.trim().length).toBeGreaterThan(0);
      }
    }

    expect(APP_BY_SLUG.trail.ecosystem.peerLinks?.some((l) => l.target === 'run')).toBe(true);
    expect(APP_BY_SLUG.training.ecosystem.peerLinks?.some((l) => l.target === 'run')).toBe(true);
    expect(APP_BY_SLUG.run.ecosystem.peerLinks?.some((l) => l.target === 'training')).toBe(true);
  });

  it('restricts ATHLETE_WEEKS apps to valid recorders and VO2max contributions to Run, Trail and Training only', () => {
    const validRecorders = new Set<RecorderSlug>(RECORDERS.map((r) => r.slug as RecorderSlug));
    const vo2Apps = new Set<RecorderSlug>(['run', 'trail', 'training']);

    for (const preset of ATHLETE_WEEKS) {
      for (const day of preset.days) {
        if (day.app !== null) {
          expect(validRecorders.has(day.app), `${preset.id} ${day.day} invalid app ${day.app}`).toBe(true);
        }
        if (day.vo2Contributes) {
          expect(day.app, `${preset.id} ${day.day} rest day cannot contribute VO2max`).not.toBeNull();
          expect(
            vo2Apps.has(day.app as RecorderSlug),
            `${preset.id} ${day.day} app ${day.app} cannot contribute VO2max`,
          ).toBe(true);
        }
      }
    }
  });
});

const MACHINE_KEYS = new Set([
  'id',
  'slug',
  'file',
  'src',
  'icon',
  'href',
  'writesFile',
  'page',
  'detailHref',
  'key',
]);

function collectCopyStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectCopyStrings(item, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (!MACHINE_KEYS.has(k)) collectCopyStrings(v, out);
    }
  }
  return out;
}

describe('Trademark, honesty & version-number guardrails', () => {
  const productData = [
    APPS,
    TRAINING_PLANS,
    GLANCES,
    ATHLETE_WEEKS,
    STANDALONE_APPS,
    LINE_FIELDS,
  ];
  const productStrings = collectStrings(productData);
  const productCopyStrings = collectCopyStrings(productData);
  const allStrings = [
    ...productStrings,
    TRAINING_MEDICAL_NOTICE,
    VO2_ESTIMATE_NOTICE,
    INDEPENDENCE_NOTICE,
  ];

  it('never uses trademarked VDOT, co-branded HybridX x UNA, endorsement claims, or app version numbers', () => {
    expect(allStrings.filter((s) => /\bVDOT\b/i.test(s))).toEqual([]);
    expect(allStrings.filter((s) => /HybridX\s*[×x]\s*UNA/i.test(s))).toEqual([]);
    expect(allStrings.filter((s) => /\bv\d+\.\d+(?:\.\d+)?\b/i.test(s))).toEqual([]);
    expect(
      productStrings.filter((s) =>
        /\b(?:official|endorsed|sponsored|partnered)\s+(?:by|with)\s+UNA\b/i.test(s),
      ),
    ).toEqual([]);
  });

  it('always qualifies HYROX as HYROX-format or HYROX-style across user-facing product copy', () => {
    expect(productCopyStrings.filter((s) => /\bHYROX\b(?!-(?:format|style))/i.test(s))).toEqual([]);
  });

  it('describes VO2max honestly as an estimate and exports non-empty medical and independence notices', () => {
    const runStrings = collectStrings([APP_BY_SLUG.run.summary, APP_BY_SLUG.run.features]);
    expect(runStrings.some((s) => /\bestimat/i.test(s))).toBe(true);

    expect(TRAINING_MEDICAL_NOTICE).toMatch(/not medical/i);
    expect(VO2_ESTIMATE_NOTICE).toMatch(/estimate/i);
    expect(INDEPENDENCE_NOTICE).toMatch(/for UNA Watch/i);
    expect(INDEPENDENCE_NOTICE).toMatch(/not made, endorsed or sponsored/i);
  });
});
