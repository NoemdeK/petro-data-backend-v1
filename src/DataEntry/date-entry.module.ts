import { Module } from '@nestjs/common';
import { DataEntryController } from './date-entry.controller';
import { DataEntryService } from './data-entry.service';

@Module({
  controllers: [DataEntryController],
  imports: [],
  providers: [DataEntryService],
})
export class DataEntryModule {}
