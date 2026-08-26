import { Link } from "react-router-dom";

interface KpiCardsProps {
  totalFarmers: number;
  totalAggregators: number;
  totalEvents: number;
  totalDrivers?: number;
}

export function KpiCards({
  totalFarmers,
  totalAggregators,
  totalEvents,
  totalDrivers = 0,
}: KpiCardsProps) {
  const cards = [
    { label: "Total farmers", value: totalFarmers, to: "/farmers" },
    { label: "Total aggregators", value: totalAggregators, to: "/aggregators" },
    { label: "Total events", value: totalEvents, to: "/events" },
    { label: "Total drivers", value: totalDrivers, to: "/drivers" },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => (
        <Link key={card.label} to={card.to} className="kpi-card kpi-card--link">
          <span className="kpi-card__value">{card.value}</span>
          <span className="kpi-card__label">{card.label}</span>
        </Link>
      ))}
    </div>
  );
}
