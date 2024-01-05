import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Moment } from 'moment';
import { Document } from 'mongoose';
import * as moment from 'moment';
import { DataEntryStatus } from 'src/DataEntry/enum/utils/enum.util';

export type DataEntryDocument = DataEntry & Document;

@Schema()
export class DataEntry {
  @Prop({ type: String, required: true })
  fillingStation: string;

  @Prop({ type: String, required: true })
  state: string;

  @Prop({ type: String, required: true })
  product: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String, required: true })
  priceDate: string;

  @Prop({ type: String, required: true })
  supportingDocument: string;

  @Prop({ type: String, required: true, default: DataEntryStatus.PENDING })
  status: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ default: () => moment().utc().toDate(), type: Date })
  createdAt: Moment;
}

export const DataEntrySchema = SchemaFactory.createForClass(DataEntry);
