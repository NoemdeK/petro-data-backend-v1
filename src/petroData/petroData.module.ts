import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PetroDataController } from './petroData.controller';
import { PetroDataService } from './petroData.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PetroData, PetroDataSchema } from 'src/schema/petroData.schema';
import { PetroDataRepository } from './petroData.repository';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: PetroData.name, schema: PetroDataSchema },
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
  providers: [PetroDataService, PetroDataRepository],
})
export class PetroDataModule {}
