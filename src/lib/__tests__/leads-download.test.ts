import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * markLeadDownloaded is the one write on the ATHX funnel whose failure is
 * invisible.
 *
 * It is called from the download route without being awaited, and its rejection
 * is swallowed on purpose — analytics must never stand between somebody and the
 * file they are owed. Which means a malformed call does not break the download,
 * does not fail a build, and does not appear anywhere except a log line nobody
 * reads: the funnel keeps working while the number that decides whether the
 * page is oversold silently stays at zero.
 *
 * That is exactly what happened. The first version passed `{ merge: true,
 * mergeFields: [...] }`, which the Firestore SDK rejects outright.
 */

interface SetCall {
  docPath: string;
  data: Record<string, unknown>;
  options: Record<string, unknown> | undefined;
}

const setCalls: SetCall[] = [];

vi.mock('@/lib/firebase-admin', () => ({
  adminFirestore: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        set: async (data: Record<string, unknown>, options?: Record<string, unknown>) => {
          // The real SDK validates the options object and throws. Reproduced
          // here, because the assertion worth making is "Firestore would have
          // accepted this", not "our code called set".
          if (options && 'merge' in options && 'mergeFields' in options) {
            throw new Error(
              'Value for argument "options" is not a valid set() options argument. ' +
                'You cannot specify both "merge" and "mergeFields".',
            );
          }
          setCalls.push({ docPath: `${name}/${id}`, data, options });
        },
      }),
      add: async () => ({ path: `${name}/generated` }),
    }),
  },
}));

vi.mock('@/lib/lead-outbox', () => ({
  pendingOutbox: () => ({}),
  attemptForwardAsync: () => {},
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => '<serverTimestamp>' },
}));

const { markLeadDownloaded } = await import('../leads');

const SOURCE = 'athx_2027_guide';
const EMAIL = 'athlete@hybridx.club';

beforeEach(() => {
  setCalls.length = 0;
});

describe('markLeadDownloaded', () => {
  it('writes options Firestore actually accepts', async () => {
    // The regression. Before the fix this threw on every single download.
    await expect(markLeadDownloaded(SOURCE, EMAIL)).resolves.toBeUndefined();
    expect(setCalls).toHaveLength(1);
  });

  it('never sends both merge and mergeFields', async () => {
    await markLeadDownloaded(SOURCE, EMAIL);
    const { options } = setCalls[0];
    expect(options).toBeDefined();
    expect('merge' in options!).toBe(false);
    expect(options!.mergeFields).toEqual(['downloaded', 'downloadedAt']);
  });

  it('touches only the download fields, so a confirmation cannot be undone', async () => {
    await markLeadDownloaded(SOURCE, EMAIL);
    const { data, options } = setCalls[0];
    expect(Object.keys(data).sort()).toEqual(['downloaded', 'downloadedAt']);
    // mergeFields is what stops this write from blanking `confirmed`, `tags`
    // and the outbox entry on a document it only means to annotate.
    expect(options!.mergeFields).toEqual(Object.keys(data).sort());
    expect(data.downloaded).toBe(true);
  });

  it('addresses the same document the pending write created', async () => {
    // Same derivation as leadDocId: `${source}__${sha256(email)}`. A different
    // one would create a second, orphaned record carrying only a download flag,
    // and the signup-to-download gap would read as zero for ever.
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(EMAIL).digest('hex');

    await markLeadDownloaded(SOURCE, EMAIL);
    expect(setCalls[0].docPath).toBe(`leads/${SOURCE}__${hash}`);
  });

  it('normalises the address, so a token minted from typed input still matches', async () => {
    await markLeadDownloaded(SOURCE, '  Athlete@HybridX.Club  ');
    const canonical = setCalls[0].docPath;

    setCalls.length = 0;
    await markLeadDownloaded(SOURCE, EMAIL);
    expect(setCalls[0].docPath).toBe(canonical);
  });
});
