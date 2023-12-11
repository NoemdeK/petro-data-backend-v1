import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PetroDataController } from './petroData.controller';
import { PetroDataService } from './petroData.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PetroData, PetroDataSchema } from 'src/schema/petroData.schema';
import { PetroDataRepository } from './petroData.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PetroData.name, schema: PetroDataSchema },
    ]),
  ],
  controllers: [PetroDataController],
  providers: [PetroDataService, PetroDataRepository],
})
export class PetroDataModule {}
