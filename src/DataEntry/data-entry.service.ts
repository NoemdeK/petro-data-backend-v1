import { Injectable } from '@nestjs/common';
import { UploadDataEntryDto } from './dto/upload-date-entry.dto';
import { AppResponse } from 'src/common/app.response';
import { AuthRepository } from 'src/auth/auth.repository';

@Injectable()
export class DataEntryService {
  constructor(private readonly authRepository: AuthRepository) {}

  /**
   * @Responsibility: dedicated service for date entry upload
   *
   * @param uploadDataEntryDto
   * @returns {Promise<any>}
   */

  async uploadDataEntry(uploadDataEntryDto: UploadDataEntryDto): Promise<any> {
    try {
      const {
        fillingStation,
        state,
        product,
        price,
        priceDate,
        supportingDocument,
        userId,
      } = uploadDataEntryDto;

      /* Check if user exists */
      const userExists = await this.authRepository.findUser({ _id: userId });
    } catch (error) {
      error.location = `DataEntryServices.${this.uploadDataEntry.name} method`;
      AppResponse.error(error);
    }
  }
}
