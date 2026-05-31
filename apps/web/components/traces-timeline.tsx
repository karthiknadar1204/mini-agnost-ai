'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

export function TracesTimeline({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="rounded-lg border bg-card px-2 py-3">
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)' }}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--popover-foreground)',
            }}
          />
          <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
