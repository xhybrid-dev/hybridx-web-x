// The site's navigation, in one place: the header, the mobile drawer and the footer
// read it, and src/lib/__tests__/site-nav.test.ts checks that no page in the
// sitemap is left out of all of them.
//
// A page that sits outside the header and the footer is found only through
// links in other pages' copy, which is how the paid Glasgow shop, the ATHX 2027
// page and the three HYROX tools came to be reachable from almost nowhere.

import { SHOP_EVENTS } from '@/lib/shop/config';
import { salesState } from '@/lib/shop/env';
import { APP_LOGIN_URL } from '@/lib/app-links';

export interface NavLink {
  label: string;
  href: string;
}

export interface NavGroup {
  label: string;
  links: NavLink[];
}

export type NavEntry = ({ kind: 'link' } & NavLink) | ({ kind: 'group' } & NavGroup);

/** The shop's event pages that are on sale, so a closed or unopened shop is never advertised. */
export function openShopLinks(now = new Date()): NavLink[] {
  return SHOP_EVENTS.filter((event) => salesState(event, now) === 'open').map((event) => ({
    label: `${event.name} Packs`,
    href: event.path,
  }));
}

export function primaryNav(now = new Date()): NavEntry[] {
  return [
    {
      kind: 'group',
      label: 'Plans',
      links: [
        { label: 'Free 12-Week HYROX Plan (PDF)', href: '/free-hyrox-plan' },
        { label: '12-Week HYROX Running Plan', href: '/12-week-running-hyrox' },
        { label: 'Free VO2max Guide', href: '/build-a-bigger-engine' },
        { label: 'Find Your Plan', href: '/start' },
      ],
    },
    { kind: 'link', label: 'The App', href: '/app' },
    {
      kind: 'group',
      label: 'Tools',
      links: [
        { label: 'All Calculators & Tools', href: '/calculators' },
        { label: 'HYROX Pacer', href: '/calculators/hyrox-pacer' },
        { label: 'Hybrid Week Planner', href: '/calculators/week-planner' },
        { label: 'Strength & Engine Test', href: '/calculators/strength-engine-test' },
        { label: 'VDOT Calculator', href: '/vdot' },
        { label: 'Treadmill FIT/TCX Generator', href: '/calculators/garmin-tcx-generator' },
        { label: 'Running Calculators', href: '/calculators/running' },
        { label: 'Strength Calculators', href: '/calculators/strength' },
        { label: 'Health & Nutrition Calculators', href: '/calculators/general-health' },
      ],
    },
    {
      kind: 'group',
      label: 'Guides',
      links: [
        { label: 'All Guides', href: '/guides' },
        { label: '2026/27 Rule Changes', href: '/hyrox-rule-changes-2026' },
        { label: 'How to Train for HYROX', href: '/how-to-train-for-hyrox' },
        { label: '12-Week Plan Structure', href: '/hyrox-training-plan' },
        { label: 'Hybrid Training Programme', href: '/hybrid-training-program' },
        { label: 'ATHX 2027 Guide', href: '/athx-2027' },
      ],
    },
    {
      kind: 'group',
      label: 'Shop',
      links: [
        ...openShopLinks(now),
        { label: 'Training Books', href: '/books' },
        { label: 'Apparel & Gear', href: '/store' },
      ],
    },
    { kind: 'link', label: 'UNA Watch', href: '/una' },
  ];
}

export function footerColumns(now = new Date()): NavGroup[] {
  return [
    {
      label: 'Training & Plans',
      links: [
        { label: 'Free 12-Week HYROX Plan', href: '/free-hyrox-plan' },
        { label: '12-Week HYROX Running Plan', href: '/12-week-running-hyrox' },
        { label: 'Find Your Plan', href: '/start' },
        { label: 'All Guides', href: '/guides' },
        { label: '2026/27 Rule Changes', href: '/hyrox-rule-changes-2026' },
        { label: 'How to Train for HYROX', href: '/how-to-train-for-hyrox' },
        { label: '12-Week Plan Structure', href: '/hyrox-training-plan' },
        { label: 'Hybrid Training Programme', href: '/hybrid-training-program' },
        { label: 'Free VO2max Guide', href: '/build-a-bigger-engine' },
        { label: 'ATHX 2027 Guide', href: '/athx-2027' },
      ],
    },
    {
      label: 'Free Tools',
      links: [
        { label: 'All Calculators & Tools', href: '/calculators' },
        { label: 'HYROX Pacer', href: '/calculators/hyrox-pacer' },
        { label: 'Hybrid Week Planner', href: '/calculators/week-planner' },
        { label: 'Strength & Engine Test', href: '/calculators/strength-engine-test' },
        { label: 'VDOT Calculator', href: '/vdot' },
        { label: 'Treadmill FIT/TCX Generator', href: '/calculators/garmin-tcx-generator' },
        { label: 'Race Time Predictor', href: '/calculators/race-time-predictor' },
        { label: 'Running Calculators', href: '/calculators/running' },
        { label: 'Strength Calculators', href: '/calculators/strength' },
        { label: 'Health & Nutrition Calculators', href: '/calculators/general-health' },
      ],
    },
    {
      label: 'Shop & Apps',
      links: [
        { label: 'The App: £5/mo', href: '/app' },
        { label: 'Member Log In', href: APP_LOGIN_URL },
        ...openShopLinks(now),
        { label: 'Training Books', href: '/books' },
        { label: 'Apparel & Gear', href: '/store' },
        { label: 'Resend a Download Link', href: '/resend' },
        { label: 'UNA Watch Apps (X Family)', href: '/una' },
        { label: 'X Training for UNA Watch', href: '/training' },
      ],
    },
    {
      label: 'HybridX',
      links: [
        { label: 'About HybridX', href: '/about' },
        { label: 'How Our Guides Are Written', href: '/guides/how-we-write' },
        { label: 'Contact & Support', href: '/contact' },
        { label: 'FAQ', href: '/#faq' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms of Use', href: '/terms' },
        { label: 'Shop Terms', href: '/shop-terms' },
      ],
    },
  ];
}
