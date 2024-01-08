import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { DataEntryRepository } from 'src/DataEntry/data-entry.repository';
import { DataEntry, DataEntrySchema } from 'src/schema/data-entry.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DataEntryUtility } from 'src/DataEntry/data-entry.utility';
import { PetroDataRepository } from 'src/petroData/petroData.repository';
import { PetroData, PetroDataSchema } from 'src/schema/petro-data.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DataEntry.name, schema: DataEntrySchema },
      { name: PetroData.name, schema: PetroDataSchema },
    ]),
  ],
  providers: [
    JobService,
    DataEntryRepository,
    DataEntryUtility,
    PetroDataRepository,
  ],
})
export class JobModule {}
