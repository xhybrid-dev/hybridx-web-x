import Link from 'next/link';
import { Instagram } from 'lucide-react';

const footerColumns = [
  {
    heading: 'Training',
    links: [
      { label: 'Free 12-Week Hyrox Plan', href: '/free-hyrox-plan' },
      { label: 'How to Train for Hyrox', href: '/how-to-train-for-hyrox' },
      { label: '12-Week Plan Structure', href: '/hyrox-training-plan' },
      { label: 'Hybrid Training Program', href: '/hybrid-training-program' },
      { label: 'Free VO2max Guide', href: '/build-a-bigger-engine' },
    ],
  },
  {
    heading: 'Free Tools',
    links: [
      { label: 'All Calculators', href: '/calculators' },
      { label: 'VDOT Calculator', href: '/vdot' },
      { label: 'Treadmill FIT/TCX Generator', href: '/calculators/garmin-tcx-generator' },
      { label: 'Race Time Predictor', href: '/calculators/race-time-predictor' },
      { label: '12-Week Running Plan', href: '/12-week-running-hyrox' },
    ],
  },
  {
    heading: 'HybridX',
    links: [
      { label: 'The App — £5/mo', href: '/app' },
      { label: 'Books', href: '/books' },
      { label: 'Store', href: '/store' },
      { label: 'FAQ', href: '/#faq' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {footerColumns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-primary mb-3">
                {col.heading}
              </h2>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-accent transition-colors font-body"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex flex-col items-center sm:flex-row sm:justify-between border-t border-border/20 pt-6">
          <div className="text-sm text-muted-foreground font-body">
             <span>&copy; {new Date().getFullYear()} HybridX.Club. All rights reserved.</span>
          </div>
          <div className="mt-4 flex space-x-4 sm:mt-0">
            <Link href="https://www.instagram.com/hybridx.club" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
            </Link>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border/20 text-center text-xs text-muted-foreground font-body">
          <p>hybridx.club is not affiliated with HYROX GmbH. HYROX® is a registered trademark of HYROX GmbH.</p>
        </div>
      </div>
    </footer>
  );
}
