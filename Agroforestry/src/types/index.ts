export type UserRole = 'field_agent' | 'data_validator' | 'verified_officer' | 'admin';

export type RecordStatus = 'draft' | 'submitted' | 'under_review' | 'corrections_needed' | 'verified' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface FarmerRecord {
  id: string;
  farmerId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phoneNumber: string;
  email?: string;
  nationalId: string;
  
  // Address
  village: string;
  district: string;
  region: string;
  country: string;
  
  // Land Details
  landSize: number;
  landUnit: 'acres' | 'hectares';
  cropTypes: string[];
  farmingType: 'subsistence' | 'commercial' | 'mixed';
  
  // Documents
  documents: Document[];
  
  // Signature
  signatureUrl?: string;
  signatureDate?: string;
  
  // Status & Workflow
  status: RecordStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Validation History
  validationHistory: ValidationEntry[];
  
  // Mirrored from coconut_submissions when record comes from Field Agent Coconut Registration
  blockTehsilMandal?: string;
  dateOfPlantation?: string;
  seedlingsPlanted?: number;
  seedlingsSurvived?: number;
  agentName?: string;
  totalAreaHectares?: number;
  areaUnderCoconutHectares?: number;
  landOwnership?: string;
  landUseBeforePlantation?: string;
  typeOfVariety?: string;
  plantationModel?: string;
  activeStatus?: string;
  spacing?: string;
  modeOfIrrigation?: string;
  numberOfPlots?: number;
}

export interface Document {
  id: string;
  name: string;
  type: 'national_id' | 'land_title' | 'photo' | 'other';
  url: string;
  uploadedAt: string;
  verified: boolean;
}

export interface ValidationEntry {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'correction_requested' | 'corrected';
  performedBy: string;
  performedByRole: UserRole;
  performedAt: string;
  comments?: string;
}

export interface DashboardStats {
  totalRecords: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  correctionsNeeded: number;
}

/** Biochar deployment record for tracking deployment location and area */
export interface BiocharDeployment {
  id: string;
  siteName: string;
  district: string;
  village?: string;
  deploymentDate: string;
  quantityTonnes?: number;
  areaAcres: number;
  /** Polygon vertices [lat, lng] for map display/edit */
  latlngs?: [number, number][];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Coconut plantation submission (registration) */
export interface CoconutSubmission {
  id: string;
  farmerName: string;
  phone: string;
  aadhaar: string;
  agentName: string;
  totalAreaHectares: number;
  areaUnderCoconutHectares: number;
  numberOfPlots: number;
  state: string;
  district: string;
  blockTehsilMandal: string;
  village: string;
  dateOfPlantation: string;
  spacing: string;
  seedlingsPlanted: number;
  seedlingsSurvived: number;
  plots: { plotNumber: number; areaAcres: number; latlngs?: [number, number][] }[];
  mappedAreaAcres?: number;
  location?: { lat: number; lng: number; accuracy?: number };
  createdAt: string;
  createdBy: string;
}

export interface CoconutPlantationStats {
  total_plantations: number;
  total_area_hectares: number;
  total_seedlings_planted: number;
  total_seedlings_survived: number;
}
