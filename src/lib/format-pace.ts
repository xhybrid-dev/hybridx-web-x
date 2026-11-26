// One way to write a pace or a time as m:ss.
//
// Formatting minutes and seconds separately rounds the seconds on their own, so
// 239.6 s came out as "3:60" instead of "4:00". Round the whole number of
// seconds first, then split it.

/** Whole seconds as m:ss ("4:00"), or h:mm:ss once past an hour when `hours` is set. */
export function formatPaceSec(seconds: number, opts: { hours?: boolean } = {}): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.round(seconds);
  if (opts.hours && total >= 3600) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
