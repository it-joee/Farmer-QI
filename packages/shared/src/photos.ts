export type FarmerPhotoType = "ghana_card" | "portrait";

export interface FarmerPhoto {
  id: string;
  farmer_id: string;
  photo_type: FarmerPhotoType;
  file_name: string;
  url: string;
  created_at: string;
}
