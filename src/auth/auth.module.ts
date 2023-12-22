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
} from 'src/schema/passwordReset.schema';
import { EmailModule } from 'src/email/email.module';
import { FormidableGuard } from 'src/guards/formidable.guard';
import { PetroDataUtility } from 'src/petroData/petroData.utility';
import { PetroDataRepository } from 'src/petroData/petroData.repository';
import { PetroData, PetroDataSchema } from 'src/schema/petroData.schema';
import { MulterModule } from '@nestjs/platform-express';

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
