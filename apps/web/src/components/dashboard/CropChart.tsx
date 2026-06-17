import type { StatBucket } from "@farmeriq/shared";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "../../lib/dashboard-stats";
import { palette } from "../../theme/colors";

interface CropChartProps {
  data: StatBucket[];
  selectedCommodity: string | null;
  onSelectCommodity: (commodity: string | null) => void;
}

export function CropChart({ data, selectedCommodity, onSelectCommodity }: CropChartProps) {
  if (data.length === 0) {
    return <div className="chart-wrap chart-wrap--empty" />;
  }

  const chartData = data.map((d) => ({ name: d.label, value: d.count, percentage: d.percentage }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            onClick={(_, index) => {
              const label = chartData[index]?.name ?? null;
              onSelectCommodity(selectedCommodity === label ? null : label);
            }}
            style={{ cursor: "pointer" }}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                stroke={selectedCommodity === entry.name ? palette.text.primary : palette.neutral.surface}
                strokeWidth={selectedCommodity === entry.name ? 2 : 1}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const count = Number(value ?? 0);
              const pct = (item?.payload as { percentage?: number })?.percentage ?? 0;
              return [`${count} farmers (${pct}%)`, item?.name];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
