import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RetrieveDataEntry } from './dto/retrieve-data-entry.dto';
import { DataEntryStatus } from './enum/utils/enum.util';
import { DataEntryUtility } from './data-entry.utility';
import { DataEntry, DataEntryDocument } from '../schema/data-entry.schema';

@Injectable()
export class DataEntryRepository {
  constructor(
    @InjectModel(DataEntry.name)
    private dataEntryModel: Model<DataEntryDocument>,
    private readonly dataEntryUtility: DataEntryUtility,
  ) {}

  /**
   * @Responsibility: Repo for data entry creation
   *
   * @param data
   * @returns {Promise<DataEntryDocument>}
   */

  async createDataEntry(data: any): Promise<DataEntryDocument> {
    try {
      return await this.dataEntryModel.create(data);
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving a data entry
   *
   * @param data
   * @returns {Promise<DataEntryDocument>}
   */

  async retrieveDataEntry({
    batch,
    search,
    filter,
    flag,
  }: Partial<RetrieveDataEntry>): Promise<any> {
    try {
      let data,
        query =
          flag === DataEntryStatus.PENDING
            ? { status: DataEntryStatus.PENDING }
            : flag === DataEntryStatus.APPROVED
              ? { status: DataEntryStatus.APPROVED }
              : { status: DataEntryStatus.REJECTED };

      /* Searching functionality */
      if (search) {
        query['$or'] = [
          {
            fillingStation: new RegExp(search, 'i'),
          },
          {
            state: new RegExp(search, 'i'),
          },
          {
            region: new RegExp(search, 'i'),
          },
          {
            product: new RegExp(search, 'i'),
          },
        ];
      }

      /* Filter functionality */
      if (filter) {
      }

      data = batch
        ? await this.dataEntryModel
            .find(query)
            .lean()
            .sort({ createdAt: -1 })
            .skip(this.dataEntryUtility.paginationFunc(+batch, 10))
            .limit(10)
        : await this.dataEntryModel
            .find(query)
            .lean()
            .sort({ createdAt: -1 })
            .limit(10);
      const count = await this.dataEntryModel.countDocuments(query);
      return { data, count };
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }
}
