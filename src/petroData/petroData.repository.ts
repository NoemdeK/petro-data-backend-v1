import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PetroData, PetroDataDocument } from 'src/schema/petroData.schema';
import { Model } from 'mongoose';
import { CreateXlsxDto } from './dto/create-xlsx.dto';
import { ProductType } from './enum/utils/enum.util';
import { PropDataInput } from 'src/common/utils/util.interface';

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
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving periodic petro data for AGO
   *
   * @param data
   *
   * @returns {any}
   */

  async getPeriodicPetroDataForAGO(
    formattedDate?: string,
    today?: string,
    regionIndex?: string,
  ): Promise<PetroDataDocument | any> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
          Region: regionIndex,
        })
        .select('_id Period AGO Region')
        .lean();
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving periodic petro data for PMS
   *
   * @param data
   *
   * @returns {any}
   */

  async getPeriodicPetroDataForPMS(
    formattedDate?: string,
    today?: string,
    regionIndex?: string,
  ): Promise<PetroDataDocument | any> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
          Region: regionIndex,
        })
        .select('_id Period PMS Region')
        .lean();
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving periodic petro data for DPK
   *
   * @param data
   *
   * @returns {any}
   */

  async getPeriodicPetroDataForDPK(
    formattedDate?: string,
    today?: string,
    regionIndex?: string,
  ): Promise<PetroDataDocument | any> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
          Region: regionIndex,
        })
        .select('_id Period DPK Region')
        .lean();
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving periodic petro data for LPG
   *
   * @param data
   *
   * @returns {any}
   */

  async getPeriodicPetroDataForLPG(
    formattedDate?: string,
    today?: string,
    regionIndex?: string,
  ): Promise<PetroDataDocument | any> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
          Region: regionIndex,
        })
        .select('_id Period LPG Region')
        .lean();
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving periodic petro data for ICE
   *
   * @param data
   *
   * @returns {any}
   */

  async getPeriodicPetroDataForICE(
    formattedDate?: string,
    today?: string,
    regionIndex?: string,
  ): Promise<PetroDataDocument | any> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
          Region: regionIndex,
        })
        .select('_id Period ICE Region')
        .lean();
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving periodic petro data for AGO max
   *
   * @param data
   *
   * @returns {any}
   */

  async getMaxPetroData(
    regionIndex: string,
    product: string,
  ): Promise<PetroDataDocument | any> {
    try {
      return product === ProductType.AGO
        ? await this.petroDataModel
            .find({ Region: regionIndex })
            .select('_id Period AGO Region')
            .lean()
        : product === ProductType.PMS
          ? await this.petroDataModel
              .find({ Region: regionIndex })
              .select('_id Period PMS Region')
              .lean()
          : product === ProductType.PMS
            ? await this.petroDataModel
                .find({ Region: regionIndex })
                .select('_id Period DPK Region')
                .lean()
            : await this.petroDataModel
                .find({ Region: regionIndex })
                .select('_id Period LPG Region')
                .lean();
      // .limit(10);
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving periodic petro data prices
   *
   * @param data
   *
   * @returns {any}
   */

  async getAllPrices(limit?: number): Promise<PetroDataDocument | any> {
    try {
      if (limit) {
        return await this.petroDataModel
          .find()
          .sort({ createdAt: 1 })
          .limit(limit)
          .lean();
      }
      return await this.petroDataModel.find().sort({ createdAt: 1 }).lean();
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }
}
