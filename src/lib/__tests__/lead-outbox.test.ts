import { describe, it, expect, vi, beforeEach } from 'vitest';

// Firestore and the bridge are both mocked: the point of these tests is the
// drain's decisions, not Google's client library.
const updates = new Map<string, Record<string, unknown>>();
const forwardLead = vi.fn();

let docs: Array<{ id: string; data: Record<string, unknown> }> = [];

vi.mock('@/lib/firebase-admin', () => {
  const makeRef = (path: string) => ({
    path,
    update: async (patch: Record<string, unknown>) => {
      updates.set(path, { ...(updates.get(path) ?? {}), ...patch });
    },
  });

  const query = {
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    get: async () => ({
      empty: docs.length === 0,
      docs: docs.map((d) => ({
        data: () => d.data,
        ref: makeRef(`leads/${d.id}`),
      })),
    }),
  };

  return {
    adminFirestore: {
      collection: () => query,
      doc: (path: string) => makeRef(path),
    },
  };
});

vi.mock('@/lib/marketing-bridge', () => ({ forwardLead: (...a: unknown[]) => forwardLead(...a) }));

const { backoffMs, drainOutbox, pendingOutbox, attemptForward, MAX_FORWARD_ATTEMPTS } =
  await import('../lead-outbox');

const payload = { email: 'athlete@hybridx.club', source: 'magnet-vo2max', consent: true };

beforeEach(() => {
  updates.clear();
  docs = [];
  forwardLead.mockReset();
});

describe('backoffMs', () => {
  it('grows exponentially from one minute', () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(2)).toBe(120_000);
    expect(backoffMs(3)).toBe(240_000);
  });

  it('caps at an hour, so a long outage does not push a retry into next week', () => {
    expect(backoffMs(10)).toBe(3_600_000);
    expect(backoffMs(50)).toBe(3_600_000);
  });

  it('never returns a negative or zero delay', () => {
    for (const n of [-5, 0, 1]) expect(backoffMs(n)).toBeGreaterThan(0);
  });
});

describe('pendingOutbox', () => {
  it('stores the payload, so a replay sends what the original would have', () => {
    // Rebuilding this from the lead document would mean re-deriving consent
    // from context — the one thing worth never guessing about.
    const entry = pendingOutbox(payload) as Record<string, unknown>;
    expect(entry.forwardPayload).toEqual(payload);
    expect(entry.forwarded).toBe(false);
    expect(entry.forwardAttempts).toBe(0);
  });

  it('is due immediately, so the inline attempt is not the only chance', () => {
    const entry = pendingOutbox(payload) as { forwardNextAttemptAt: { toMillis(): number } };
    expect(entry.forwardNextAttemptAt.toMillis()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  // Firestore refuses an entire document containing `undefined` — not the
  // field, the write. The payload carries `undefined` for absent optionals
  // deliberately, because it is also serialised to JSON for the bridge, where
  // `null` would arrive as an explicit "no name" and overwrite one already on
  // the subscriber. So this is where the two consumers are reconciled.
  //
  // Before they were, a magnet form with no first-name field — which is every
  // well-designed one — made every write fail. The capture actions catch and log
  // that rather than failing the visitor, so the guide arrived, the success
  // screen showed, and the lead was never recorded or forwarded. The funnel
  // looked healthy from every angle except the subscriber count.
  describe('undefined values, which Firestore rejects outright', () => {
    const minimal = {
      email: 'athlete@hybridx.club',
      name: undefined,
      source: 'athx_2027_guide',
      consent: false,
      consentMethod: 'magnet:athx_2027_guide:pending',
      consentPolicy: 'confirmed' as const,
      utm: undefined,
      tags: undefined,
    };

    it('drops every undefined key from the stored payload', () => {
      const entry = pendingOutbox(minimal) as { forwardPayload: Record<string, unknown> };
      const stored = entry.forwardPayload;

      expect(Object.values(stored).some((v) => v === undefined)).toBe(false);
      for (const absent of ['name', 'utm', 'tags']) {
        expect(absent in stored, absent).toBe(false);
      }
    });

    it('keeps everything that was actually supplied', () => {
      const entry = pendingOutbox(minimal) as { forwardPayload: Record<string, unknown> };
      expect(entry.forwardPayload).toEqual({
        email: 'athlete@hybridx.club',
        source: 'athx_2027_guide',
        consent: false,
        consentMethod: 'magnet:athx_2027_guide:pending',
        consentPolicy: 'confirmed',
      });
    });

    it('keeps a false consent, which is not the same as an absent one', () => {
      // The value most at risk from a careless truthiness filter, and the one
      // that decides whether somebody may be mailed before they confirm.
      const entry = pendingOutbox(minimal) as { forwardPayload: Record<string, unknown> };
      expect(entry.forwardPayload.consent).toBe(false);
      expect('consent' in entry.forwardPayload).toBe(true);
    });

    it('produces a document Firestore would accept', () => {
      // The assertion that matters: the real client walks the whole document
      // and throws on the first undefined it finds, naming the field path.
      const entry = pendingOutbox(minimal);
      const offenders = Object.entries(entry.forwardPayload as Record<string, unknown>)
        .filter(([, value]) => value === undefined)
        .map(([key]) => `forwardPayload.${key}`);
      expect(offenders).toEqual([]);
    });
  });
});

describe('attemptForward', () => {
  it('marks an entry delivered and clears the error', async () => {
    forwardLead.mockResolvedValue(true);
    const ok = await attemptForward('leads/a', payload, 0);

    expect(ok).toBe(true);
    expect(updates.get('leads/a')).toMatchObject({ forwarded: true });
  });

  it('records the attempt and schedules a retry on failure', async () => {
    forwardLead.mockResolvedValue(false);
    const ok = await attemptForward('leads/a', payload, 2);

    expect(ok).toBe(false);
    const patch = updates.get('leads/a')!;
    expect(patch.forwardAttempts).toBe(3);
    expect(patch.forwarded).toBeUndefined();
    expect(patch.forwardLastError).toBeTruthy();
  });

  it('never throws, so a request-path caller cannot be broken by it', async () => {
    forwardLead.mockRejectedValue(new Error('network down'));
    await expect(attemptForward('leads/a', payload, 0)).resolves.toBe(false);
  });
});

describe('drainOutbox', () => {
  it('delivers what is outstanding', async () => {
    docs = [{ id: 'a', data: { forwardPayload: payload, forwardAttempts: 0 } }];
    forwardLead.mockResolvedValue(true);

    const result = await drainOutbox();
    expect(result).toMatchObject({ claimed: 1, delivered: 1, failed: 0 });
  });

  it('counts a failure without giving up on it', async () => {
    docs = [{ id: 'a', data: { forwardPayload: payload, forwardAttempts: 1 } }];
    forwardLead.mockResolvedValue(false);

    const result = await drainOutbox();
    expect(result).toMatchObject({ claimed: 1, delivered: 0, failed: 1, exhausted: 0 });
    expect(updates.get('leads/a')!.forwardAttempts).toBe(2);
  });

  it('stops retrying an entry with no payload, rather than reserving a slot for ever', async () => {
    docs = [{ id: 'a', data: { forwardAttempts: 0 } }];

    const result = await drainOutbox();
    expect(result.exhausted).toBe(1);
    expect(forwardLead).not.toHaveBeenCalled();
    expect(updates.get('leads/a')).toMatchObject({ forwarded: true });
  });

  it('parks an entry past the attempt ceiling without discarding it', async () => {
    docs = [
      { id: 'a', data: { forwardPayload: payload, forwardAttempts: MAX_FORWARD_ATTEMPTS } },
    ];

    const result = await drainOutbox();
    expect(result.exhausted).toBe(1);
    expect(forwardLead).not.toHaveBeenCalled();

    // Still un-forwarded, so it stays visible in the admin view and the bridge
    // diagnostic's backlog count — somebody should look at it.
    const patch = updates.get('leads/a')!;
    expect(patch.forwarded).toBeUndefined();
    expect(patch.forwardLastError).toContain('Gave up');
  });

  it('does nothing when there is nothing due', async () => {
    docs = [];
    const result = await drainOutbox();
    expect(result).toEqual({ claimed: 0, delivered: 0, failed: 0, exhausted: 0 });
    expect(forwardLead).not.toHaveBeenCalled();
  });

  it('keeps working through the page when one entry fails', async () => {
    docs = [
      { id: 'a', data: { forwardPayload: payload, forwardAttempts: 0 } },
      { id: 'b', data: { forwardPayload: payload, forwardAttempts: 0 } },
    ];
    forwardLead.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const result = await drainOutbox();
    expect(result).toMatchObject({ claimed: 2, delivered: 1, failed: 1 });
  });
});
