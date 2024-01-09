import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { DataEntryUtility } from 'src/DataEntry/data-entry.utility';
import { EmailModule } from 'src/email/email.module';
import { User, UserSchema } from 'src/schema/user.schema';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthRepository } from 'src/auth/auth.repository';
import {
  PasswordReset,
  PasswordResetSchema,
} from 'src/schema/password-reset.schema';
import { UserUtility } from './user.utility';

@Module({
  controllers: [UserController],
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },
    ]),
    EmailModule,
  ],
  providers: [UserService, DataEntryUtility, AuthRepository, UserUtility],
})
export class UserModule {}
