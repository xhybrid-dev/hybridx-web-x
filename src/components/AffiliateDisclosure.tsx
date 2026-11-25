import { cn } from '@/lib/utils';

/**
 * The disclosure that goes next to Amazon links (UK CAP Code on affiliate
 * marketing, and the Amazon Associates agreement). It sits beside the links it
 * covers, in plain words, not in the footer. The links themselves carry
 * rel="sponsored".
 */
export const AFFILIATE_DISCLOSURE =
  'Affiliate disclosure: links to Amazon on this page are affiliate links. As an Amazon Associate, HybridX earns from qualifying purchases, at no extra cost to you.';

export default function AffiliateDisclosure({ className }: { className?: string }) {
  return (
    <p className={cn('font-body text-xs leading-relaxed text-muted-foreground', className)} data-affiliate-disclosure>
      {AFFILIATE_DISCLOSURE}
    </p>
  );
}
