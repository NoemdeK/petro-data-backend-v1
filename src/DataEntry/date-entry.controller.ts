import { Controller } from '@nestjs/common';
import { AppResponse } from 'src/common/app.response';
import { DataEntryService } from './data-entry.service';

const { success } = AppResponse;
@Controller('auth')
export class DataEntryController {
  constructor(private readonly dataEntryService: DataEntryService) {}
}
