import { describe, expect, it } from 'vitest';
import { APP_SIGNUP_URL, isAppHref, pageSrc, srcForPage, withSrc, withTracking } from '../app-links';

describe('links into the app', () => {
  it('names an article by its slug and every other page by its path', () => {
    expect(pageSrc('/guides/sled-push-technique')).toBe('guide-sled-push-technique');
    expect(pageSrc('/')).toBe('page-home');
    expect(pageSrc('/app')).toBe('page-app');
    expect(pageSrc('/calculators/week-planner')).toBe('page-calculators-week-planner');
    expect(pageSrc('/guides')).toBe('page-guides');
    expect(pageSrc('/HYROX_Glasgow/')).toBe('page-hyrox-glasgow');
    expect(pageSrc(`/${'a'.repeat(120)}`)).toHaveLength(90);
  });

  it('keeps the article that brought the reader, and only a src the app would accept', () => {
    expect(srcForPage('?src=guide-wall-balls', '/app')).toBe('guide-wall-balls');
    expect(srcForPage('', '/app')).toBe('page-app');
    expect(srcForPage('?src=Not%20ours', '/app')).toBe('page-app');
  });

  it('adds a src to app links only, and never replaces one', () => {
    expect(isAppHref('https://app.hybridx.club')).toBe(true);
    expect(isAppHref(APP_SIGNUP_URL)).toBe(true);
    expect(isAppHref('https://app.hybridx.club.evil.example/')).toBe(false);
    expect(isAppHref('/app')).toBe(false);
    expect(withSrc(APP_SIGNUP_URL, 'page-app')).toBe('https://app.hybridx.club/signup?src=page-app');
    expect(withSrc('https://app.hybridx.club/signup?src=guide-a', 'page-app')).toBe('https://app.hybridx.club/signup?src=guide-a');
  });
});

describe('withTracking', () => {
  it('keeps the src and UTM tags when a tool rewrites its query', () => {
    expect(withTracking('days=4&goal=athx', '?days=3&goal=athx&src=guide-a&utm_source=ig&other=x')).toBe(
      'days=4&goal=athx&src=guide-a&utm_source=ig',
    );
    expect(withTracking('days=4', '')).toBe('days=4');
  });
});
