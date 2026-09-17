import { promises as dns } from 'node:dns';

/**
 * Deliverability checks that run before we accept a lead.
 *
 * Format validation (zod's .email()) only proves an address is well formed —
 * "nobody@notreal.com" passes it. These checks go one step further and ask
 * whether the domain can actually receive mail, which is what separates a
 * junk signup from a real one.
 *
 * Deliberately conservative: every check either fails the address for a
 * concrete reason, or gets out of the way. A DNS hiccup must never cost us a
 * real subscriber, so lookup failures fail OPEN.
 */

export type AddressCheck = { ok: true } | { ok: false; message: string };

/**
 * Throwaway inbox providers. Not exhaustive — new ones appear constantly —
 * but it covers the services people actually reach for when they want a lead
 * magnet without giving up an address.
 */
const DISPOSABLE_DOMAINS = new Set([
  '0-mail.com',
  '10minutemail.com',
  '20minutemail.com',
  '33mail.com',
  'anonbox.net',
  'byom.de',
  'discard.email',
  'dispostable.com',
  'e4ward.com',
  'emailondeck.com',
  'fakeinbox.com',
  'fakemail.net',
  'getairmail.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'harakirimail.com',
  'inboxbear.com',
  'jetable.org',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mailsac.com',
  'mintemail.com',
  'mohmal.com',
  'moakt.com',
  'mytrashmail.com',
  'nada.email',
  'sharklasers.com',
  'spam4.me',
  'spamgourmet.com',
  'temp-mail.io',
  'temp-mail.org',
  'tempinbox.com',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'tempr.email',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.de',
  'trbvm.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

/**
 * Near-misses on the big consumer providers. These are almost always honest
 * typos rather than fakes, so we correct them by name instead of rejecting
 * with a generic message — an address typo'd here is a subscriber lost
 * silently, since the welcome email simply never arrives.
 */
const TYPO_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'homail.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'iclould.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'iclod.com': 'icloud.com',
  'live.co': 'live.com',
  'btinternet.co': 'btinternet.com',
};

/** Domains we know accept mail — skip the lookup for the common cases. */
const KNOWN_GOOD_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'live.co.uk',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'btinternet.com',
  'sky.com',
  'virginmedia.com',
]);

// MX results are cached so a burst of signups from one provider costs one
// lookup rather than one per submission.
const MX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MX_TIMEOUT_MS = 2500;
const mxCache = new Map<string, { hasMx: boolean; checkedAt: number }>();

async function domainAcceptsMail(domain: string): Promise<boolean> {
  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.checkedAt < MX_TTL_MS) {
    return cached.hasMx;
  }

  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('mx-timeout')), MX_TIMEOUT_MS)
      ),
    ]);
    const hasMx = Array.isArray(records) && records.length > 0;
    mxCache.set(domain, { hasMx, checkedAt: Date.now() });
    return hasMx;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // ENOTFOUND / NXDOMAIN mean the domain genuinely does not exist. Anything
    // else (timeout, SERVFAIL, no resolver available) is our problem, not the
    // visitor's, so we let it through rather than blocking a real signup.
    if (code === 'ENOTFOUND' || code === 'NXDOMAIN') {
      mxCache.set(domain, { hasMx: false, checkedAt: Date.now() });
      return false;
    }
    console.warn(`[email-validate] MX lookup inconclusive for ${domain}:`, code || error);
    return true;
  }
}

/**
 * Checks whether an address is plausibly real and reachable. Assumes the
 * address has already passed format validation.
 */
export async function checkEmailDeliverable(email: string): Promise<AddressCheck> {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  const suggestion = TYPO_DOMAINS[domain];
  if (suggestion) {
    return {
      ok: false,
      message: `Did you mean @${suggestion}? Please check the address and try again.`,
    };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      message:
        'That looks like a temporary inbox. Please use an address you can actually receive the card at.',
    };
  }

  if (KNOWN_GOOD_DOMAINS.has(domain)) {
    return { ok: true };
  }

  if (!(await domainAcceptsMail(domain))) {
    return {
      ok: false,
      message: `We cannot find a mail server for @${domain}. Please check the address and try again.`,
    };
  }

  return { ok: true };
}
