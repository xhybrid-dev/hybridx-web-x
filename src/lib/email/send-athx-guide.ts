import { sendEmail } from './service';

interface SendAthxGuideOptions {
  to: string;
  /** Absolute URL to the confirm page, carrying the signed token. */
  confirmUrl: string;
  /** Absolute URL back to the funnel page. */
  pageUrl: string;
  /** Absolute URL to the site root. */
  siteUrl: string;
}

/**
 * Email 0 of the ATHX 2027 campaign: the download link for the one-page guide.
 *
 * One job, one button. The guide sits behind a signed link rather than being
 * attached, for three reasons: the click is what proves the address is real, an
 * attachment on a first contact is a deliverability problem, and the link is
 * what lets the download be counted against the signup.
 *
 * Deliberately no pitch for the books. The guide itself carries none either,
 * and that restraint is the point — somebody who opens a genuinely useful guide
 * and finds an advert inside does not open the next email. The books get sold
 * by the launch email.
 *
 * Brand is the funnel's own: black ground, orange accent, matching the page and
 * the printed editions rather than the site's yellow. Voice is HybridX — warm,
 * direct, plain language, no em-dashes.
 */
export async function sendAthxGuideEmail({
  to,
  confirmUrl,
  pageUrl,
  siteUrl,
}: SendAthxGuideOptions): Promise<void> {
  const year = new Date().getFullYear();

  const html = `
  <div style="margin:0;padding:0;background-color:#0a0a0a;">
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color:#ffffff;">
      <!-- Header -->
      <div style="background-color:#0a0a0a; padding: 28px 32px; border-bottom: 4px solid #ea580c;">
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: 800; letter-spacing: -0.5px; font-size: 22px; color:#ffffff;">
          HYBRID<span style="color:#ea580c;">X</span>
        </span>
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: 600; font-size: 11px; letter-spacing: 2px; color:#9a9a9a; margin-left: 12px;">
          ATHX 2027
        </span>
      </div>

      <!-- Body -->
      <div style="padding: 36px 32px; color:#111111;">
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi there,</p>

        <h1 style="font-family: Helvetica, Arial, sans-serif; font-size: 26px; line-height: 1.2; margin: 0 0 16px; color:#111111;">
          One click and the guide is yours
        </h1>

        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px; color:#444444;">
          You asked for the one-page guide to ATHX. Confirm your address below and it downloads straight away. We ask because it keeps this list to people who actually want to hear from us.
        </p>

        <!-- CTA button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
          <tr>
            <td style="background-color:#ea580c;">
              <a href="${confirmUrl}" target="_blank"
                 style="display: inline-block; padding: 16px 32px; font-family: Helvetica, Arial, sans-serif; font-weight: 800; font-size: 16px; color:#ffffff; text-decoration: none;">
                Confirm and download the guide
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px; color:#444444;">
          It covers what ATHX is, how the day is structured, the three zones, how the rank scoring actually adds up, three things that surprise people, and the 2027 UK and Ireland dates. One page, no fluff.
        </p>

        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px; color:#444444;">
          One thing worth knowing before you even open it: in the Endurance Zone, only the ski distance scores. The run is a buy-in. Which means every second spent running is a second not spent scoring, and the usual advice to start easy costs you more than it saves.
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
          <a href="${pageUrl}" style="color:#ea580c; text-decoration: none;">Work out your own Endurance Zone number</a>
        </p>
        <p style="margin: 0 0 10px; font-size: 11px; color:#999999;">
          &copy; ${year} HybridX.Club. You are receiving this because you asked for the ATHX guide at
          <a href="${siteUrl}" style="color:#999999;">hybridx.club</a>. If that was not you, ignore this email and nothing further will be sent.
        </p>
        <p style="margin: 0; font-size: 11px; color:#5f5f5f;">
          Unofficial and independently produced. Not affiliated with or endorsed by ATHX Games.
        </p>
      </div>
    </div>
  </div>
  `;

  const text = [
    'Hi there,',
    '',
    'One click and the one-page guide to ATHX is yours.',
    '',
    'Confirm your address and it downloads straight away. We ask because it keeps this list to people who actually want to hear from us.',
    '',
    'Confirm and download the guide:',
    confirmUrl,
    '',
    'It covers what ATHX is, how the day is structured, the three zones, how the rank scoring actually adds up, three things that surprise people, and the 2027 UK and Ireland dates. One page, no fluff.',
    '',
    'One thing worth knowing before you even open it: in the Endurance Zone, only the ski distance scores. The run is a buy-in. Which means every second spent running is a second not spent scoring, and the usual advice to start easy costs you more than it saves.',
    '',
    'Train smart,',
    'The HybridX Team',
    '',
    `Work out your own number: ${pageUrl}`,
    '',
    'If you did not request this, ignore this email and nothing further will be sent.',
    '',
    'Unofficial and independently produced. Not affiliated with or endorsed by ATHX Games.',
  ].join('\n');

  await sendEmail({
    to,
    subject: 'One click and your ATHX guide is here',
    html,
    text,
    // Unsubscribe headers are attached by sendEmail: a signed one-click HTTPS
    // endpoint whose opt-out reaches the shared suppression list, with the
    // mailto retained as a fallback for older clients.
  });
}
