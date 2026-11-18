import type { StatBucket } from "@farmeriq/shared";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getChartColor } from "../../lib/dashboard-stats";
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

  const chartData = data.map((d, i) => ({
    name: d.label,
    value: d.count,
    percentage: d.percentage,
    color: getChartColor(d.label, i),
  }));

  const totalCount = chartData.reduce((sum, item) => sum + item.value, 0);
  const activeItem = selectedCommodity
    ? chartData.find((d) => d.name === selectedCommodity)
    : null;

  return (
    <div className="crop-chart">
      <div className="crop-chart__donut">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={82}
              paddingAngle={2}
              onClick={(_, index) => {
                const label = chartData[index]?.name ?? null;
                onSelectCommodity(selectedCommodity === label ? null : label);
              }}
              style={{ cursor: "pointer", outline: "none" }}
            >
              {chartData.map((entry) => {
                const isSelected = selectedCommodity === entry.name;
                const isDimmed = selectedCommodity !== null && !isSelected;
                return (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    fillOpacity={isDimmed ? 0.3 : 1}
                    stroke={isSelected ? palette.text.primary : palette.neutral.surface}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e8ebe8",
                boxShadow: "0 4px 12px rgba(6, 36, 25, 0.08)",
                color: "#0d3b29",
              }}
              formatter={(value, _name, item) => {
                const count = Number(value ?? 0);
                const pct = (item?.payload as { percentage?: number })?.percentage ?? 0;
                return [`${count.toLocaleString()} farmers (${pct}%)`, item?.name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="crop-chart__center" aria-hidden="true">
          <span className="crop-chart__center-value">
            {(activeItem ? activeItem.value : totalCount).toLocaleString()}
          </span>
          <span className="crop-chart__center-label">
            {activeItem ? activeItem.name : "Total"}
          </span>
        </div>
      </div>

      <ul className="crop-chart__legend">
        {chartData.map((entry) => {
          const isSelected = selectedCommodity === entry.name;
          return (
            <li key={entry.name}>
              <button
                type="button"
                className={`crop-chart__legend-btn${isSelected ? " is-selected" : ""}`}
                onClick={() => onSelectCommodity(isSelected ? null : entry.name)}
              >
                <span className="crop-chart__dot" style={{ background: entry.color }} />
                <span className="crop-chart__name">{entry.name}</span>
                <span className="crop-chart__pct">{entry.percentage}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
