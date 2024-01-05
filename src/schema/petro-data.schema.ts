import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Moment } from 'moment';
import { Document } from 'mongoose';
import { Role } from 'src/common/interfaces/roles.interface';
import * as moment from 'moment';

export type PetroDataDocument = PetroData & Document;

@Schema()
export class PetroData {
  @Prop({ type: String, required: true })
  State: string;

  // @Prop({ type: String, required: true })
  // Day: string;

  // @Prop({ type: Number, required: true })
  // Year: number;

  // @Prop({ type: String, required: true })
  // Month: string;

  @Prop({ type: String, required: true })
  Period: string;

  @Prop({ type: Number, required: true })
  AGO: number;

  @Prop({ type: Number, required: true })
  PMS: number;

  @Prop({ type: Number, required: true })
  DPK: number;

  @Prop({ type: Number, required: true })
  LPG: number;

  @Prop({ type: Number, required: true })
  ICE: number;

  @Prop({ type: String, required: true })
  Region: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ default: () => moment().utc().toDate(), type: Date })
  createdAt: Moment;
}

export const PetroDataSchema = SchemaFactory.createForClass(PetroData);
