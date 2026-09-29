'use client';

// Visits per day: one series over time, so a single 2px line in the theme's
// primary colour, hairline grid, and a crosshair tooltip that snaps to the day.
// The same numbers are in the table under it.

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function DailyChart({ data, label }: { data: { day: string; value: number | null }[]; label: string }) {
  const fmtDay = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return (
    <div className="h-64 w-full" role="img" aria-label={`${label} per day, from ${data[0]?.day} to ${data[data.length - 1]?.day}. The values are in the table below.`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeWidth={1} />
          <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} minTickGap={24} />
          <YAxis allowDecimals={false} width={48} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString('en-GB')} />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { day: string; value: number | null };
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm">
                  <div className="font-semibold tabular-nums">{p.value === null ? 'No rollup' : p.value.toLocaleString('en-GB')}</div>
                  <div className="text-muted-foreground">
                    {label}, {fmtDay(p.day)}
                  </div>
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={{ r: 4, stroke: 'hsl(var(--background))', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
