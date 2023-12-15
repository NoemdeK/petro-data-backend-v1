export class PetroDataAnalysisDto {
  product: string;
  regions: string[];
  period: string;
}

export class PetroDataAnalysisProjectionDto {
  page: string;
  flag: string;
}

export class RawDataActionsDto {
  weekStartDate: string;
  weekEndDate: string;
  flag: string;
}
