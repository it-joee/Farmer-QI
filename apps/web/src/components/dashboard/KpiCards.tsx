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
    { label: "Total farmers", value: totalFarmers },
    { label: "Total aggregators", value: totalAggregators },
    { label: "Total events", value: totalEvents },
    { label: "Total drivers", value: totalDrivers },
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
