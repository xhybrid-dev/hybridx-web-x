// src/lib/shop/email.ts
//
// The order email, and the resend email. Transactional only: no marketing
// content and no unsubscribe header, because these messages carry something
// the recipient paid for. List signup happens only through an explicit opt-in.

import { sendEmail } from '@/lib/email/service';
import { shopEmailFrom, siteUrl } from './env';

export interface OrderEmailInput {
  to: string;
  subject: string;
  token: string;
  shortId: string;
  itemNames: string[];
  amountTotal: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function libraryUrl(token: string): string {
  return `${siteUrl()}/d/${token}`;
}

/** "£12.00". The email states the exact amount paid, pence included. */
function formatTotal(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function buildOrderEmail(input: OrderEmailInput): { subject: string; text: string; html: string } {
  const url = libraryUrl(input.token);
  const site = siteUrl();
  const items = input.itemNames.join(', ');
  const total = formatTotal(input.amountTotal);

  const text = [
    'Thank you for your order.',
    '',
    'Your downloads are here:',
    url,
    '',
    'This page keeps working, so bookmark it. It lists the files you bought',
    'and any updated versions. If you lose the link, request a new one at',
    `${site}/resend.`,
    '',
    `Order: ${input.shortId}`,
    `Items: ${items}`,
    `Total paid: ${total}`,
    '',
    'Stripe sends a separate receipt.',
    '',
    'If a file does not open or something looks wrong, reply to this email.',
    '',
    'HybridX',
  ].join('\n');

  const p = 'margin:0 0 16px;font-size:16px;line-height:1.5;color:#111111;';
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;">
<p style="${p}">Thank you for your order.</p>
<p style="${p}">Your downloads are here:</p>
<p style="margin:0 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#000000;color:#ffffff;padding:12px 20px;border-radius:6px;font-weight:bold;text-decoration:none;font-size:16px;">Open your downloads</a></p>
<p style="${p}">Or copy this link: <a href="${escapeHtml(url)}" style="color:#000000;">${escapeHtml(url)}</a></p>
<p style="${p}">This page keeps working, so bookmark it. It lists the files you bought and any updated versions. If you lose the link, request a new one at <a href="${escapeHtml(site)}/resend" style="color:#000000;">${escapeHtml(site.replace(/^https?:\/\//, ''))}/resend</a>.</p>
<table role="presentation" style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#111111;border-collapse:collapse;">
<tr><td style="padding:0 16px 0 0;">Order</td><td>${escapeHtml(input.shortId)}</td></tr>
<tr><td style="padding:0 16px 0 0;">Items</td><td>${escapeHtml(items)}</td></tr>
<tr><td style="padding:0 16px 0 0;">Total paid</td><td>${escapeHtml(total)}</td></tr>
</table>
<p style="${p}">Stripe sends a separate receipt.</p>
<p style="${p}">If a file does not open or something looks wrong, reply to this email.</p>
<p style="${p}">HybridX</p>
</div></body></html>`;

  return { subject: input.subject, text, html };
}

export async function sendOrderEmail(input: OrderEmailInput): Promise<void> {
  const { subject, text, html } = buildOrderEmail(input);
  await sendEmail({ to: input.to, subject, text, html, from: shopEmailFrom(), transactional: true });
}

export interface ResendOrder {
  token: string;
  shortId: string;
  itemNames: string[];
}

export function buildResendEmail(orders: ResendOrder[]): { subject: string; text: string; html: string } {
  const lines: string[] = ['You asked for your HybridX download links.', ''];
  const rows: string[] = [];
  for (const o of orders) {
    const url = libraryUrl(o.token);
    lines.push(`Order ${o.shortId}: ${o.itemNames.join(', ')}`, url, '');
    rows.push(
      `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#111111;">Order ${escapeHtml(o.shortId)}: ${escapeHtml(o.itemNames.join(', '))}<br><a href="${escapeHtml(url)}" style="color:#000000;">${escapeHtml(url)}</a></p>`,
    );
  }
  lines.push(
    'If you did not ask for this, you can ignore it. The links only show files',
    'already bought with this address.',
    '',
    'HybridX',
  );
  const text = lines.join('\n');
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#111111;">You asked for your HybridX download links.</p>
${rows.join('\n')}
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#111111;">If you did not ask for this, you can ignore it. The links only show files already bought with this address.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#111111;">HybridX</p>
</div></body></html>`;
  return { subject: 'Your HybridX download links', text, html };
}

export async function sendResendEmail(to: string, orders: ResendOrder[]): Promise<void> {
  const { subject, text, html } = buildResendEmail(orders);
  await sendEmail({ to, subject, text, html, from: shopEmailFrom(), transactional: true });
}
