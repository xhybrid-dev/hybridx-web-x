/**
 * What the About page says about the person behind HybridX, beyond his name and role
 * (src/lib/facts/product.ts, ARTICLE_REVIEWER). Empty on purpose.
 *
 * A trainer's background is the strongest trust signal a coaching site has, and also the
 * one thing that must not be written by anyone but him: not drafted by a model, not
 * guessed, not tidied into something he did not say. Fill these in with what is true and
 * the About page and the structured data pick them up; leave them null and neither
 * invents anything.
 */
export const REVIEWER_PROFILE: {
  /** A few plain sentences, in the third person: what he does, how long, who he coaches. */
  bio: string | null;
  /** Qualifications or memberships he can show, as written on the certificate. */
  credentials: readonly string[];
  /** Pages that are his and that say the same thing (a coaching profile, a race results page). */
  sameAs: readonly string[];
} = {
  bio: null,
  credentials: [],
  sameAs: [],
};
