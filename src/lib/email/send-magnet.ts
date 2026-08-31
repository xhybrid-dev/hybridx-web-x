import { sendEmail } from './service';
import type { MagnetDefinition } from '@/lib/magnets';

interface SendMagnetOptions {
  to: string;
  magnet: MagnetDefinition;
  /**
   * Where the button goes: a confirmation link for a confirmed-opt-in magnet,
   * the asset itself for an immediate one. Built by the caller, which is the
   * only place that knows whether a token exists yet.
   */
  actionUrl: string;
  /** Absolute URL back to the funnel page. */
  pageUrl: string;
  /** Absolute URL to the site root. */
  siteUrl: string;
  /** Optional first name, for a warmer greeting. */
  firstName?: string;
}

/**
 * Email 0 for every lead magnet.
 *
 * One template, because the three that existed were the same email three times:
 * 91 of the race card's 127 lines were identical to the ATHX guide's, and the
 * differences were a colour, a subject and three paragraphs. Copying it a fourth
 * time for the next campaign would have carried the same bugs forward — the
 * white-on-orange button that fails contrast, the missing unsubscribe on the
 * training-plan mail — because that is what copying does.
 *
 * Everything variable comes from the magnet's registry entry, so a new campaign
 * writes copy rather than markup.
 *
 * Voice is HybridX: warm, direct, plain language, no em-dashes. Layout is the
 * table-and-inline-styles kind that survives Outlook.
 */
export async function sendMagnetEmail({
  to,
  magnet,
  actionUrl,
  pageUrl,
  siteUrl,
  firstName,
}: SendMagnetOptions): Promise<void> {
  const { email: copy } = magnet;
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const year = new Date().getFullYear();

  const html = `
  <div style="margin:0;padding:0;background-color:#0a0a0a;">
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color:#ffffff;">
      <!-- Header -->
      <div style="background-color:#0a0a0a; padding: 28px 32px; border-bottom: 4px solid ${copy.accent};">
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: 800; letter-spacing: -0.5px; font-size: 22px; color:#ffffff;">
          HYBRID<span style="color:${copy.accent};">X</span>
        </span>
      </div>

      <!-- Body -->
      <div style="padding: 36px 32px; color:#111111;">
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>

        <h1 style="font-family: Helvetica, Arial, sans-serif; font-size: 26px; line-height: 1.2; margin: 0 0 16px; color:#111111;">
          ${copy.heading}
        </h1>

        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px; color:#444444;">
          ${copy.intro}
        </p>

        <!-- CTA button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
          <tr>
            <td style="background-color:${copy.accent};">
              <a href="${actionUrl}" target="_blank"
                 style="display: inline-block; padding: 16px 32px; font-family: Helvetica, Arial, sans-serif; font-weight: 800; font-size: 16px; color:${copy.accentText}; text-decoration: none;">
                ${copy.buttonLabel}
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px; color:#444444;">
          ${copy.insight}
        </p>

        <p style="font-size: 15px; line-height: 1.6; margin: 24px 0 0; color:#444444;">
          Train smart,<br/>
          <strong style="color:#111111;">The HybridX Team</strong>
        </p>

        <p style="font-size: 13px; line-height: 1.6; margin: 24px 0 0; color:#777777;">
          P.S. If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${actionUrl}" style="color:#111111; word-break: break-all;">${actionUrl}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#0a0a0a; padding: 20px 32px; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 12px; color:#ffffff;">
          <a href="${pageUrl}" style="color:${copy.accent}; text-decoration: none;">${copy.footerLinkLabel}</a>
        </p>
        <p style="margin: 0${copy.disclaimer ? ' 0 10px' : ''}; font-size: 11px; color:#999999;">
          &copy; ${year} HybridX.Club. You are receiving this because ${copy.reason}
          <a href="${siteUrl}" style="color:#999999;">hybridx.club</a>. If that was not you, ignore this email and nothing further will be sent.
        </p>
        ${
          copy.disclaimer
            ? `<p style="margin: 0; font-size: 11px; color:#5f5f5f;">${copy.disclaimer}</p>`
            : ''
        }
      </div>
    </div>
  </div>
  `;

  const text = [
    greeting,
    '',
    copy.heading,
    '',
    copy.intro,
    '',
    `${copy.buttonLabel}:`,
    actionUrl,
    '',
    copy.insight,
    '',
    'Train smart,',
    'The HybridX Team',
    '',
    `${copy.footerLinkLabel}: ${pageUrl}`,
    '',
    'If you did not request this, ignore this email and nothing further will be sent.',
    ...(copy.disclaimer ? ['', copy.disclaimer] : []),
  ].join('\n');

  await sendEmail({
    to,
    subject: copy.subject,
    html,
    text,
    // Unsubscribe headers are attached by sendEmail: a signed one-click HTTPS
    // endpoint whose opt-out reaches the shared suppression list, with the
    // mailto retained as a fallback for older clients.
  });
}
