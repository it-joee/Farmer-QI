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

interface RegionChartProps {
  data: StatBucket[];
}

export function RegionChart({ data }: RegionChartProps) {
  if (data.length === 0) {
    return <div className="chart-wrap chart-wrap--empty" />;
  }

  const chartData = data.map((d) => ({
    name: d.label,
    farmers: d.count,
    percentage: d.percentage,
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ebe8" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#757575" }} angle={-35} textAnchor="end" interval={0} height={70} />
          <YAxis allowDecimals={false} tick={{ fill: "#757575", fontSize: 12 }} />
          <Tooltip
            formatter={(value, _name, item) => {
              const count = Number(value ?? 0);
              const pct = (item?.payload as { percentage?: number })?.percentage ?? 0;
              return [`${count} farmers (${pct}%)`, "Registered"];
            }}
          />
          <Bar dataKey="farmers" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
