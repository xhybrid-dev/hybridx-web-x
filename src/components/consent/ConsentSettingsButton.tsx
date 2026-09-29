'use client';

import { openConsentSettings } from '@/lib/consent';

/** Reopens the consent banner, so a choice can be changed or withdrawn. */
export default function ConsentSettingsButton({ className, children = 'Cookie settings' }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={openConsentSettings}>
      {children}
    </button>
  );
}
