import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PetroData, PetroDataDocument } from 'src/schema/petroData.schema';
import { Model } from 'mongoose';
import { CreateXlsxDto } from './dto/create-xlsx.dto';

@Injectable()
export class PetroDataRepository {
  constructor(
    @InjectModel(PetroData.name)
    private petroDataModel: Model<PetroDataDocument>,
  ) {}

  /**
   * @Responsibility: Repo for creating petro data
   *
   * @param data
   *
   * @returns {any}
   */

  async createPetroData(data: any): Promise<PetroDataDocument> {
    try {
      return await this.petroDataModel.create(data);
    } catch (error) {
      console.log('Repo Error****: ', error);
      throw new Error(error?.messsage);
    }
  }
}
