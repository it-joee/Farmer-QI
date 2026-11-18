import type { StatBucket } from "@farmeriq/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DistrictChartProps {
  data: StatBucket[];
}

export function DistrictChart({ data }: DistrictChartProps) {
  const top = data.slice(0, 10);

  if (top.length === 0) {
    return <div className="chart-wrap chart-wrap--empty" />;
  }

  const chartData = top.map((d) => ({
    name: d.label,
    farmers: d.count,
    percentage: d.percentage,
  }));

  const chartHeight = Math.max(260, top.length * 30);

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, left: 4, right: 44, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ebe8" />
          <XAxis
            type="number"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#374151", fontSize: 12, fontWeight: 500 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={124}
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fontWeight: 500, fill: "#0d3b29" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(0, 160, 103, 0.06)" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e8ebe8",
              boxShadow: "0 4px 12px rgba(6, 36, 25, 0.08)",
              color: "#0d3b29",
            }}
            formatter={(value, _name, item) => {
              const count = Number(value ?? 0);
              const pct = (item?.payload as { percentage?: number })?.percentage ?? 0;
              return [`${count.toLocaleString()} farmers (${pct}%)`, "Registered"];
            }}
          />
          <Bar dataKey="farmers" fill="#00a067" barSize={16} radius={[0, 6, 6, 0]} minPointSize={3}>
            <LabelList
              dataKey="farmers"
              position="right"
              formatter={(v) => Number(v ?? 0).toLocaleString()}
              style={{ fill: "#0d3b29", fontSize: 11, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
