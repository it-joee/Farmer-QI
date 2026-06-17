import type { StatBucket } from "@farmeriq/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "../../lib/dashboard-stats";

interface DistrictChartProps {
  data: StatBucket[];
}

export function DistrictChart({ data }: DistrictChartProps) {
  const top = data.slice(0, 12);

  if (top.length === 0) {
    return <div className="chart-wrap chart-wrap--empty" />;
  }

  const chartData = top.map((d) => ({
    name: d.label,
    farmers: d.count,
    percentage: d.percentage,
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ebe8" />
          <XAxis type="number" allowDecimals={false} tick={{ fill: "#757575", fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: "#757575" }} />
          <Tooltip
            formatter={(value, _name, item) => {
              const count = Number(value ?? 0);
              const pct = (item?.payload as { percentage?: number })?.percentage ?? 0;
              return [`${count} farmers (${pct}%)`, "Registered"];
            }}
          />
          <Bar dataKey="farmers" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
