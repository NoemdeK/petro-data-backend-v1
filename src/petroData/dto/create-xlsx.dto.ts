export class CreateXlsxDto {
  readonly state: string;
  readonly day: number;
  readonly year: number;
  readonly month: number;
  readonly period: string;
  readonly AGO: number;
  readonly PMS: number;
  readonly DPK: number;
  readonly LPG: number;
  readonly ICE: number;
  readonly Region: string;
  file?: any;
}
