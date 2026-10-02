'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { ShopPreview } from '@/lib/shop/config';

/**
 * Three page thumbnails, each opening a larger view. Lazy loaded: they sit
 * below the fold on a phone, and the page should not pay for them up front.
 */
export default function PreviewGallery({ title, previews }: { title: string; previews: ShopPreview[] }) {
  const [open, setOpen] = useState<ShopPreview | null>(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label={`${title} preview pages`}>
        {previews.map((p) => (
          <li key={p.src}>
            <button
              type="button"
              onClick={() => setOpen(p)}
              className="group block w-full rounded-md border border-border bg-background p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
            >
              <Image
                src={p.src}
                alt={p.alt}
                width={p.width}
                height={p.height}
                sizes="(min-width: 1024px) 160px, (min-width: 768px) 14vw, 30vw"
                loading="lazy"
                className="h-auto w-full rounded-t-md"
              />
              <span className="block px-1.5 py-1 text-xs text-muted-foreground group-hover:underline">
                {p.caption}
                <span className="sr-only">, open larger</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="shop-dialog max-h-[92vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
          {open ? (
            <>
              <DialogTitle className="pr-8 font-headline text-lg">
                {title}: {open.caption}
              </DialogTitle>
              <DialogDescription className="sr-only">{open.alt}</DialogDescription>
              <Image
                src={open.src}
                alt={open.alt}
                width={open.width}
                height={open.height}
                sizes="(min-width: 800px) 720px, 92vw"
                className="h-auto w-full rounded border border-border"
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
