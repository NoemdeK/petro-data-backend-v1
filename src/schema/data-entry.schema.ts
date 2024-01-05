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

  @Prop({ type: Date, required: true })
  priceDate: Date;

  @Prop({ type: String, required: true })
  supportingDocument: string;

  @Prop({ type: String, required: true, default: DataEntryStatus.PENDING })
  status: string;

  @Prop({ type: String, required: true })
  region: string;

  @Prop({ type: String, required: true })
  dataEntryUserId: string;

  @Prop({ type: String, required: false })
  dataEntryApproverId: string;

  @Prop({ type: String, required: false })
  approvedBy: string;

  @Prop({ type: String, required: false })
  rejectedBy: string;

  @Prop({ type: String, required: false })
  rejectionReason: string;

  @Prop({ type: Date, required: false })
  dateApproved: Date;

  @Prop({ type: Date, required: false })
  dateRejected: Date;

  @Prop({ default: () => moment().utc().toDate(), type: Date })
  createdAt: Moment;
}

export const DataEntrySchema = SchemaFactory.createForClass(DataEntry);
