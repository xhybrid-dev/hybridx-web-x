import type { Metadata } from 'next';
import ShopThanks from '@/components/shop/ShopThanks';
import { getShopEvent, type ShopEvent } from '@/lib/shop/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thank you for your order',
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  return <ShopThanks event={getShopEvent('hyrox-glasgow-2027') as ShopEvent} sessionId={session_id} />;
}
