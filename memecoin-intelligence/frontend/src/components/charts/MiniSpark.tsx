"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export function MiniSpark({ values }: { values: number[] }) {
  if (!values.length) {
    return <div className="skeleton h-10 w-24" />;
  }
  const data = values.map((v, i) => ({ i, v }));
  const up = values[values.length - 1] >= values[0];
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Line type="monotone" dataKey="v" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
