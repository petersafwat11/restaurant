'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface KpiSparklineProps {
  points: { v: number }[];
  color: string;
}

export default function KpiSparkline({ points, color }: KpiSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
