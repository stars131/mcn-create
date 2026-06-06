"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TrendChartProps {
  data: Array<Record<string, string | number>>;
  height?: number;
}

export function TrendChart({ data, height = 220 }: TrendChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d8dee8" />
          <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={32} />
          <Tooltip />
          <Area type="monotone" dataKey="heat" stroke="#007481" fill="#d7f4f6" strokeWidth={2} />
          <Area type="monotone" dataKey="growth" stroke="#d97706" fill="#fff2cc" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
