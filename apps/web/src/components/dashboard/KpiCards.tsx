import type { DashboardOverview } from "@farmeriq/shared";

interface KpiCardsProps {
  totals: DashboardOverview["totals"];
}

export function KpiCards({ totals }: KpiCardsProps) {
  const cards = [
    { label: "Total farmers", value: totals.farmers },
    { label: "Registered this month", value: totals.this_month },
    { label: "Districts covered", value: totals.districts },
    { label: "Regions covered", value: totals.regions },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => (
        <div key={card.label} className="kpi-card">
          <span className="kpi-card__value">{card.value}</span>
          <span className="kpi-card__label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}
