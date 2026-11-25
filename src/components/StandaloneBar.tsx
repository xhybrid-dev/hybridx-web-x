import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * A slim way back to the rest of the site, for the pages that deliberately look
 * unlike it (the engine funnel, ATHX, the running plan): their own palette is the
 * point, but a visitor who wants the rest of HybridX had no link to it, and on
 * some of them not even a clickable logo. Dark by default, to sit on those pages.
 */
export default function StandaloneBar({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="HybridX" className={`bg-black text-white/80 ${className}`}>
      <div className="mx-auto flex h-10 max-w-6xl items-center justify-between px-6 font-body text-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> hybridx.club
        </Link>
        <span className="flex items-center gap-5">
          <Link href="/calculators" className="hover:text-white">Calculators</Link>
          <Link href="/app" className="hover:text-white">The App</Link>
        </span>
      </div>
    </nav>
  );
}
