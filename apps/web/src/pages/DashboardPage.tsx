import { useMemo, useState } from "react";
import { COMMODITIES } from "@farmeriq/shared";
import { canAccessDrivers, canAccessOfftakers } from "../auth";
import { CropChart } from "../components/dashboard/CropChart";
import { DistrictChart } from "../components/dashboard/DistrictChart";
import { KpiCards } from "../components/dashboard/KpiCards";
import { RegionChart } from "../components/dashboard/RegionChart";
import { SelectField } from "../components/fields/SelectField";
import { useFarmerStats, useRequireAuth } from "../hooks/useFarmers";
import { useAllAggregators } from "../hooks/useAggregators";
import { useAllOfftakers } from "../hooks/useOfftakers";
import { useDrivers } from "../hooks/useDrivers";
import { useEvents } from "../hooks/useEvents";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";

export function DashboardPage() {
  const user = useRequireAuth();
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);
  const [commodityFilter, setCommodityFilter] = useState<string>("all");
  const activeCommodity = selectedCommodity ?? (commodityFilter === "all" ? null : commodityFilter);
  const { stats } = useFarmerStats(activeCommodity);
  const { aggregators } = useAllAggregators();
  const { offtakers } = useAllOfftakers();
  const { summary: driverSummary } = useDrivers(1, 1);
  const { events } = useEvents();
  const { pendingFarmers, pendingAggregators, pendingOfftakers, pendingEvents } = useOfflineSyncContext();

  const totalFarmers = stats.totalRegistered + (pendingFarmers?.length ?? 0);
  const totalAggregators = aggregators.length + (pendingAggregators?.length ?? 0);
  const totalOfftakers = offtakers.length + (pendingOfftakers?.length ?? 0);
  const totalEvents = events.length + (pendingEvents?.length ?? 0);
  const totalDrivers = driverSummary.total_all;

  const commodityOptions = useMemo(() => {
    const names = new Set<string>(COMMODITIES);
    for (const b of stats.by_commodity) {
      if (b.label) names.add(b.label);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [stats.by_commodity]);

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Overview</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Registry insights for your field office
          </p>
        </div>
      </div>

      <KpiCards
        totalFarmers={totalFarmers}
        totalAggregators={totalAggregators}
        totalOfftakers={totalOfftakers}
        totalEvents={totalEvents}
        totalDrivers={totalDrivers}
        showOfftakers={canAccessOfftakers(user)}
        showDrivers={canAccessDrivers(user)}
      />

      <div className="dashboard-grid dashboard-grid--2">
        <section className="card card--chart">
          <h3 className="card-title">Commodity distribution</h3>
          <p className="card-desc">Share of registered farmers by commodity grown</p>
          <CropChart
            data={stats.by_commodity}
            selectedCommodity={selectedCommodity}
            onSelectCommodity={setSelectedCommodity}
          />
          {selectedCommodity && (
            <button type="button" className="link-btn" onClick={() => setSelectedCommodity(null)}>
              Clear commodity filter
            </button>
          )}
        </section>

        <section className="card card--chart">
          <div className="card-title-row">
            <div>
              <h3 className="card-title">Farmers by district</h3>
              <p className="card-desc">Geographic spread of registrations</p>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: "160px" }}>
              <label htmlFor="commodity-filter" className="sr-only">
                Filter by commodity
              </label>
              <SelectField
                id="commodity-filter"
                variant="compact"
                value={commodityFilter}
                onChange={setCommodityFilter}
                options={[
                  { value: "all", label: "All commodities" },
                  ...commodityOptions.map((c) => ({ value: c, label: c })),
                  { value: "Not specified", label: "Not specified" },
                ]}
              />
            </div>
          </div>
          <DistrictChart data={stats.by_district} />
        </section>
      </div>

      <section className="card card--chart">
        <h3 className="card-title">Farmers by region</h3>
        <p className="card-desc">Regional coverage across Ghana</p>
        <RegionChart data={stats.by_region} />
      </section>
    </main>
  );
}
