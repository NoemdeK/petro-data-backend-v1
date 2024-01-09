import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Moment } from 'moment';
import { Document } from 'mongoose';
import { Role } from 'src/common/interfaces/roles.interface';
import * as moment from 'moment';
import { UserStatus } from 'src/users/enum/utils/enum.util';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: false })
  password: string;

  @Prop({ type: String, required: false })
  pdaId: string;

  @Prop({ type: String, required: false })
  pdfaId: string;

  @Prop({ type: String, default: Role.RWX_USER })
  role: Role;

  @Prop({ type: String, default: UserStatus.PENDING })
  status: UserStatus;

  @Prop({
    default:
      'https://png.pngtree.com/png-clipart/20210915/ourmid/pngtree-user-avatar-placeholder-black-png-image_3918427.jpg',
  })
  avatar: string;

  @Prop({ type: Date })
  lastLoggedIn: Date;

  @Prop({ default: () => moment().utc().toDate(), type: Date })
  createdAt: Moment;
}

export const UserSchema = SchemaFactory.createForClass(User);
