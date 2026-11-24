import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatedNumber } from "./AnimatedNumber";
import {
  DriverIcon,
  FarmerTractorIcon,
  NavIconAggregators,
  NavIconEvents,
  NavIconOfftakers,
} from "./KpiIcons";

interface KpiCardsProps {
  totalFarmers: number;
  totalAggregators: number;
  totalEvents: number;
  totalOfftakers?: number;
  totalDrivers?: number;
  showOfftakers?: boolean;
  showDrivers?: boolean;
}

export function KpiCards({
  totalFarmers,
  totalAggregators,
  totalEvents,
  totalOfftakers = 0,
  totalDrivers = 0,
  showOfftakers = true,
  showDrivers = true,
}: KpiCardsProps) {
  const cards: { label: string; value: number; to: string; icon: ReactNode; tone: string }[] = [
    { label: "Total farmers", value: totalFarmers, to: "/farmers", icon: <FarmerTractorIcon />, tone: "green" },
    { label: "Total aggregators", value: totalAggregators, to: "/aggregators", icon: <NavIconAggregators />, tone: "indigo" },
    ...(showOfftakers
      ? [{ label: "Total offtakers", value: totalOfftakers, to: "/offtakers", icon: <NavIconOfftakers />, tone: "sky" }]
      : []),
    { label: "Total events", value: totalEvents, to: "/events", icon: <NavIconEvents />, tone: "amber" },
    ...(showDrivers
      ? [{ label: "Total drivers", value: totalDrivers, to: "/drivers", icon: <DriverIcon />, tone: "rose" }]
      : []),
  ];

  return (
    <div className={`kpi-grid kpi-grid--${cards.length}`}>
      {cards.map((card) => (
        <Link key={card.label} to={card.to} className="kpi-card kpi-card--link">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={card.value} />
            </span>
            <span className={`kpi-card__icon kpi-card__icon--${card.tone}`} aria-hidden="true">
              {card.icon}
            </span>
          </div>
          <span className="kpi-card__label">{card.label}</span>
        </Link>
      ))}
    </div>
  );
}
