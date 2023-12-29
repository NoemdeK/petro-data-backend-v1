export class CreatePetroDataDto {
  readonly state: string;
  readonly period: string;
  readonly products: Products;
  readonly region: string;
  userId: string;
  readonly photoUrl: string;
}

export class Products {
  PMS: ProductPriceSource;
  AGO: ProductPriceSource;
  DPK: ProductPriceSource;
  LPG: ProductPriceSource;
  ICE: ProductPriceSource;
}

class ProductPriceSource {
  nnpc: number;
  total: number;
  private: number;
}
