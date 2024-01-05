import { HttpStatus, Injectable } from '@nestjs/common';
import { UploadDataEntryDto } from './dto/upload-date-entry.dto';
import { AppResponse } from 'src/common/app.response';
import { AuthRepository } from 'src/auth/auth.repository';
import { Role } from 'src/common/interfaces/roles.interface';
import { DataEntryRepository } from './data-entry.repository';

@Injectable()
export class DataEntryService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly dataEntryRepository: DataEntryRepository,
  ) {}

  /**
   * @Responsibility: dedicated service for date entry upload
   *
   * @param uploadDataEntryDto
   * @returns {Promise<any>}
   */

  async uploadDataEntry(uploadDataEntryDto: UploadDataEntryDto): Promise<any> {
    try {
      const { dataEntry, userId } = uploadDataEntryDto;

      /* Check if user exists */
      const theUser = await this.authRepository.findUser({ _id: userId });
      if (!theUser) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      /* Check the role of the user */
      /* Only admin and data entry users are allowed access to this service */
      if (
        theUser?.role !== Role.RWX_ADMIN &&
        theUser?.role !== Role.RWX_DATA_ENTRY_USER
      ) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.UNAUTHORIZED,
        });
      }

      await Promise.all(
        Array.from(dataEntry, async (index) => {
          const modIndex = { ...index, userId };
          return await this.dataEntryRepository.createDataEntry(modIndex);
        }),
      );

      return;
    } catch (error) {
      error.location = `DataEntryServices.${this.uploadDataEntry.name} method`;
      AppResponse.error(error);
    }
  }
}
