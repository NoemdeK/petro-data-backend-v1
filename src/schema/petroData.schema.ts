import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Moment } from 'moment';
import { Document } from 'mongoose';
import { Role } from 'src/common/interfaces/roles.interface';
import * as moment from 'moment';

export type PetroDataDocument = PetroData & Document;

@Schema()
export class PetroData {
  @Prop({ type: String, required: false })
  State: string;

  @Prop({ type: String, required: false })
  Day: string;

  @Prop({ type: Number, required: false })
  Year: number;

  @Prop({ type: Number, required: false })
  Month: number;

  @Prop({ type: String, required: false })
  Period: string;

  @Prop({ type: Number, required: false })
  AGO: number;

  @Prop({ type: Number, required: false })
  PMS: number;

  @Prop({ type: Number, required: false })
  DPK: number;

  @Prop({ type: Number, required: false })
  LPG: number;

  @Prop({ type: String, required: false })
  Region: string;

  @Prop({ default: () => moment().utc().toDate(), type: Date })
  createdAt: Moment;
}

export const PetroDataSchema = SchemaFactory.createForClass(PetroData);
