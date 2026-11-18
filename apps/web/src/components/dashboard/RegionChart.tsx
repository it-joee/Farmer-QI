import type { StatBucket } from "@farmeriq/shared";
import { GHANA_REGIONS } from "@farmeriq/shared";
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
        <BarChart data={chartData} margin={{ top: 20, right: 12, bottom: 48, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ebe8" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontWeight: 500, fill: "#0d3b29" }}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={70}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${val}%`}
            tick={{ fill: "#374151", fontSize: 12, fontWeight: 500 }}
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
              const pct = Number(value ?? 0);
              const count = (item?.payload as { farmers?: number })?.farmers ?? 0;
              return [`${count.toLocaleString()} farmers (${pct}%)`, "Registered"];
            }}
          />
          <Bar
            dataKey="percentage"
            fill="#00a067"
            radius={[6, 6, 0, 0]}
            barSize={22}
            background={{ fill: "#f4f6f5", radius: 6 }}
          >
            <LabelList
              dataKey="percentage"
              position="top"
              formatter={(v) => {
                const n = Number(v ?? 0);
                return n > 0 ? `${n}%` : "";
              }}
              style={{ fill: "#0d3b29", fontSize: 11, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
