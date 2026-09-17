import { sendEmail } from './service';

interface SendRaceDayCardOptions {
  to: string;
  /** Absolute URL to the confirm page, carrying the signed token. */
  confirmUrl: string;
  /** Absolute URL back to the rule-changes page. */
  pageUrl: string;
  /** Absolute URL to the site root. */
  siteUrl: string;
  /** Optional first name for a warmer greeting. */
  firstName?: string;
}

/**
 * Email 0 — the confirmation step of the double opt-in.
 *
 * One job: get the click. The card is behind the button rather than attached,
 * because the click is what proves the address is real. Deliberately no pitch
 * — the nurture sequence earns that later.
 *
 * Brand: the rule-changes funnel uses the site's black/yellow palette rather
 * than the oxblood used by the VO2max funnel.
 */
export async function sendRaceDayCardEmail({
  to,
  confirmUrl,
  pageUrl,
  siteUrl,
  firstName,
}: SendRaceDayCardOptions): Promise<void> {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const year = new Date().getFullYear();

  const html = `
  <div style="margin:0;padding:0;background-color:#0a0a0a;">
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color:#ffffff;">
      <!-- Header -->
      <div style="background-color:#0a0a0a; padding: 28px 32px; border-bottom: 4px solid #fadb5c;">
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: 800; letter-spacing: -0.5px; font-size: 22px; color:#ffffff;">
          HYBRID<span style="color:#fadb5c;">X</span>
        </span>
      </div>

      <!-- Body -->
      <div style="padding: 36px 32px; color:#111111;">
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>

        <h1 style="font-family: Helvetica, Arial, sans-serif; font-size: 26px; line-height: 1.2; margin: 0 0 16px; color:#111111;">
          Confirm your email to get the card
        </h1>

        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px; color:#444444;">
          One click and the HYROX 2026/27 race day rules card is yours. We ask because it keeps our list to people who actually want to hear from us.
        </p>

        <!-- CTA button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
          <tr>
            <td style="border-radius: 12px; background-color:#fadb5c;">
              <a href="${confirmUrl}" target="_blank"
                 style="display: inline-block; padding: 16px 32px; font-family: Helvetica, Arial, sans-serif; font-weight: 800; font-size: 16px; color:#111111; text-decoration: none;">
                Confirm and download the card
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px; color:#444444;">
          One thing you can act on before you even open it: for 2026/27, leaving any station unfinished is a disqualification rather than a time penalty. Do not leave a station until a judge confirms you are done.
        </p>

        <p style="font-size: 15px; line-height: 1.6; margin: 24px 0 0; color:#444444;">
          Train smart,<br/>
          <strong style="color:#111111;">The HybridX Team</strong>
        </p>

        <p style="font-size: 13px; line-height: 1.6; margin: 24px 0 0; color:#777777;">
          P.S. If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${confirmUrl}" style="color:#111111; word-break: break-all;">${confirmUrl}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#0a0a0a; padding: 20px 32px; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 12px; color:#ffffff;">
          <a href="${pageUrl}" style="color:#fadb5c; text-decoration: none;">The full 2026/27 rule changes</a>
        </p>
        <p style="margin: 0; font-size: 11px; color:#999999;">
          &copy; ${year} HybridX.Club. You are receiving this because you requested the HYROX race day rules card at
          <a href="${siteUrl}" style="color:#999999;">hybridx.club</a>. If that was not you, ignore this email and nothing further will be sent.
        </p>
      </div>
    </div>
  </div>
  `;

  const text = [
    greeting,
    '',
    'Confirm your email to get the HYROX 2026/27 race day rules card.',
    '',
    'One click and the card is yours. We ask because it keeps our list to people who actually want to hear from us.',
    '',
    'Confirm and download the card:',
    confirmUrl,
    '',
    'One thing you can act on before you even open it: for 2026/27, leaving any station unfinished is a disqualification rather than a time penalty. Do not leave a station until a judge confirms you are done.',
    '',
    'Train smart,',
    'The HybridX Team',
    '',
    `The full rule changes: ${pageUrl}`,
    '',
    'If you did not request this, ignore this email and nothing further will be sent.',
  ].join('\n');

  await sendEmail({
    to,
    subject: 'Confirm your email to get the HYROX race day card',
    html,
    text,
    // Unsubscribe headers are attached by sendEmail: a signed one-click
    // HTTPS endpoint whose opt-out reaches the shared suppression list,
    // with the mailto retained as a fallback for older clients.
  });
}
