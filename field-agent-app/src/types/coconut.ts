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
