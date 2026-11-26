import Link from 'next/link';
import { Instagram } from 'lucide-react';
import ConsentSettingsButton from '@/components/consent/ConsentSettingsButton';
import { footerColumns } from '@/lib/site-nav';

export default function Footer() {
  const columns = footerColumns();
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {columns.map((col) => (
            <nav key={col.label} aria-label={col.label}>
              <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-primary mb-3">
                {col.label}
              </h2>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-accent-ink transition-colors font-body"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {col.label === 'HybridX' && (
                  <li>
                    <ConsentSettingsButton className="text-sm text-muted-foreground hover:text-accent-ink transition-colors font-body text-left" />
                  </li>
                )}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex flex-col items-center sm:flex-row sm:justify-between border-t border-border/20 pt-6">
          <div className="text-sm text-muted-foreground font-body">
             <span>&copy; {new Date().getFullYear()} HybridX.Club. All rights reserved.</span>
          </div>
          <div className="mt-4 flex space-x-4 sm:mt-0">
            <Link href="https://www.instagram.com/hybridx.club" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent-ink transition-colors">
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
