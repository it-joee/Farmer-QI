import type {
  Aggregator,
  CreateWaybillRequest,
  Driver,
  Offtaker,
  Waybill,
  WaybillStatus,
} from "@farmeriq/shared";
import {
  formatNumericInput,
  stripNumericCommas,
  type FieldValidation,
} from "../../lib/form-validation";

export interface WaybillFormData {
  waybill_number: string;
  issued_date: string;
  status: WaybillStatus;
  buyer_selection: string;
  offtaker_id: string;
  buyer_name: string;
  aggregator_selection: string;
  aggregator_id: string;
  aggregator_name: string;
  loading_location: string;
  loading_region: string;
  discharge_location: string;
  product_name: string;
  product_description: string;
  bag_count: string;
  bag_unit: string;
  weight_kg: string;
  weight_tons: string;
  received_weight_kg: string;
  driver_selection: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  truck_number: string;
  notes: string;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createEmptyWaybillForm(): WaybillFormData {
  return {
    waybill_number: "",
    issued_date: getTodayIsoDate(),
    status: "in_transit",
    buyer_selection: "",
    offtaker_id: "",
    buyer_name: "",
    aggregator_selection: "",
    aggregator_id: "",
    aggregator_name: "",
    loading_location: "",
    loading_region: "",
    discharge_location: "",
    product_name: "",
    product_description: "",
    bag_count: "",
    bag_unit: "Bags",
    weight_kg: "",
    weight_tons: "",
    received_weight_kg: "",
    driver_selection: "",
    driver_id: "",
    driver_name: "",
    driver_phone: "",
    truck_number: "",
    notes: "",
  };
}

export const WAYBILL_FORM_STEPS = [
  { id: 1, title: "Waybill & Route" },
  { id: 2, title: "Product & Weight" },
  { id: 3, title: "Transport & Photos" },
] as const;

export function waybillToFormData(waybill: Waybill): WaybillFormData {
  const weightKg =
    waybill.weight_kg != null ? formatNumericInput(String(Number(waybill.weight_kg)), true) : "";
  const weightTons =
    waybill.weight_kg != null
      ? formatNumericInput(String(Number((Number(waybill.weight_kg) / 1000).toFixed(4))), true)
      : "";

  const buyerSelection = waybill.offtaker_id
    ? waybill.offtaker_id
    : waybill.buyer_name
      ? "__custom__"
      : "";

  const aggregatorSelection = waybill.aggregator_id
    ? waybill.aggregator_id
    : waybill.aggregator_name === "Direct Company Sourcing"
      ? "__direct__"
      : waybill.aggregator_name
        ? "__custom__"
        : "";

  return {
    waybill_number: waybill.waybill_number,
    issued_date: waybill.issued_date?.slice(0, 10) || getTodayIsoDate(),
    status: waybill.status ?? "in_transit",
    buyer_selection: buyerSelection,
    offtaker_id: waybill.offtaker_id ?? "",
    buyer_name: waybill.buyer_name ?? "",
    aggregator_selection: aggregatorSelection,
    aggregator_id: waybill.aggregator_id ?? "",
    aggregator_name: waybill.aggregator_name ?? "",
    loading_location: waybill.loading_location ?? "",
    loading_region: waybill.loading_region ?? "",
    discharge_location: waybill.discharge_location ?? "",
    product_name: waybill.product_name ?? "",
    product_description: waybill.product_description ?? "",
    bag_count: waybill.bag_count != null ? formatNumericInput(String(waybill.bag_count), false) : "",
    bag_unit: waybill.bag_unit || "Bags",
    weight_kg: weightKg,
    weight_tons: weightTons,
    received_weight_kg:
      waybill.received_weight_kg != null
        ? formatNumericInput(String(Number(waybill.received_weight_kg)), true)
        : "",
    driver_selection: waybill.driver_id ?? "",
    driver_id: waybill.driver_id ?? "",
    driver_name: waybill.driver_name ?? "",
    driver_phone: waybill.driver_phone ?? "",
    truck_number: waybill.truck_number ?? "",
    notes: waybill.notes ?? "",
  };
}

function parseOptionalInt(value: string): number | null {
  const trimmed = stripNumericCommas(value).trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) || n < 0 ? null : n;
}

function parseOptionalFloat(value: string): number | null {
  const trimmed = stripNumericCommas(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isNaN(n) || n < 0 ? null : n;
}

export function waybillFormToPayload(form: WaybillFormData): CreateWaybillRequest {
  return {
    waybill_number: form.waybill_number.trim(),
    issued_date: form.issued_date.trim(),
    status: form.status,
    offtaker_id: form.offtaker_id || null,
    buyer_name: form.buyer_name.trim() || null,
    aggregator_id: form.aggregator_id || null,
    aggregator_name: form.aggregator_name.trim() || null,
    loading_location: form.loading_location.trim() || null,
    loading_region: form.loading_region.trim() || null,
    discharge_location: form.discharge_location.trim() || null,
    product_name: form.product_name.trim() || null,
    product_description: form.product_description.trim() || null,
    bag_count: parseOptionalInt(form.bag_count),
    bag_unit: form.bag_unit.trim() || "Bags",
    weight_kg: parseOptionalFloat(form.weight_kg),
    received_weight_kg: parseOptionalFloat(form.received_weight_kg),
    driver_id: form.driver_id || null,
    driver_name: form.driver_name.trim() || null,
    driver_phone: form.driver_phone.trim() || null,
    truck_number: form.truck_number.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export function validateWaybillKeyFields(
  form: WaybillFormData,
  step?: number
): FieldValidation | null {
  if ((step === undefined || step === 1) && !form.waybill_number.trim()) {
    return { fieldId: "waybill_number", message: "Waybill number is required." };
  }
  if ((step === undefined || step === 1) && !form.issued_date.trim()) {
    return { fieldId: "issued_date", message: "Date of waybill issuance is required." };
  }
  if ((step === undefined || step === 1) && !form.buyer_selection) {
    return { fieldId: "buyer_selection", message: "Buyer / company is required." };
  }
  if (
    (step === undefined || step === 1) &&
    form.buyer_selection === "__custom__" &&
    !form.buyer_name.trim()
  ) {
    return { fieldId: "buyer_name", message: "Enter buyer / company name." };
  }
  if (step === undefined || step === 2) {
    if (!form.product_name.trim()) {
      return { fieldId: "product_name", message: "Product / Commodity name is required." };
    }
    const rawBagCount = stripNumericCommas(form.bag_count).trim();
    if (rawBagCount && (Number.isNaN(Number(rawBagCount)) || Number(rawBagCount) < 0)) {
      return { fieldId: "bag_count", message: "Quantity must be a valid non-negative number." };
    }
    const rawWeightKg = stripNumericCommas(form.weight_kg).trim();
    if (!rawWeightKg) {
      return { fieldId: "weight_kg", message: "Weight (kg) is required." };
    }
    if (Number.isNaN(Number(rawWeightKg)) || Number(rawWeightKg) < 0) {
      return { fieldId: "weight_kg", message: "Weight must be a valid non-negative number." };
    }
  }
  if ((step === undefined || step === 3) && !form.driver_name.trim()) {
    return { fieldId: "driver_name", message: "Driver's name is required." };
  }
  if ((step === undefined || step === 3) && !form.truck_number.trim()) {
    return { fieldId: "truck_number", message: "Truck number is required." };
  }
  return null;
}

export function validateAllWaybillRequiredFields(
  form: WaybillFormData
): { step: number; validation: FieldValidation } | null {
  for (const s of [1, 2, 3] as const) {
    const validation = validateWaybillKeyFields(form, s);
    if (validation) return { step: s, validation };
  }
  return null;
}

export function applyOfftakerSelection(
  prev: WaybillFormData,
  value: string,
  offtakers: Offtaker[]
): WaybillFormData {
  if (!value) {
    return { ...prev, buyer_selection: "", offtaker_id: "", buyer_name: "" };
  }
  if (value === "__custom__") {
    const wasRegistered = Boolean(prev.offtaker_id);
    return {
      ...prev,
      buyer_selection: "__custom__",
      offtaker_id: "",
      buyer_name: wasRegistered ? "" : prev.buyer_name,
    };
  }
  const match = offtakers.find((o) => o.id === value);
  return {
    ...prev,
    buyer_selection: value,
    offtaker_id: value,
    buyer_name: match?.company_name ?? prev.buyer_name,
    discharge_location:
      !prev.discharge_location.trim() && match?.delivery_location
        ? match.delivery_location
        : prev.discharge_location,
  };
}

export function applyAggregatorSelection(
  prev: WaybillFormData,
  value: string,
  aggregators: Aggregator[]
): WaybillFormData {
  if (!value) {
    return { ...prev, aggregator_selection: "", aggregator_id: "", aggregator_name: "" };
  }
  if (value === "__direct__") {
    return {
      ...prev,
      aggregator_selection: "__direct__",
      aggregator_id: "",
      aggregator_name: "Direct Company Sourcing",
    };
  }
  if (value === "__custom__") {
    const wasPreset = Boolean(prev.aggregator_id) || prev.aggregator_name === "Direct Company Sourcing";
    return {
      ...prev,
      aggregator_selection: "__custom__",
      aggregator_id: "",
      aggregator_name: wasPreset ? "" : prev.aggregator_name,
    };
  }
  const match = aggregators.find((a) => a.id === value);
  const displayName = match
    ? match.business_name
      ? `${match.full_name} (${match.business_name})`
      : match.full_name
    : prev.aggregator_name;
  return {
    ...prev,
    aggregator_selection: value,
    aggregator_id: value,
    aggregator_name: displayName,
    loading_location:
      !prev.loading_location.trim() && match?.town ? match.town : prev.loading_location,
  };
}

export function applyDriverSelection(
  prev: WaybillFormData,
  driverId: string,
  drivers: Driver[]
): WaybillFormData {
  if (!driverId) {
    return { ...prev, driver_selection: "", driver_id: "" };
  }
  const match = drivers.find((d) => d.id === driverId);
  if (!match) {
    return { ...prev, driver_selection: driverId, driver_id: driverId };
  }
  return {
    ...prev,
    driver_selection: driverId,
    driver_id: driverId,
    driver_name: match.full_name,
    driver_phone: match.phone ?? "",
    truck_number: match.vehicle_plate ?? "",
  };
}

export function applyWeightKgChange(prev: WaybillFormData, kg: string): WaybillFormData {
  const formattedKg = formatNumericInput(kg, true);
  const rawKg = stripNumericCommas(formattedKg).trim();
  if (!rawKg) {
    return { ...prev, weight_kg: formattedKg, weight_tons: "" };
  }
  const num = Number(rawKg);
  if (Number.isNaN(num) || num < 0) {
    return { ...prev, weight_kg: formattedKg };
  }
  return {
    ...prev,
    weight_kg: formattedKg,
    weight_tons: formatNumericInput(String(Number((num / 1000).toFixed(4))), true),
  };
}

export function applyWeightTonsChange(prev: WaybillFormData, tons: string): WaybillFormData {
  const formattedTons = formatNumericInput(tons, true);
  const rawTons = stripNumericCommas(formattedTons).trim();
  if (!rawTons) {
    return { ...prev, weight_tons: formattedTons, weight_kg: "" };
  }
  const num = Number(rawTons);
  if (Number.isNaN(num) || num < 0) {
    return { ...prev, weight_tons: formattedTons };
  }
  return {
    ...prev,
    weight_tons: formattedTons,
    weight_kg: formatNumericInput(String(Number((num * 1000).toFixed(2))), true),
  };
}

