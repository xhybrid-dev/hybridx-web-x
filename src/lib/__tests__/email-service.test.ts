import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The bug that just cost every ATHX lead a send.
 *
 * RESEND_API_KEY was already `.trim()`'d before use, with a comment explaining
 * why: a secret set by piping through `echo` instead of `echo -n` picks up a
 * trailing newline, and the key is then rejected as invalid. SMTP_USER and
 * SMTP_PASSWORD had no equivalent guard — they were read straight off
 * `process.env` into nodemailer's `auth` — so the identical mistake on either
 * of them produced Brevo's "535 5.7.8 Authentication failed", indistinguishable
 * from a genuinely wrong credential, and the only way to tell them apart was a
 * live Cloud Logging line. This file pins the fix, and the diagnostic that
 * should catch the next one without needing that log line at all.
 */

const createTransportMock = vi.fn();

vi.mock('nodemailer', () => ({
  default: { createTransport: (...args: unknown[]) => createTransportMock(...args) },
}));

// sendEmail's other dependencies. Not the subject of this file, so mocked to
// the shape that lets a transactional, suppression-ignoring send through
// without a network call.
vi.mock('@/lib/marketing-bridge', () => ({
  getUnsubscribeLink: vi.fn().mockResolvedValue(null),
  getSuppressionState: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/suppression-mirror', () => ({
  checkComplaintMirror: vi.fn().mockResolvedValue({ complained: false, source: 'mirror' }),
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  createTransportMock.mockReset();
  createTransportMock.mockReturnValue({ sendMail: vi.fn().mockResolvedValue(undefined) });
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.RESEND_API_KEY;
  process.env.SMTP_HOST = 'smtp-relay.brevo.com';
  process.env.SMTP_PORT = '587';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('describeSmtpAuth', () => {
  it('reports clean when neither credential has surrounding whitespace', async () => {
    process.env.SMTP_USER = 'athlete@hybridx.club';
    process.env.SMTP_PASSWORD = 'a-clean-key';
    const { describeSmtpAuth } = await import('../email/service');

    expect(describeSmtpAuth()).toEqual({
      userHadSurroundingWhitespace: false,
      passwordHadSurroundingWhitespace: false,
    });
  });

  it('catches a trailing newline on SMTP_PASSWORD alone', async () => {
    // The exact shape `echo "$key" | firebase apphosting:secrets:set` produces,
    // as opposed to `echo -n`.
    process.env.SMTP_USER = 'athlete@hybridx.club';
    process.env.SMTP_PASSWORD = 'a-clean-key\n';
    const { describeSmtpAuth } = await import('../email/service');

    expect(describeSmtpAuth()).toEqual({
      userHadSurroundingWhitespace: false,
      passwordHadSurroundingWhitespace: true,
    });
  });

  it('catches whitespace on SMTP_USER independently of SMTP_PASSWORD', async () => {
    process.env.SMTP_USER = ' athlete@hybridx.club';
    process.env.SMTP_PASSWORD = 'a-clean-key';
    const { describeSmtpAuth } = await import('../email/service');

    expect(describeSmtpAuth()).toEqual({
      userHadSurroundingWhitespace: true,
      passwordHadSurroundingWhitespace: false,
    });
  });

  it('reports false rather than throwing when the credentials are unset', async () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    const { describeSmtpAuth } = await import('../email/service');

    expect(describeSmtpAuth()).toEqual({
      userHadSurroundingWhitespace: false,
      passwordHadSurroundingWhitespace: false,
    });
  });
});

describe('the SMTP transporter trims its own credentials before use', () => {
  it('strips a trailing newline from both user and pass on creation', async () => {
    // The regression itself: before the fix, nodemailer.createTransport
    // received these values verbatim, and Brevo's relay rejected the trailing
    // newline as invalid credentials on every single send.
    process.env.SMTP_USER = 'athlete@hybridx.club\n';
    process.env.SMTP_PASSWORD = ' a-key-with-stray-whitespace \n';

    const { sendEmail } = await import('../email/service');
    await sendEmail({
      to: 'test@example.com',
      subject: 'test',
      html: '<p>test</p>',
      text: 'test',
      transactional: true,
      ignoreSuppression: true,
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    const config = createTransportMock.mock.calls[0][0] as { auth: { user: string; pass: string } };
    expect(config.auth.user).toBe('athlete@hybridx.club');
    expect(config.auth.pass).toBe('a-key-with-stray-whitespace');
  });

  it('is built once and reused, so the trim only has to happen at creation', async () => {
    process.env.SMTP_USER = 'athlete@hybridx.club';
    process.env.SMTP_PASSWORD = 'a-clean-key';

    const { sendEmail } = await import('../email/service');
    const send = () =>
      sendEmail({
        to: 'test@example.com',
        subject: 'test',
        html: '<p>test</p>',
        text: 'test',
        transactional: true,
        ignoreSuppression: true,
      });

    await send();
    await send();

    // Confirms the caching behaviour that makes "just update the secret" not
    // enough on a live instance: a transporter built once with a bad
    // credential keeps using it until the process restarts, which on Cloud
    // Run means a fresh deploy, not merely a re-saved secret.
    expect(createTransportMock).toHaveBeenCalledTimes(1);
  });
});
