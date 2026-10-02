// src/lib/shop/request.ts
//
// Reading what the shop needs from an incoming request. Server only.

/** Same resolution as the rest of the site's routes: first hop of X-Forwarded-For. */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}

/**
 * Headers that carry the visitor's country, by host.
 *
 * Firebase App Hosting does not add one as of this writing, so on the live
 * site this is usually null and the billing and card countries are the
 * location evidence (two non-contradictory pieces are what the EU OSS asks
 * for). The list stays so that a CDN or proxy in front of the site later, or
 * a move to Vercel, starts recording it with no code change. Set
 * SHOP_IP_COUNTRY_HEADER to read a header not listed here.
 */
const COUNTRY_HEADERS = ['x-vercel-ip-country', 'cf-ipcountry', 'x-appengine-country', 'x-country-code'];

export function ipCountry(headers: Headers): string | null {
  const names = [process.env.SHOP_IP_COUNTRY_HEADER, ...COUNTRY_HEADERS].filter(Boolean) as string[];
  for (const name of names) {
    const value = headers.get(name)?.trim().toUpperCase();
    // Two letters; Cloudflare and App Engine use XX / ZZ for "unknown".
    if (value && /^[A-Z]{2}$/.test(value) && value !== 'XX' && value !== 'ZZ') return value;
  }
  return null;
}

/** A UTM value worth keeping: short, printable, no markup. */
export function cleanUtm(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().slice(0, 100);
  return /^[\w .:+\-/@]+$/.test(v) ? v : undefined;
}
