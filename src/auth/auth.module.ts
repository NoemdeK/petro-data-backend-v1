import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schema/user.schema';
import {
  PasswordReset,
  PasswordResetSchema,
} from 'src/schema/password-reset.schema';
import { EmailModule } from 'src/email/email.module';
import { PetroDataUtility } from 'src/petroData/petroData.utility';
import { PetroDataRepository } from 'src/petroData/petroData.repository';
import { PetroData, PetroDataSchema } from 'src/schema/petro-data.schema';
import {
  PetroDataPhoto,
  PetroDataPhotoSchema,
} from 'src/schema/petroDataPhoto.schema';

@Module({
  controllers: [AuthController],
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
      { name: PetroData.name, schema: PetroDataSchema },
      { name: PetroDataPhoto.name, schema: PetroDataPhotoSchema },
    ]),
    EmailModule,
  ],
  providers: [
    AuthService,
    AuthRepository,
    PetroDataUtility,
    PetroDataRepository,
  ],
})
export class AuthModule {}
