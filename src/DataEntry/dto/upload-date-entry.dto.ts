export class UploadDataEntryDto {
  userId: string;
  dataEntry: DataEntryDto[];
}

export class DataEntryDto {
  fillingStation: string;
  state: string;
  product: string;
  price: string;
  priceDate: string;
  supportingDocument: string;
  region?: string;
}
