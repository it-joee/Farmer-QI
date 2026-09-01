import type { OfftakerFormData } from "../../pages/offtaker-form/types";
import type { GpsPin } from "@farmeriq/shared";
import type { FarmerFormData } from "../../pages/farmer-form/types";
import type { CapturedPhoto } from "../photos";

export type PendingStatus = "pending" | "syncing" | "failed";

export interface StoredPhoto {
  id: string;
  name: string;
  type: string;
  data: Blob;
}

export interface PendingFarmerRecord {
  localId: string;
  createdBy: string;
  createdAt: string;
  status: PendingStatus;
  lastError?: string;
  form: FarmerFormData;
  ghanaCardPhotos: StoredPhoto[];
  farmerPhoto: StoredPhoto | null;
  boundaryEnabled: boolean;
  boundaryPins: GpsPin[];
}

export interface SubmitFarmerInput {
  agentId: string;
  form: FarmerFormData;
  ghanaCardPhotos: CapturedPhoto[];
  farmerPhoto: CapturedPhoto | null;
  boundaryEnabled: boolean;
  boundaryPins: GpsPin[];
}

export interface SyncSummary {
  synced: number;
  failed: number;
}

export interface PendingEventAttendee {
  localId: string;
  serverId?: string;
  full_name: string;
  phone: string | null;
  community: string | null;
  gender: string | null;
  age: number | null;
}

export interface PendingEventRecord {
  localId: string;
  serverId?: string;
  createdBy: string;
  createdAt: string;
  status: PendingStatus;
  lastError?: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  community: string | null;
  district: string | null;
  mofa_officer: string | null;
  attendees: PendingEventAttendee[];
}

export interface SubmitEventInput {
  agentId: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  community?: string;
  district?: string;
  mofa_officer?: string;
}

export interface SubmitEventAttendeeInput {
  full_name: string;
  phone: string;
  community: string;
  gender: "male" | "female";
  age: number;
}

export interface PendingServerAttendeeAdd {
  id: string;
  eventId: string;
  full_name: string;
  phone: string | null;
  community: string | null;
  gender: string | null;
  age: number | null;
  markedBy: string;
  status: PendingStatus;
  lastError?: string;
  createdAt: string;
}

export interface FarmerIdMapping {
  localId: string;
  serverId: string;
}

export interface PendingAggregatorRecord {
  localId: string;
  createdBy: string;
  createdAt: string;
  status: PendingStatus;
  lastError?: string;
  form: import("../../pages/aggregator-form/types").AggregatorFormData;
  ghanaCardPhotos: StoredPhoto[];
  aggregatorPhoto: StoredPhoto | null;
}

export interface SubmitAggregatorInput {
  agentId: string;
  form: import("../../pages/aggregator-form/types").AggregatorFormData;
  ghanaCardPhotos: CapturedPhoto[];
  aggregatorPhoto: CapturedPhoto | null;
}

export interface AggregatorIdMapping {
  localId: string;
  serverId: string;
}

export interface PendingOfftakerRecord {
  localId: string;
  createdBy: string;
  form: OfftakerFormData;
  offtakerPhoto: StoredPhoto | null;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitOfftakerInput {
  agentId: string;
  form: OfftakerFormData;
}

export interface OfftakerIdMapping {
  localId: string;
  serverId: string;
}