import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Whether an Authorization header is exactly "Bearer <secret>", compared in
 * constant time. A plain !== returns sooner the earlier the strings differ, which
 * leaks how much of a guess was right; hashing first makes the lengths equal so
 * timingSafeEqual can compare them.
 */
export function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) return false;
  const a = createHash('sha256').update(header).digest();
  const b = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}
