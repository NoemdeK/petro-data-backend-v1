import { Module } from '@nestjs/common';
import { DataEntryController } from './data-entry.controller';
import { DataEntryService } from './data-entry.service';
import { AuthRepository } from '../auth/auth.repository';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schema/user.schema';
import {
  PasswordReset,
  PasswordResetSchema,
} from 'src/schema/passwordReset.schema';
import { DataEntryRepository } from './data-entry.repository';
import { DataEntryUtility } from './data-entry.utility';
import { DataEntry, DataEntrySchema } from '../schema/data-entry.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: DataEntry.name, schema: DataEntrySchema },
      { name: User.name, schema: UserSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },
    ]),
  ],
  controllers: [DataEntryController],
  providers: [
    DataEntryService,
    AuthRepository,
    DataEntryRepository,
    DataEntryUtility,
  ],
})
export class DataEntryModule {}