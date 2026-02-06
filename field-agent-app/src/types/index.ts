export type UserRole = "field_agent";

export type RecordStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "corrections_needed"
  | "verified"
  | "approved"
  | "rejected";

export interface FarmerRecord {
  id: string;
  farmerId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  phoneNumber: string;
  email?: string;
  nationalId: string;
  village: string;
  district: string;
  region: string;
  country: string;
  landSize: number;
  landUnit: "acres" | "hectares";
  cropTypes: string[];
  farmingType: "subsistence" | "commercial" | "mixed";
  documents: { id: string; name: string; type: string; url: string; uploadedAt: string; verified: boolean }[];
  signatureUrl?: string;
  signatureDate?: string;
  status: RecordStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  validationHistory: unknown[];
}

export interface DashboardStats {
  totalRecords: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  correctionsNeeded: number;
}
