import { Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ProductType, Regions } from './enum/utils/enum.util';
import { PetroDataRepository } from './petroData.repository';

@Injectable()
export class PetroDataUtility {
  constructor(private readonly petroDataRepository: PetroDataRepository) {}

  /**
   * @Responsibility: fxn to calculate periodic dataset for products within date specified
   * @param date
   * @param product
   * @returns {*}
   */

  async getAnalysis(
    regions: string[],
    date: Date,
    product: string,
  ): Promise<Array<object>> {
    const formattedDate = moment(date).toISOString();
    const today = moment().toISOString();

    const analysis = await Promise.all(
      Array.from(regions, async (index: any) => {
        return product === ProductType.AGO
          ? await this.petroDataRepository.getPeriodicPetroDataForAGO(
              formattedDate,
              today,
              index,
            )
          : product === ProductType.PMS
            ? await this.petroDataRepository.getPeriodicPetroDataForPMS(
                formattedDate,
                today,
                index,
              )
            : product === ProductType.DPK
              ? await this.petroDataRepository.getPeriodicPetroDataForDPK(
                  formattedDate,
                  today,
                  index,
                )
              : product === ProductType.LPG
                ? await this.petroDataRepository.getPeriodicPetroDataForLPG(
                    formattedDate,
                    today,
                    index,
                  )
                : product === ProductType.LPG
                  ? await this.petroDataRepository.getPeriodicPetroDataForICE(
                      formattedDate,
                      today,
                      index,
                    )
                  : [];
      }),
    );
    return analysis.flat();
  }

  overallAndRecentPercentPriceCghFxn = (
    analysisData: Array<object | any>,
    productType: string,
  ) => {
    /* Get South East data */
    const SEData = analysisData.filter(
      (a: any) => a?.Region == Regions.SOUTH_EAST,
    );

    /* Get South West data */
    const SWData = analysisData.filter(
      (a: any) => a?.Region == Regions.SOUTH_WEST,
    );

    /* Get South South data */
    const SSData = analysisData.filter(
      (a: any) => a?.Region == Regions.SOUTH_SOUTH,
    );

    /* Get North East data */
    const NEData = analysisData.filter(
      (a: any) => a?.Region == Regions.NORTH_EAST,
    );

    /* Get North West data */
    const NWData = analysisData.filter(
      (a: any) => a?.Region == Regions.NORTH_WEST,
    );

    /* Get North Central data */
    const NCData = analysisData.filter(
      (a: any) => a?.Region == Regions.NORTH_CENTRAL,
    );

    /********************** Overall Price Change Calculation **********************/
    let SEResult: number;
    if (SEData.length) {
      for (let i = 1; i < SEData.length; i++) {
        // Old price for each product
        const oldPrice =
          productType === ProductType.AGO
            ? SEData[i - 1].AGO ?? 0
            : productType === ProductType.PMS
              ? SEData[i - 1].PMS ?? 0
              : productType === ProductType.DPK
                ? SEData[i - 1].DPK ?? 0
                : productType === ProductType.LPG
                  ? SEData[i - 1].LPG ?? 0
                  : productType === ProductType.ICE
                    ? SEData[i - 1].ICE ?? 0
                    : 0;

        // new price for each product
        const newPrice =
          productType === ProductType.AGO
            ? SEData[i].AGO ?? 0
            : productType === ProductType.PMS
              ? SEData[i].PMS ?? 0
              : productType === ProductType.DPK
                ? SEData[i].DPK ?? 0
                : productType === ProductType.LPG
                  ? SEData[i].LPG ?? 0
                  : productType === ProductType.ICE
                    ? SEData[i].ICE ?? 0
                    : 0;

        if (newPrice) {
          SEResult = ((oldPrice - newPrice) / oldPrice) * 100;
        }
      }
    } else {
      SEResult = 0;
    }

    let SWResult: number;
    if (SWData.length) {
      for (let i = 1; i < SWData.length; i++) {
        // Old price for each product
        const oldPrice =
          productType === ProductType.AGO
            ? SWData[i - 1].AGO ?? 0
            : productType === ProductType.PMS
              ? SWData[i - 1].PMS ?? 0
              : productType === ProductType.DPK
                ? SWData[i - 1].DPK ?? 0
                : productType === ProductType.LPG
                  ? SWData[i - 1].LPG ?? 0
                  : productType === ProductType.ICE
                    ? SWData[i - 1].ICE ?? 0
                    : 0;

        // new price for each product
        const newPrice =
          productType === ProductType.AGO
            ? SWData[i].AGO ?? 0
            : productType === ProductType.PMS
              ? SWData[i].PMS ?? 0
              : productType === ProductType.DPK
                ? SWData[i].DPK ?? 0
                : productType === ProductType.LPG
                  ? SWData[i].LPG ?? 0
                  : productType === ProductType.ICE
                    ? SWData[i].ICE ?? 0
                    : 0;

        if (newPrice) {
          SWResult = ((oldPrice - newPrice) / oldPrice) * 100;
        }
      }
    } else {
      SWResult = 0;
    }

    let SSResult: number;
    if (SSData.length) {
      for (let i = 1; i < SSData.length; i++) {
        // Old price for each product
        const oldPrice =
          productType === ProductType.AGO
            ? SSData[i - 1].AGO ?? 0
            : productType === ProductType.PMS
              ? SSData[i - 1].PMS ?? 0
              : productType === ProductType.DPK
                ? SSData[i - 1].DPK ?? 0
                : productType === ProductType.LPG
                  ? SSData[i - 1].LPG ?? 0
                  : productType === ProductType.ICE
                    ? SSData[i - 1].ICE ?? 0
                    : 0;

        // new price for each product
        const newPrice =
          productType === ProductType.AGO
            ? SSData[i].AGO ?? 0
            : productType === ProductType.PMS
              ? SSData[i].PMS ?? 0
              : productType === ProductType.DPK
                ? SSData[i].DPK ?? 0
                : productType === ProductType.LPG
                  ? SSData[i].LPG ?? 0
                  : productType === ProductType.ICE
                    ? SSData[i].ICE ?? 0
                    : 0;

        if (newPrice) {
          SSResult = ((oldPrice - newPrice) / oldPrice) * 100;
        }
      }
    } else {
      SSResult = 0;
    }

    let NEResult: number;
    if (NEData.length) {
      for (let i = 1; i < NEData.length; i++) {
        // Old price for each product
        const oldPrice =
          productType === ProductType.AGO
            ? NEData[i - 1].AGO ?? 0
            : productType === ProductType.PMS
              ? NEData[i - 1].PMS ?? 0
              : productType === ProductType.DPK
                ? NEData[i - 1].DPK ?? 0
                : productType === ProductType.LPG
                  ? NEData[i - 1].LPG ?? 0
                  : productType === ProductType.ICE
                    ? NEData[i - 1].ICE ?? 0
                    : 0;

        // new price for each product
        const newPrice =
          productType === ProductType.AGO
            ? NEData[i].AGO ?? 0
            : productType === ProductType.PMS
              ? NEData[i].PMS ?? 0
              : productType === ProductType.DPK
                ? NEData[i].DPK ?? 0
                : productType === ProductType.LPG
                  ? NEData[i].LPG ?? 0
                  : productType === ProductType.ICE
                    ? NEData[i].ICE ?? 0
                    : 0;

        if (newPrice) {
          NEResult = ((oldPrice - newPrice) / oldPrice) * 100;
        }
      }
    } else {
      NEResult = 0;
    }

    let NWResult: number;
    if (NWData.length) {
      for (let i = 1; i < NWData.length; i++) {
        // Old price for each product
        const oldPrice =
          productType === ProductType.AGO
            ? NWData[i - 1].AGO ?? 0
            : productType === ProductType.PMS
              ? NWData[i - 1].PMS ?? 0
              : productType === ProductType.DPK
                ? NWData[i - 1].DPK ?? 0
                : productType === ProductType.LPG
                  ? NWData[i - 1].LPG ?? 0
                  : productType === ProductType.ICE
                    ? NWData[i - 1].ICE ?? 0
                    : 0;

        // new price for each product
        const newPrice =
          productType === ProductType.AGO
            ? NWData[i].AGO ?? 0
            : productType === ProductType.PMS
              ? NWData[i].PMS ?? 0
              : productType === ProductType.DPK
                ? NWData[i].DPK ?? 0
                : productType === ProductType.LPG
                  ? NWData[i].LPG ?? 0
                  : productType === ProductType.ICE
                    ? NWData[i].ICE ?? 0
                    : 0;

        if (newPrice) {
          NWResult = ((oldPrice - newPrice) / oldPrice) * 100;
        }
      }
    } else {
      NWResult = 0;
    }

    let NCResult: number;
    if (NCData.length) {
      for (let i = 1; i < NCData.length; i++) {
        // Old price for each product
        const oldPrice =
          productType === ProductType.AGO
            ? NCData[i - 1].AGO ?? 0
            : productType === ProductType.PMS
              ? NCData[i - 1].PMS ?? 0
              : productType === ProductType.DPK
                ? NCData[i - 1].DPK ?? 0
                : productType === ProductType.LPG
                  ? NCData[i - 1].LPG ?? 0
                  : productType === ProductType.ICE
                    ? NCData[i - 1].ICE ?? 0
                    : 0;

        // new price for each product
        const newPrice =
          productType === ProductType.AGO
            ? NCData[i].AGO ?? 0
            : productType === ProductType.PMS
              ? NCData[i].PMS ?? 0
              : productType === ProductType.DPK
                ? NCData[i].DPK ?? 0
                : productType === ProductType.LPG
                  ? NCData[i].LPG ?? 0
                  : productType === ProductType.ICE
                    ? NCData[i].ICE ?? 0
                    : 0;

        if (newPrice) {
          NCResult = ((oldPrice - newPrice) / oldPrice) * 100;
        }
      }
    } else {
      NCResult = 0;
    }

    /* Result for overall periodic percentage price change */
    const overallPeriodicPriceChgPercent =
      (+SEResult +
        +SWResult +
        +SWResult +
        +SSResult +
        +NEResult +
        +NWResult +
        +NCResult) /
      6;

    /********************** Recent Price Change Calculation **********************/
    const recentPeriodicPriceChgPercent =
      productType === ProductType.AGO
        ? (SEData[0]?.AGO ?? 0) -
          (SEData[1]?.AGO ?? 0) +
          ((SWData[0]?.AGO ?? 0) - (SWData[1]?.AGO ?? 0)) +
          ((SSData[0]?.AGO ?? 0) - (SSData[1]?.AGO ?? 0)) +
          ((NEData[0]?.AGO ?? 0) - (NEData[1]?.AGO ?? 0)) +
          ((NWData[0]?.AGO ?? 0) - (NWData[1]?.AGO ?? 0)) +
          ((NCData[0]?.AGO ?? 0) - (NCData[1]?.AGO ?? 0))
        : productType === ProductType.PMS
          ? (SEData[0]?.PMS ?? 0) -
            (SEData[1]?.PMS ?? 0) +
            ((SWData[0]?.PMS ?? 0) - (SWData[1]?.PMS ?? 0)) +
            ((SSData[0]?.PMS ?? 0) - (SSData[1]?.PMS ?? 0)) +
            ((NEData[0]?.PMS ?? 0) - (NEData[1]?.PMS ?? 0)) +
            ((NWData[0]?.PMS ?? 0) - (NWData[1]?.PMS ?? 0)) +
            ((NCData[0]?.PMS ?? 0) - (NCData[1]?.PMS ?? 0))
          : productType === ProductType.DPK
            ? (SEData[0]?.DPK ?? 0) -
              (SEData[1]?.DPK ?? 0) +
              ((SWData[0]?.DPK ?? 0) - (SWData[1]?.DPK ?? 0)) +
              ((SSData[0]?.DPK ?? 0) - (SSData[1]?.DPK ?? 0)) +
              ((NEData[0]?.DPK ?? 0) - (NEData[1]?.DPK ?? 0)) +
              ((NWData[0]?.DPK ?? 0) - (NWData[1]?.DPK ?? 0)) +
              ((NCData[0]?.DPK ?? 0) - (NCData[1]?.DPK ?? 0))
            : productType === ProductType.LPG
              ? (SEData[0]?.LPG ?? 0) -
                (SEData[1]?.LPG ?? 0) +
                ((SWData[0]?.LPG ?? 0) - (SWData[1]?.LPG ?? 0)) +
                ((SSData[0]?.LPG ?? 0) - (SSData[1]?.LPG ?? 0)) +
                ((NEData[0]?.LPG ?? 0) - (NEData[1]?.LPG ?? 0)) +
                ((NWData[0]?.LPG ?? 0) - (NWData[1]?.LPG ?? 0)) +
                ((NCData[0]?.LPG ?? 0) - (NCData[1]?.LPG ?? 0))
              : (SEData[0]?.ICE ?? 0) -
                (SEData[1]?.ICE ?? 0) +
                ((SWData[0]?.ICE ?? 0) - (SWData[1]?.ICE ?? 0)) +
                ((SSData[0]?.ICE ?? 0) - (SSData[1]?.ICE ?? 0)) +
                ((NEData[0]?.ICE ?? 0) - (NEData[1]?.ICE ?? 0)) +
                ((NWData[0]?.ICE ?? 0) - (NWData[1]?.ICE ?? 0)) +
                ((NCData[0]?.ICE ?? 0) - (NCData[1]?.ICE ?? 0));

    return {
      overall: +overallPeriodicPriceChgPercent.toFixed(2),
      recent: +recentPeriodicPriceChgPercent.toFixed(2),
    };
  };
}