import Link from 'next/link';
import { getShopEvent, type ShopEvent } from '@/lib/shop/config';
import { salesState } from '@/lib/shop/env';

/**
 * A plain link to an event's shop page, rendered only while its sales are
 * open. Pages that carry it are mostly built statically, so it follows
 * SHOP_SALES_OPEN as it was at build time: opening the shop is a rollout.
 */
export default function ShopEventLink({ slug = 'hyrox-glasgow-2027' }: { slug?: string }) {
  const event = getShopEvent(slug) as ShopEvent | undefined;
  if (!event || salesState(event) !== 'open') return null;
  return (
    <section aria-label={`${event.name} downloads`} className="border-t border-border py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="text-muted-foreground">
          For HYROX Glasgow in March 2027 there is a{' '}
          <Link href={event.path} className="font-medium text-foreground underline underline-offset-4">
            22-week preparation guide and pacing pack
          </Link>
          , sold as PDF downloads.
        </p>
      </div>
    </section>
  );
}
