import { HttpStatus, Injectable } from '@nestjs/common';
import { UploadDataEntryDto } from './dto/upload-date-entry.dto';
import { AppResponse } from 'src/common/app.response';
import { AuthRepository } from 'src/auth/auth.repository';
import { Role } from 'src/common/interfaces/roles.interface';
import { DataEntryRepository } from './data-entry.repository';
import { RetrieveDataEntry } from './dto/retrieve-data-entry.dto';
import { DataEntryStatus } from './enum/utils/enum.util';
import { DataEntryUtility } from './data-entry.utility';
import { nigeriaStates } from 'src/data/states-region';

@Injectable()
export class DataEntryService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly dataEntryRepository: DataEntryRepository,
    private readonly dataEntryUtility: DataEntryUtility,
  ) {}

  /**
   * @Responsibility: dedicated service for data entry upload
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
          /* Format the price date before storing it in the database */
          index.priceDate = this.dataEntryUtility.customDateFormat(
            new Date(index?.priceDate),
          );
          /* The region is automatically added based on the state provided by the client */
          index.region = nigeriaStates[index?.state];
          const modIndex = { ...index, dataEntryUserId: userId };
          return await this.dataEntryRepository.createDataEntry(modIndex);
        }),
      );

      return;
    } catch (error) {
      error.location = `DataEntryServices.${this.uploadDataEntry.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving data entry
   *
   * @param retrieveDataEntry
   * @returns {Promise<any>}
   */

  async retrieveDataEntry(retrieveDataEntry: RetrieveDataEntry): Promise<any> {
    try {
      const { flag, batch, search, filter, userId } = retrieveDataEntry;

      if (
        flag !== DataEntryStatus.PENDING &&
        flag !== DataEntryStatus.APPROVED &&
        flag !== DataEntryStatus.REJECTED
      ) {
        AppResponse.error({
          message: 'Invalid flag',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const { data, count } = await this.dataEntryRepository.retrieveDataEntry({
        batch,
        search,
        filter,
        flag,
      });

      const result = await Promise.all(
        Array.from(data, async (index: any) => {
          const [dateEntryUserInfo, dataEntryApproverInfo] = await Promise.all([
            this.authRepository.findUser({ _id: index?.dataEntryUserId }),
            this.authRepository.findUser({
              _id: index?.dataEntryApproverId,
            }),
          ]);

          return {
            entryId: index?._id,
            submittedBy: dateEntryUserInfo
              ? `${dateEntryUserInfo?.firstName?.trim()} ${dateEntryUserInfo?.lastName?.trim()}`
              : null,
            // Approved or Rejected By
            [index?.status === DataEntryStatus.APPROVED
              ? 'approvedBy'
              : index?.status === DataEntryStatus.REJECTED
                ? 'rejectedBy'
                : 'approvedBy']: dataEntryApproverInfo
              ? `${dataEntryApproverInfo?.firstName?.trim()} ${dataEntryApproverInfo?.lastName?.trim()}`
              : null,
            // Date Approved or Rejected
            [index?.status === DataEntryStatus.APPROVED
              ? 'dateApproved'
              : index?.status === DataEntryStatus.REJECTED
                ? 'dateRejected'
                : 'dateApproved']: index?.dateApproved
              ? index?.dateApproved
              : index?.dateRejected
                ? index?.dateRejected
                : null,
            status: index?.status,
            fillingStation: index?.fillingStation,
            state: index?.state,
            region: index?.region,
            product: index?.product,
            price: index?.price,
            dateSubmitted: this.dataEntryUtility.customDateFormat(
              new Date(index?.createdAt),
            ),
          };
        }),
      );
      return { result, count };
    } catch (error) {
      error.location = `DataEntryServices.${this.retrieveDataEntry.name} method`;
      AppResponse.error(error);
    }
  }
}
