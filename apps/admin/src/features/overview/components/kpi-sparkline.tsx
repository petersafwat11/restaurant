'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface KpiSparklineProps {
  points: { v: number }[];
  color: string;
}

export default function KpiSparkline({ points, color }: KpiSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
