import type { StatBucket } from "@farmeriq/shared";
import { GHANA_REGIONS } from "@farmeriq/shared";
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
import { getChartColor } from "../../lib/dashboard-stats";

interface RegionChartProps {
  data: StatBucket[];
}

export function RegionChart({ data }: RegionChartProps) {
  // Create a map of existing region data for easy lookup (casing and whitespace insensitive)
  const dataMap = new Map(data.map((d) => [d.label.toLowerCase().trim(), d]));

  // Build the list of all standard regions
  const chartData: Array<{ name: string; farmers: number; percentage: number }> = GHANA_REGIONS.map((region) => {
    const match = dataMap.get(region.toLowerCase().trim());
    return {
      name: region,
      farmers: match ? match.count : 0,
      percentage: match ? match.percentage : 0,
    };
  });

  // Also include "Not specified" if there is any unassigned data
  const notSpecifiedMatch = dataMap.get("not specified");
  if (notSpecifiedMatch && notSpecifiedMatch.count > 0) {
    chartData.push({
      name: "Not specified",
      farmers: notSpecifiedMatch.count,
      percentage: notSpecifiedMatch.percentage,
    });
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ebe8" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4b5563" }} angle={-35} textAnchor="end" interval={0} height={70} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(val) => `${val}%`}
            tick={{ fill: "#757575", fontSize: 12 }}
          />
          <Tooltip
            cursor={false}
            formatter={(value, _name, item) => {
              const pct = Number(value ?? 0);
              const count = (item?.payload as { farmers?: number })?.farmers ?? 0;
              return [`${count} farmers (${pct}%)`, "Registered"];
            }}
          />
          <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={entry.name} fill={getChartColor(entry.name, i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
