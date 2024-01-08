import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { nigeriaStates } from 'src/data/states-region';
import * as moment from 'moment';
import { DataEntryRepository } from 'src/DataEntry/data-entry.repository';
import { DataEntryStatus } from 'src/DataEntry/enum/utils/enum.util';
import { ProductType } from 'src/petroData/enum/utils/enum.util';
import { PetroDataRepository } from 'src/petroData/petroData.repository';
import { products } from 'src/data/product';

@Injectable()
export class JobService {
  constructor(
    private readonly dataEntryRepository: DataEntryRepository,
    private readonly petroDataRepository: PetroDataRepository,
  ) {}

  // @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async aggregateDataEntryValues() {
    try {
      /* Since data entry will be uploaded a day ahead */
      const startOfYesterday = moment().subtract(1, 'days').startOf('day');
      const endOfYesterday = moment().subtract(1, 'days').endOf('day');

      /* Get all the approved data entries submiited for the day */
      const theDataEnt = await this.dataEntryRepository.getMutipleDataEntry({
        priceDate: { $gte: startOfYesterday, $lt: endOfYesterday },
        status: DataEntryStatus.APPROVED,
      });

      /* Compartmentalize data entries according to states and get the average product prices */
      for (let state in nigeriaStates) {
        const statesData = theDataEnt.filter(
          (data: any) => data?.state === state,
        );

        /* if no date entry exists for a state, then skip that state */
        if (statesData.length === 0) {
          continue;
        }

        const averageAGOPrice = calculateAveragePrice(
          ProductType.AGO,
          statesData,
        );
        const averagePMSPrice = calculateAveragePrice(
          ProductType.PMS,
          statesData,
        );
        const averageLPGPrice = calculateAveragePrice(
          ProductType.LPG,
          statesData,
        );
        const averageDPKPrice = calculateAveragePrice(
          ProductType.DPK,
          statesData,
        );
        const averageICEPrice = calculateAveragePrice(
          ProductType.ICE,
          statesData,
        );

        function createPetroDataFxn() {
          return {
            State: statesData[0]?.state.trim(),
            Period: formatPeriodDate(statesData[0]?.priceDate),
            PMS: averagePMSPrice,
            AGO: averageAGOPrice,
            LPG: averageLPGPrice,
            DPK: averageDPKPrice,
            ICE: averageICEPrice,
            Region: statesData[0]?.region.trim(),
            userId: statesData[0]?.dataEntryUserId,
          };
        }

        /* send the data to petrodata collection for analysis */
        await this.petroDataRepository.createPetroData(createPetroDataFxn());
      }

      /* Compartmentalize data entries according to products and get the National product prices */
      const nationalAGOPrice = calculateAveragePrice(
        ProductType.AGO,
        theDataEnt,
      );
      const nationalPMSPrice = calculateAveragePrice(
        ProductType.PMS,
        theDataEnt,
      );
      const nationalLPGPrice = calculateAveragePrice(
        ProductType.LPG,
        theDataEnt,
      );
      const nationalDPKPrice = calculateAveragePrice(
        ProductType.DPK,
        theDataEnt,
      );
      const nationalICEPrice = calculateAveragePrice(
        ProductType.ICE,
        theDataEnt,
      );

      function createNationalPetroDataFxn() {
        return {
          Period: formatPeriodDate(theDataEnt[0]?.priceDate),
          PMS: nationalPMSPrice,
          AGO: nationalAGOPrice,
          LPG: nationalLPGPrice,
          DPK: nationalDPKPrice,
          ICE: nationalICEPrice,
          Region: 'National',
        };
      }

      /* send the data to petrodata collection for analysis */
      await this.petroDataRepository.createPetroData(
        createNationalPetroDataFxn(),
      );

      /* Function to calculate the average price of each products from different filling stations */
      function calculateAveragePrice(product, data) {
        const productEntries = data.filter(
          (entry) => entry?.product === product,
        );

        if (productEntries.length === 0) {
          return 0;
        }

        const totalPrice = productEntries.reduce(
          (sum, entry) => sum + entry?.price,
          0,
        );
        const average = +totalPrice / productEntries.length;
        return +average.toFixed(2);
      }

      /* Function to format price date */
      function formatPeriodDate(dateObj) {
        return moment(dateObj, 'D-MMM-YY').format('YYYY-MM-DD');
      }
    } catch (error) {
      throw error;
    }
  }
}
