export interface CoconutSubmission {
  id: string;
  farmerName: string;
  phone: string;
  aadhaar: string;
  agentName: string;
  /** Farmer active status (e.g. active/inactive) */
  activeStatus?: string;
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

  // ----- Land Information (Edit Farmer Information) -----
  /** own | Leased */
  landOwnership?: string;
  /** Agriculture | Forestry | Degraded Land | Agriculture fallow */
  landUseBeforePlantation?: string;
  /** Yes | No */
  treeClearanceBeforePlantation?: string;

  // ----- Site Preparation & General -----
  /** Yes | No */
  burningTreesForSitePreparation?: string;
  ageOfSaplingMonths?: number;
  landPattaSurveyNumber?: string;
  /** Plantation model / type */
  plantationModel?: string;
  sourceOfNursery?: string;

  // ----- Planting & Irrigation -----
  typeOfVariety?: string;
  sizeOfPit?: string;
  /** Borewell | Sprinkler | Drip & Irrigation | Canal */
  modeOfIrrigation?: string;
  /** Kharif crop name */
  kharifCrop?: string;
  kharifCropDurationDays?: number;
  /** Rabi crop name */
  rabiCrop?: string;
  rabiCropDurationDays?: number;

  // ----- Fertilizer Information (kg) -----
  nitrogenQtyKg?: number;
  phosphorousQtyKg?: number;
  potassiumQtyKg?: number;
  organicQtyKg?: number;
  otherQtyKg?: number;

  // ----- Cost Information -----
  costOfSeedlings?: number;
  fencingProppingShading?: number;
  landPreparation?: number;

  // ----- Expenses -----
  manureExpenses?: number;
  irrigationExpenses?: number;
  weedManagement?: number;
  plantProtection?: number;
  agricultureImplements?: number;
  manpowerExpenses?: number;
  annualFertilizers?: number;
  annualIrrigations?: number;
  annualManpower?: number;
}
