import { describe, expect, it } from 'vitest';
import robots from '../../app/robots';

describe('robots.txt', () => {
  const { rules } = robots();
  const groups = Array.isArray(rules) ? rules : [rules];

  it('is one group, so no named bot can escape the disallow list', () => {
    expect(groups).toHaveLength(1);
    expect(groups[0].userAgent).toEqual(expect.arrayContaining(['*', 'Googlebot', 'ClaudeBot', 'Perplexity-User', 'Applebot-Extended']));
    expect(groups[0].disallow).toEqual(['/api/', '/admin/']);
  });

  it('lists each bot once, ignoring case', () => {
    const names = (groups[0].userAgent as string[]).map((u) => u.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('leaves /d/ crawlable so a leaked download link is read as noindex, not listed bare', () => {
    expect(groups[0].disallow).not.toContain('/d/');
  });
});
