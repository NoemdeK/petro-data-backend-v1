import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PetroData, PetroDataDocument } from 'src/schema/petroData.schema';
import { Model } from 'mongoose';
import { CreateXlsxDto } from './dto/create-xlsx.dto';
import { ProductType } from './enum/utils/enum.util';
import { PropDataInput } from 'src/common/utils/util.interface';
import * as moment from 'moment';
import {
  PetroDataPhoto,
  PetroDataPhotoDocument,
} from 'src/schema/petroDataPhoto.schema';

@Injectable()
export class PetroDataRepository {
  constructor(
    @InjectModel(PetroData.name)
    private petroDataModel: Model<PetroDataDocument>,
    @InjectModel(PetroDataPhoto.name)
    private petroDataPhotoModel: Model<PetroDataPhotoDocument>,
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
   * @Responsibility: Repo for creating petro data
   *
   * @param data
   *
   * @returns {any}
   */

  async createPhotoData(data: any): Promise<PetroDataPhotoDocument> {
    try {
      return await this.petroDataPhotoModel.create(data);
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving periodic petro data
   *
   * @param weekStartDate
   * @param weekEndDate
   *
   * @returns {any}
   */

  async retrievePeriodicPetroData(
    weekStartDate: string,
    weekEndDate: string,
  ): Promise<PetroDataDocument[]> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: moment(weekStartDate).toISOString(),
            $lt: moment(weekEndDate).toISOString(),
          },
        })
        .select('-_id State Day Year Month Period AGO PMS DPK LPG Region')
        .lean();
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for retrieving petro data
   *
   *
   * @returns {any}
   */

  async retrieveAllPetroData(): Promise<PetroDataDocument[]> {
    try {
      return await this.petroDataModel
        .find({})
        .select('-_id State Day Year Month Period AGO PMS DPK LPG Region')
        .lean();
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
  ): Promise<PetroDataDocument[]> {
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
   * @Responsibility: Repo for retrieving national petro data for AGO
   *
   * @param data
   *
   * @returns {any}
   */

  async getNationalPetroDataForAGO(
    formattedDate?: string,
    today?: string,
  ): Promise<PetroDataDocument[]> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
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
  ): Promise<PetroDataDocument[]> {
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
   * @Responsibility: Repo for retrieving national petro data for PMS
   *
   * @param data
   *
   * @returns {any}
   */

  async getNationalPetroDataForPMS(
    formattedDate?: string,
    today?: string,
  ): Promise<PetroDataDocument[]> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
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
  ): Promise<PetroDataDocument[]> {
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
   * @Responsibility: Repo for retrieving national petro data for DPK
   *
   * @param data
   *
   * @returns {any}
   */

  async getNationalPetroDataForDPK(
    formattedDate?: string,
    today?: string,
  ): Promise<PetroDataDocument[]> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
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
  ): Promise<PetroDataDocument[]> {
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
   * @Responsibility: Repo for retrieving national petro data for LPG
   *
   * @param data
   *
   * @returns {any}
   */

  async getNationalPetroDataForLPG(
    formattedDate?: string,
    today?: string,
  ): Promise<PetroDataDocument[]> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
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
  ): Promise<PetroDataDocument[]> {
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
   * @Responsibility: Repo for retrieving national petro data for ICE
   *
   * @param data
   *
   * @returns {any}
   */

  async getNationalPetroDataForICE(
    formattedDate?: string,
    today?: string,
  ): Promise<PetroDataDocument[]> {
    try {
      return await this.petroDataModel
        .find({
          Period: {
            $gte: formattedDate,
            $lt: today,
          },
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
  ): Promise<PetroDataDocument[]> {
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
          : product === ProductType.DPK
            ? await this.petroDataModel
                .find({ Region: regionIndex })
                .select('_id Period DPK Region')
                .lean()
            : product === ProductType.LPG
              ? await this.petroDataModel
                  .find({ Region: regionIndex })
                  .select('_id Period LPG Region')
                  .lean()
              : product === ProductType.ICE
                ? await this.petroDataModel
                    .find({ Region: regionIndex })
                    .select('_id Period ICE Region')
                    .lean()
                : [];
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

  async getNationalMaxPetroData(product: string): Promise<PetroDataDocument[]> {
    try {
      return product === ProductType.AGO
        ? await this.petroDataModel
            .find({})
            .select('_id Period AGO Region')
            .lean()
        : product === ProductType.PMS
          ? await this.petroDataModel
              .find({})
              .select('_id Period PMS Region')
              .lean()
          : product === ProductType.DPK
            ? await this.petroDataModel
                .find({})
                .select('_id Period DPK Region')
                .lean()
            : product === ProductType.LPG
              ? await this.petroDataModel
                  .find({})
                  .select('_id Period LPG Region')
                  .lean()
              : product === ProductType.ICE
                ? await this.petroDataModel
                    .find({})
                    .select('_id Period ICE Region')
                    .lean()
                : [];
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

  async getAllPrices(
    where?: PropDataInput,
    limit?: number,
  ): Promise<PetroDataDocument | any> {
    try {
      if (limit) {
        return await this.petroDataModel
          .find(where)
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
      }
      return await this.petroDataModel
        .find(where)
        .sort({ createdAt: 1 })
        .lean();
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for counting all petro data documents
   *
   * @param where
   * @returns {Promise<Number>}
   */

  async countDocuments(where: PropDataInput): Promise<Number> {
    return await this.petroDataModel.countDocuments(where);
  }

  /**
   * @Responsibility: Repo for aggregating date range
   *
   * @param batch
   *
   * @returns {any}
   */

  async aggregateDateRange(batch: number): Promise<PetroDataDocument[]> {
    try {
      return await this.petroDataModel.aggregate([
        {
          $sort: { Period: -1 }, // Sort by Period in descending order
        },

        {
          /* Group specs must include an _id */
          $group: {
            _id: null,
            minDate: { $last: '$Period' }, // Use $last to get the last document after sorting
            maxDate: { $first: '$Period' }, // Use $first to get the first document after sorting
          },
        },
        {
          $project: {
            _id: 0,
            startDate: { $toDate: '$minDate' },
            endDate: { $toDate: '$maxDate' },
          },
        },
        {
          $addFields: {
            endDate: { $add: ['$endDate', 1 * 24 * 60 * 60 * 1000] }, // Add one day to include the endDate in the results
          },
        },
        {
          $project: {
            startDate: 1,
            endDate: 1,
            weeks: {
              $range: [
                {
                  $floor: {
                    $divide: [
                      { $subtract: ['$startDate', '$startDate'] },
                      7 * 24 * 60 * 60 * 1000,
                    ],
                  },
                },
                {
                  $floor: {
                    $divide: [
                      { $subtract: ['$endDate', '$startDate'] },
                      7 * 24 * 60 * 60 * 1000,
                    ],
                  },
                },
                1,
              ],
            },
          },
        },
        {
          $unwind: '$weeks',
        },
        {
          $skip: (batch - 1) * 5, // pagination of 5 per batch
        },
        {
          $limit: 5,
        },
        {
          $project: {
            _id: 0,
            weekStartDate: {
              $subtract: [
                '$endDate',
                { $multiply: ['$weeks', 7 * 24 * 60 * 60 * 1000] },
              ],
            },
            weekEndDate: {
              $subtract: [
                '$endDate',
                {
                  $multiply: [
                    { $subtract: ['$weeks', 1] },
                    7 * 24 * 60 * 60 * 1000,
                  ],
                },
              ],
            },
          },
        },
      ]);
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo for aggregating total count of weeks
   *
   * @param
   *
   * @returns {any}
   */

  async aggregateTotalWeeks(): Promise<PetroDataDocument[] | any> {
    try {
      return await this.petroDataModel.aggregate([
        {
          /* Group specs must include an _id */
          $group: {
            _id: null,
            minDate: { $first: '$Period' }, // Use $first to get the first document after sorting
            maxDate: { $last: '$Period' }, // Use $last to get the last document after sorting
          },
        },
        {
          $project: {
            _id: 0,
            startDate: { $toDate: '$minDate' },
            endDate: { $toDate: '$maxDate' },
          },
        },
        {
          $project: {
            _id: 0,
            totalWeeks: {
              $ceil: {
                $divide: [
                  { $subtract: ['$endDate', '$startDate'] },
                  7 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
      ]);
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }
}
