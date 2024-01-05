import { Module } from '@nestjs/common';
import { DataEntryController } from './date-entry.controller';
import { DataEntryService } from './data-entry.service';
import { AuthService } from 'src/auth/auth.service';
import { AuthRepository } from 'src/auth/auth.repository';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schema/user.schema';
import {
  PasswordReset,
  PasswordResetSchema,
} from 'src/schema/passwordReset.schema';
import { DataEntry, DataEntrySchema } from 'src/schema/dataEntry.schema';
import { DataEntryRepository } from './data-entry.repository';

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
  providers: [DataEntryService, AuthRepository, DataEntryRepository],
})
export class DataEntryModule {}
