import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { COMMODITIES } from "@farmeriq/shared";
import { canRegisterFarmers } from "../auth";
import { CropChart } from "../components/dashboard/CropChart";
import { DistrictChart } from "../components/dashboard/DistrictChart";
import { KpiCards } from "../components/dashboard/KpiCards";
import { RegionChart } from "../components/dashboard/RegionChart";
import { SelectField } from "../components/fields/SelectField";
import { useFarmers, useRequireAuth } from "../hooks/useFarmers";
import {
  buildDashboardOverview,
  districtStatsForCommodity,
  getCommodityFilterOptions,
} from "../lib/dashboard-stats";

export function DashboardPage() {
  const user = useRequireAuth();
  const { farmers } = useFarmers();
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);
  const [commodityFilter, setCommodityFilter] = useState<string>("all");

  const overview = useMemo(() => buildDashboardOverview(farmers), [farmers]);
  const commodityOptions = useMemo(
    () => getCommodityFilterOptions(farmers, COMMODITIES),
    [farmers]
  );
  const districtData = useMemo(
    () => districtStatsForCommodity(farmers, selectedCommodity),
    [farmers, selectedCommodity]
  );

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Overview</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Registry insights for your field office
          </p>
        </div>
        {user && canRegisterFarmers(user) && (
          <Link to="/farmers/new" className="btn btn-primary">
            + Register Farmer
          </Link>
        )}
      </div>

      <KpiCards totals={overview.totals} />

      <div className="dashboard-grid dashboard-grid--2">
        <section className="card card--chart">
          <h3 className="card-title">Commodity distribution</h3>
          <p className="card-desc">Share of registered farmers by commodity grown</p>
          <CropChart
            data={overview.by_commodity}
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
                  { value: "Not specified", label: "Not specified" },
                  ...commodityOptions.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
          </div>
          <DistrictChart
            data={
              selectedCommodity
                ? districtData
                : districtStatsForCommodity(
                    farmers,
                    commodityFilter === "all" ? null : commodityFilter
                  )
            }
          />
        </section>
      </div>

      <section className="card card--chart">
        <h3 className="card-title">Farmers by region</h3>
        <p className="card-desc">Regional coverage across Ghana</p>
        <RegionChart data={overview.by_region} />
      </section>
    </main>
  );
}
