import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataEntry, DataEntryDocument } from 'src/schema/dataEntry.schema';

@Injectable()
export class DataEntryRepository {
  constructor(
    @InjectModel(DataEntry.name)
    private dataEntryModel: Model<DataEntryDocument>,
  ) {}

  /**
   * @Responsibility: Repo for creating a data entry
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
}
