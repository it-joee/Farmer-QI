import { useState } from "react";
import {
  BAG_UNITS,
  COMMODITIES,
  GHANA_REGIONS,
  OTHER_COMMODITY_OPTION,
  type Aggregator,
  type Driver,
  type Offtaker,
} from "@farmeriq/shared";
import { FormGroup } from "../../components/FormGroup";
import { PhotoCaptureField } from "../../components/PhotoCaptureField";
import { DateField } from "../../components/fields/DateField";
import { SelectField } from "../../components/fields/SelectField";
import type { FieldErrors } from "../../lib/form-validation";
import type { CapturedPhoto } from "../../lib/photos";
import type { WaybillFormData } from "./types";

interface StepWaybillRouteProps {
  form: WaybillFormData;
  errors?: FieldErrors;
  offtakers: Offtaker[];
  aggregators: Aggregator[];
  onChange: (field: keyof WaybillFormData, value: string) => void;
  onSelectOfftaker: (value: string) => void;
  onSelectAggregator: (value: string) => void;
}

export function StepWaybillRoute({
  form,
  errors,
  offtakers,
  aggregators,
  onChange,
  onSelectOfftaker,
  onSelectAggregator,
}: StepWaybillRouteProps) {
  const offtakerOptions = [
    { value: "", label: "Select buyer (optional)" },
    { value: "__custom__", label: "Add new buyer" },
    ...offtakers.map((o) => ({
      value: o.id,
      label: o.company_name,
    })),
    ...(form.offtaker_id && !offtakers.some((o) => o.id === form.offtaker_id)
      ? [{ value: form.offtaker_id, label: form.buyer_name || "Selected buyer" }]
      : []),
  ];

  const aggregatorOptions = [
    { value: "", label: "Select aggregator (optional)" },
    { value: "__direct__", label: "Direct Company Sourcing" },
    { value: "__custom__", label: "Other / Enter aggregator name manually" },
    ...aggregators.map((a) => ({
      value: a.id,
      label: a.business_name ? `${a.full_name} (${a.business_name})` : a.full_name,
    })),
    ...(form.aggregator_id && !aggregators.some((a) => a.id === form.aggregator_id)
      ? [{ value: form.aggregator_id, label: form.aggregator_name || "Selected aggregator" }]
      : []),
  ];

  const showCustomBuyerInput = form.buyer_selection === "__custom__";
  const showCustomAggregatorInput = form.aggregator_selection === "__custom__";

  return (
    <div className="form-grid">
      <FormGroup fieldId="waybill_number" label="Waybill number" error={errors?.waybill_number}>
        <input
          id="waybill_number"
          placeholder="e.g. JNI-WB-2026-001"
          value={form.waybill_number}
          onChange={(e) => onChange("waybill_number", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="issued_date" label="Date of waybill issuance" error={errors?.issued_date}>
        <DateField
          id="issued_date"
          value={form.issued_date}
          onChange={(value) => onChange("issued_date", value)}
          placeholder="Select issuance date"
          required
          invalid={Boolean(errors?.issued_date)}
        />
      </FormGroup>

      <FormGroup fieldId="status" label="Delivery status">
        <SelectField
          id="status"
          value={form.status}
          onChange={(value) => onChange("status", value)}
          options={[
            { value: "in_transit", label: "In Transit" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </FormGroup>

      <FormGroup
        fieldId="buyer_selection"
        label={
          <>
            Waybill to (Buyer) <span className="optional">(optional)</span>
          </>
        }
      >
        <SelectField
          id="buyer_selection"
          value={form.buyer_selection}
          onChange={onSelectOfftaker}
          placeholder="Select buyer (optional)"
          options={offtakerOptions}
        />
        {showCustomBuyerInput && (
          <div className="form-group form-group--nested">
            <label htmlFor="buyer_name" className="sr-only">
              Buyer company name
            </label>
            <input
              id="buyer_name"
              placeholder="Enter buyer / offtaker company name"
              value={form.buyer_name}
              onChange={(e) => onChange("buyer_name", e.target.value)}
            />
          </div>
        )}
      </FormGroup>

      <FormGroup
        fieldId="aggregator_selection"
        label={
          <>
            Aggregator name <span className="optional">(optional)</span>
          </>
        }
      >
        <SelectField
          id="aggregator_selection"
          value={form.aggregator_selection}
          onChange={onSelectAggregator}
          placeholder="Select aggregator (optional)"
          options={aggregatorOptions}
        />
        {showCustomAggregatorInput && (
          <div className="form-group form-group--nested">
            <label htmlFor="aggregator_name" className="sr-only">
              Aggregator name
            </label>
            <input
              id="aggregator_name"
              placeholder="Enter aggregator name"
              value={form.aggregator_name}
              onChange={(e) => onChange("aggregator_name", e.target.value)}
            />
          </div>
        )}
      </FormGroup>

      <FormGroup
        fieldId="loading_location"
        label={
          <>
            Place of loading (Origin) <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="loading_location"
          placeholder="e.g. Wa, Tamale, Techiman"
          value={form.loading_location}
          onChange={(e) => onChange("loading_location", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="loading_region"
        label={
          <>
            Loading region <span className="optional">(optional)</span>
          </>
        }
      >
        <SelectField
          id="loading_region"
          value={form.loading_region}
          onChange={(value) => onChange("loading_region", value)}
          placeholder="Select region"
          options={[
            { value: "", label: "Select region" },
            ...GHANA_REGIONS.map((region) => ({ value: region, label: region })),
          ]}
        />
      </FormGroup>

      <FormGroup
        fieldId="discharge_location"
        label={
          <>
            Place of discharge (Destination) <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="discharge_location"
          placeholder="e.g. Tema Port Warehouse, Kumasi"
          value={form.discharge_location}
          onChange={(e) => onChange("discharge_location", e.target.value)}
        />
      </FormGroup>
    </div>
  );
}

interface StepWaybillCommodityProps {
  form: WaybillFormData;
  errors?: FieldErrors;
  onChange: (field: keyof WaybillFormData, value: string) => void;
  onWeightKgChange: (kg: string) => void;
  onWeightTonsChange: (tons: string) => void;
}

export function StepWaybillCommodity({
  form,
  errors,
  onChange,
  onWeightKgChange,
  onWeightTonsChange,
}: StepWaybillCommodityProps) {
  const standardList = new Set<string>(COMMODITIES);
  const hasCustomProduct =
    Boolean(form.product_name.trim()) && !standardList.has(form.product_name.trim());
  const [otherSelected, setOtherSelected] = useState(hasCustomProduct);
  const showOtherInput = otherSelected || hasCustomProduct;

  const bagUnitOptions = [
    ...BAG_UNITS.map((unit) => ({ value: unit, label: unit })),
    ...(form.bag_unit && !BAG_UNITS.includes(form.bag_unit as (typeof BAG_UNITS)[number])
      ? [{ value: form.bag_unit, label: form.bag_unit }]
      : []),
  ];

  const loadingKgNum = form.weight_kg.trim() ? Number(form.weight_kg) : NaN;
  const receivedKgNum = form.received_weight_kg.trim() ? Number(form.received_weight_kg) : NaN;

  let receivedHint: string | undefined =
    "Optional discharge weight recorded at the buyer's weighbridge.";
  if (!Number.isNaN(receivedKgNum) && receivedKgNum >= 0) {
    const receivedMt = (receivedKgNum / 1000).toFixed(3);
    if (!Number.isNaN(loadingKgNum) && loadingKgNum > 0) {
      const diffKg = receivedKgNum - loadingKgNum;
      const sign = diffKg > 0 ? "+" : "";
      receivedHint = `= ${receivedMt} MT · Variance vs loading: ${sign}${diffKg.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      })} kg`;
    } else {
      receivedHint = `= ${receivedMt} Metric Tons (MT)`;
    }
  }

  return (
    <div className="form-grid">
      <FormGroup
        fieldId="product_name"
        label={
          <>
            Product / Commodity name <span className="optional">(optional)</span>
          </>
        }
        labelFor={null}
        className="form-group--full"
      >
        <div className="commodity-chips">
          <div className="commodity-chips__list" role="group" aria-label="Product name">
            {COMMODITIES.map((commodity) => {
              const isSelected = !otherSelected && form.product_name === commodity;
              return (
                <button
                  key={commodity}
                  type="button"
                  className={`commodity-chip${isSelected ? " commodity-chip--selected" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setOtherSelected(false);
                    onChange("product_name", isSelected ? "" : commodity);
                  }}
                >
                  {commodity}
                </button>
              );
            })}
            <button
              type="button"
              className={`commodity-chip${showOtherInput ? " commodity-chip--selected" : ""}`}
              aria-pressed={showOtherInput}
              onClick={() => {
                if (showOtherInput) {
                  setOtherSelected(false);
                  if (!standardList.has(form.product_name.trim())) {
                    onChange("product_name", "");
                  }
                } else {
                  setOtherSelected(true);
                  if (standardList.has(form.product_name.trim())) {
                    onChange("product_name", "");
                  }
                }
              }}
            >
              {OTHER_COMMODITY_OPTION}
            </button>
          </div>
          {showOtherInput && (
            <div className="commodity-chips__other">
              <label htmlFor="product_name" className="sr-only">
                Custom product name
              </label>
              <input
                id="product_name"
                placeholder="e.g. Shea Nut, Soyabeans, Groundnut"
                value={form.product_name}
                onChange={(e) => onChange("product_name", e.target.value)}
              />
            </div>
          )}
        </div>
      </FormGroup>

      <FormGroup
        fieldId="product_description"
        label={
          <>
            Items / Product description <span className="optional">(optional)</span>
          </>
        }
        className="form-group--full"
      >
        <input
          id="product_description"
          placeholder="e.g. Dried Raw Shea Nuts in 80kg Jute Bags"
          value={form.product_description}
          onChange={(e) => onChange("product_description", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="bag_count"
        label={
          <>
            Quantity (Number of bags) <span className="optional">(optional)</span>
          </>
        }
        error={errors?.bag_count}
      >
        <input
          id="bag_count"
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 625"
          value={form.bag_count}
          onChange={(e) => onChange("bag_count", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="bag_unit"
        label={
          <>
            Packaging type <span className="optional">(optional)</span>
          </>
        }
      >
        <SelectField
          id="bag_unit"
          value={form.bag_unit}
          onChange={(value) => onChange("bag_unit", value)}
          options={bagUnitOptions}
        />
      </FormGroup>

      <FormGroup
        fieldId="weight_kg"
        label="Weight (kg)"
        hint={
          !Number.isNaN(loadingKgNum) && loadingKgNum > 0
            ? `= ${(loadingKgNum / 1000).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 3,
              })} Metric Tons (MT)`
            : "Entering kg automatically calculates Metric Tons (MT)."
        }
        error={errors?.weight_kg}
      >
        <input
          id="weight_kg"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 50000"
          value={form.weight_kg}
          onChange={(e) => onWeightKgChange(e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="weight_tons"
        label={
          <>
            Weight (Metric Tons / MT) <span className="optional">(auto)</span>
          </>
        }
        hint="Auto-calculated from Weight (kg)."
      >
        <input
          id="weight_tons"
          type="number"
          value={form.weight_tons}
          disabled
          readOnly
          placeholder="0.00"
          style={{ opacity: 0.75, cursor: "not-allowed" }}
        />
      </FormGroup>

      <FormGroup
        fieldId="received_weight_kg"
        label={
          <>
            Received / Offtaker weighbridge weight (kg) <span className="optional">(optional)</span>
          </>
        }
        hint={receivedHint}
        className="form-group--full"
      >
        <input
          id="received_weight_kg"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 49850"
          value={form.received_weight_kg}
          onChange={(e) => onChange("received_weight_kg", e.target.value)}
        />
      </FormGroup>
    </div>
  );
}

interface StepWaybillTransportProps {
  form: WaybillFormData;
  errors?: FieldErrors;
  drivers: Driver[];
  truckPhotos: CapturedPhoto[];
  docPhotos: CapturedPhoto[];
  onChange: (field: keyof WaybillFormData, value: string) => void;
  onSelectDriver: (driverId: string) => void;
  onTruckPhotosChange: (photos: CapturedPhoto[]) => void;
  onDocPhotosChange: (photos: CapturedPhoto[]) => void;
}

export function StepWaybillTransport({
  form,
  errors,
  drivers,
  truckPhotos,
  docPhotos,
  onChange,
  onSelectDriver,
  onTruckPhotosChange,
  onDocPhotosChange,
}: StepWaybillTransportProps) {
  const driverOptions = [
    { value: "", label: "Add new driver" },
    ...drivers.map((d) => ({
      value: d.id,
      label: d.vehicle_plate ? `${d.full_name} (${d.vehicle_plate})` : d.full_name,
    })),
    ...(form.driver_id && !drivers.some((d) => d.id === form.driver_id)
      ? [{ value: form.driver_id, label: form.driver_name || "Selected driver" }]
      : []),
  ];

  return (
    <div className="form-grid">
      <FormGroup
        fieldId="driver_selection"
        label={
          <>
            Select registered driver <span className="optional">(optional)</span>
          </>
        }
        hint="Choose from the list of our registered drivers, or select Add new driver."
      >
        <SelectField
          id="driver_selection"
          value={form.driver_selection}
          onChange={onSelectDriver}
          placeholder="Add new driver"
          options={driverOptions}
        />
      </FormGroup>

      <FormGroup
        fieldId="driver_name"
        label={
          <>
            Driver's name <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="driver_name"
          placeholder="e.g. Ibrahim Musa"
          value={form.driver_name}
          onChange={(e) => onChange("driver_name", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="driver_phone"
        label={
          <>
            Driver's contact <span className="optional">(optional)</span>
          </>
        }
      >
        <input
          id="driver_phone"
          type="tel"
          placeholder="e.g. 0240000000"
          value={form.driver_phone}
          onChange={(e) => onChange("driver_phone", e.target.value)}
        />
      </FormGroup>

      <FormGroup fieldId="truck_number" label="Truck number" error={errors?.truck_number}>
        <input
          id="truck_number"
          placeholder="e.g. GR-2451-24"
          value={form.truck_number}
          onChange={(e) => onChange("truck_number", e.target.value)}
        />
      </FormGroup>

      <FormGroup
        fieldId="notes"
        label={
          <>
            Notes / Remarks <span className="optional">(optional)</span>
          </>
        }
        className="form-group--full"
      >
        <textarea
          id="notes"
          rows={3}
          placeholder="Any dispatch notes, moisture notes, seal numbers, or delivery remarks…"
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
        />
      </FormGroup>

      <div className="photo-fields-row">
        <PhotoCaptureField
          label="Truck photos"
          hint="Take or upload photos of the loaded truck or plate number (optional)."
          photos={truckPhotos}
          onChange={onTruckPhotosChange}
          multiple
          maxPhotos={4}
        />

        <PhotoCaptureField
          label="Waybill / Weighbridge files"
          hint="Upload images or PDF copies of the signed waybill or weighbridge ticket (optional)."
          photos={docPhotos}
          onChange={onDocPhotosChange}
          multiple
          maxPhotos={4}
          allowPdf
        />
      </div>
    </div>
  );
}
