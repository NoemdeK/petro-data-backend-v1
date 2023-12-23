import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PetroDataController } from './petroData.controller';
import { PetroDataService } from './petroData.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PetroData, PetroDataSchema } from 'src/schema/petroData.schema';
import { PetroDataRepository } from './petroData.repository';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { PetroDataUtility } from './petroData.utility';
import {
  PetroDataPhoto,
  PetroDataPhotoSchema,
} from 'src/schema/petroDataPhoto.schema';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: PetroData.name, schema: PetroDataSchema },
      { name: PetroDataPhoto.name, schema: PetroDataPhotoSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PetroDataController],
  providers: [PetroDataService, PetroDataRepository, PetroDataUtility],
})
export class PetroDataModule {}
