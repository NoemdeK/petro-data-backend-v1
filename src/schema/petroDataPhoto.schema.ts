import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Moment } from 'moment';
import { Document } from 'mongoose';
import { Role } from 'src/common/interfaces/roles.interface';
import * as moment from 'moment';

export type PetroDataPhotoDocument = PetroDataPhoto & Document;

@Schema()
export class PetroDataPhoto {
  @Prop({ type: String, required: true })
  photoUrl: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ default: () => moment().utc().toDate(), type: Date })
  createdAt: Moment;
}

export const PetroDataPhotoSchema =
  SchemaFactory.createForClass(PetroDataPhoto);
