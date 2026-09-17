import { sendEmail } from './service';

interface SendEngineGuideOptions {
  to: string;
  /** Absolute URL to the guide PDF. */
  pdfUrl: string;
  /** Absolute URL back to the funnel / site. */
  siteUrl: string;
  /** Optional first name for a warmer greeting. */
  firstName?: string;
}

/**
 * Email 0 — instant delivery of the "Build a Bigger Engine" VO2max guide.
 * HybridX voice: warm, direct, plain language, no em-dashes.
 */
export async function sendEngineGuideEmail({
  to,
  pdfUrl,
  siteUrl,
  firstName,
}: SendEngineGuideOptions): Promise<void> {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const year = new Date().getFullYear();

  const html = `
  <div style="margin:0;padding:0;background-color:#2C0710;">
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color:#FBF5EF;">
      <!-- Header -->
      <div style="background-color:#2C0710; padding: 28px 32px; border-bottom: 4px solid #C1121F;">
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: 800; letter-spacing: -0.5px; font-size: 22px; color:#FBF5EF;">
          HYBRID<span style="color:#E63946;">X</span>
        </span>
      </div>

      <!-- Body -->
      <div style="padding: 36px 32px; color:#2A1619;">
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>

        <h1 style="font-family: Helvetica, Arial, sans-serif; font-size: 26px; line-height: 1.15; margin: 0 0 16px; color:#2A1619; text-transform: uppercase; letter-spacing: 0.3px;">
          Your free guide is here
        </h1>

        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px; color:#4A3034;">
          Welcome in. This is the science of raising your VO2max for running and hybrid performance, written in plain language you can actually use this week. No jargon walls, no fluff.
        </p>

        <!-- CTA button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
          <tr>
            <td style="border-radius: 12px; background-color:#C1121F;">
              <a href="${pdfUrl}" target="_blank"
                 style="display: inline-block; padding: 16px 32px; font-family: Helvetica, Arial, sans-serif; font-weight: 800; font-size: 16px; color:#FBF5EF; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">
                Download your guide
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px; color:#4A3034;">
          Short on time? Start with <strong>Section 4</strong>. It is the single highest leverage idea in the whole guide, and you can put it into your next session.
        </p>

        <p style="font-size: 15px; line-height: 1.6; margin: 24px 0 0; color:#4A3034;">
          Train smart,<br/>
          <strong style="color:#2A1619;">The HybridX Team</strong>
        </p>

        <p style="font-size: 13px; line-height: 1.6; margin: 24px 0 0; color:#8A7375;">
          P.S. If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${pdfUrl}" style="color:#C1121F; word-break: break-all;">${pdfUrl}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#2C0710; padding: 20px 32px; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 12px; color:#FBF5EF;">
          <a href="${siteUrl}" style="color:#E63946; text-decoration: none;">hybridx.club</a>
        </p>
        <p style="margin: 0; font-size: 11px; color:#8A7375;">
          &copy; ${year} HybridX.Club. You are receiving this because you requested the free VO2max guide.
        </p>
      </div>
    </div>
  </div>
  `;

  const text = [
    greeting,
    '',
    'Your free guide is here: Build a Bigger Engine.',
    '',
    'This is the science of raising your VO2max for running and hybrid performance, in plain language you can use this week.',
    '',
    'Download your guide:',
    pdfUrl,
    '',
    'Short on time? Start with Section 4. It is the single highest leverage idea in the guide.',
    '',
    'Train smart,',
    'The HybridX Team',
    '',
    `${siteUrl}`,
  ].join('\n');

  await sendEmail({
    to,
    subject: 'Your free guide is here: Build a Bigger Engine',
    html,
    text,
    // Marketing/list mail: give recipients an easy opt-out. This is a strong
    // positive signal to Gmail and Yahoo. Upgrade to a one-click HTTPS endpoint
    // once an unsubscribe route exists (see EMAIL_SETUP notes).
    // Unsubscribe headers are attached by sendEmail: a signed one-click
    // HTTPS endpoint whose opt-out reaches the shared suppression list,
    // with the mailto retained as a fallback for older clients.
  });
}
