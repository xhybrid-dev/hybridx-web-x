import { anton, archivo } from '@/lib/fonts';

// Display + label faces used only by this funnel. Declared with the site's other
// self-hosted faces in src/lib/fonts.ts, and applied here (not in the root layout)
// so the rest of the site doesn't pay their download cost.
export default function EngineLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${anton.variable} ${archivo.variable}`}>{children}</div>;
}
