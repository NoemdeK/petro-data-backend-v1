import { HttpStatus, Injectable } from '@nestjs/common';
import { AppResponse } from 'src/common/app.response';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import { Readable, Transform, pipeline } from 'stream';
import { PetroDataRepository } from './petroData.repository';
import { promisify } from 'util';
import * as csvParser from 'csv-parser';
import { Logger } from '@nestjs/common';
import {
  PeriodicInterval,
  ProductType,
  Regions,
  FileExtensionType,
} from './enum/utils/enum.util';
import * as exceljs from 'exceljs';
import {
  PetroDataAnalysisDto,
  PetroDataAnalysisProjectionDto,
  RawDataActionsDto,
} from './dto/petro-data-analysis.dto';
import * as moment from 'moment';
import { catchError, fromEventPattern, lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse, AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import { S3 } from 'aws-sdk';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class PetroDataService {
  constructor(
    private readonly petroDataRepository: PetroDataRepository,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private readonly logger = new Logger(PetroDataService.name);

  /**
   * @Responsibility: dedicated service for uploading csv/xlsx files into the database
   *
   * @param file
   * @param configFileBuffer
   *
   * @returns {Promise<any>}
   */

  async uploadXlsxCsvFilesIntoDb(
    file: any,
    configFileBuffer: any,
  ): Promise<any> {
    try {
      if (!file) {
        AppResponse.error({
          message: 'Please input file',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const fileExtType = file.originalname.split('.')[1];

      const allowedExtensions: string[] = [
        FileExtensionType.CSV,
        FileExtensionType.XLSX,
      ];
      if (!allowedExtensions.includes(fileExtType)) {
        AppResponse.error({
          message: 'File extension not allowed',
          status: HttpStatus.EXPECTATION_FAILED,
        });
      }

      function readFileStream() {
        const readableStream = new Readable();
        readableStream.push(configFileBuffer);
        readableStream.push(null);

        return readableStream;
      }

      /************************** CSV File Extension  ********************************/
      if (fileExtType === FileExtensionType.CSV) {
        let readableStream = readFileStream();

        const jsonData = [];

        // CSV parsing stream
        readableStream
          .pipe(csvParser())
          .on('data', (data) => {
            jsonData.push(data);
          })
          .on('end', () => {
            // Process and store data
            jsonData.forEach(async (data) => {
              try {
                function csvUploadData() {
                  return {
                    State: data['State '] ?? data['State'],
                    Day: data.Day ?? null,
                    Year: data['Year '] ?? data['Year'],
                    Month: data['Month '] ?? data['Month'],
                    Period:
                      moment(data.Period, 'DD-MMM-YY').toISOString() ?? null,
                    AGO: data.AGO ?? null,
                    PMS: data.PMS ?? null,
                    DPK: data.DPK ?? null,
                    LPG: data.LPG ?? null,
                    ICE: data.ICE ?? null,
                    Region: data.Region,
                  };
                }

                await this.petroDataRepository.createPetroData(csvUploadData());
              } catch (error) {
                this.logger.log('Error processing data:', error);
              }
            });

            this.logger.log('Data processing complete');
          });
      }

      /************************** XLSX File Extension  ********************************/
      if (fileExtType === FileExtensionType.XLSX) {
        // Read XLSX file using streams
        let readableStream = readFileStream();

        const xlsx_workbook = new exceljs.Workbook();

        readableStream.on('end', async () => {
          // Process and store data
          const jsonData = [];

          xlsx_workbook.eachSheet((worksheet, sheetId) => {
            const sheetData = [];
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber !== 1) {
                // Skip header row
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                  // Assuming header names are unique, use them as keys
                  const header = String(
                    worksheet.getRow(1).getCell(colNumber).value,
                  );
                  rowData[header] = String(cell.value); // Explicitly cast to string
                });
                sheetData.push(rowData);
              }
            });
            jsonData.push(...sheetData);
          });
          // Process and store data
          jsonData.forEach(async (data) => {
            try {
              if (data.Period) {
                data.Period = moment(data.Period, 'DD-MMM-YY').toISOString();
              }
              await this.petroDataRepository.createPetroData(data);
            } catch (error) {
              this.logger.log('Error processing data:', error.message);
            }
          });
          this.logger.log('Data processing complete');
        });
      }
    } catch (error) {
      error.location = `PetroDataServices.${this.uploadXlsxCsvFilesIntoDb.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving petro data analysis
   *
   * @param petroDataAnalysisDto
   * @returns {Promise<any>}
   */

  async petroDataAnalysis(
    petroDataAnalysisDto: PetroDataAnalysisDto,
  ): Promise<any> {
    try {
      const { period, product, regions } = petroDataAnalysisDto;

      const validProducts: string[] = [
        ProductType.AGO,
        ProductType.DPK,
        ProductType.LPG,
        ProductType.PMS,
        ProductType.ICE,
      ];

      if (!validProducts.includes(product)) {
        AppResponse.error({
          message: 'Invalid product type',
          status: HttpStatus.EXPECTATION_FAILED,
        });
      }

      let analysis;

      const getAnalysis = async (date: Date, product: string) => {
        const formattedDate = moment(date).toISOString();
        const today = moment().toISOString();

        analysis = await Promise.all(
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
                    : await this.petroDataRepository.getPeriodicPetroDataForICE(
                        formattedDate,
                        today,
                        index,
                      );
          }),
        );
        return analysis.flat();
      };

      /************************** AGO Product Type ***************************************/
      if (product === ProductType.AGO) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();
          return getAnalysis(oneWeekDate, ProductType.AGO);
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(oneMonthDate, ProductType.AGO);
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();
          return getAnalysis(threeMonthsDate, ProductType.AGO);
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();
          return getAnalysis(sixMonthsDate, ProductType.AGO);
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(yesterdayDate, ProductType.AGO);
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();
          return getAnalysis(oneYearDate, ProductType.AGO);
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();
          return getAnalysis(fiveYearsDate, ProductType.AGO);
        }

        if (period === PeriodicInterval.MAX) {
          analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.AGO,
              );
            }),
          );
          return analysis.flat();
        }
      }

      /************************** PMS Product Type ***************************************/
      if (product === ProductType.PMS) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();
          return getAnalysis(oneWeekDate, ProductType.PMS);
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(oneMonthDate, ProductType.PMS);
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();
          return getAnalysis(threeMonthsDate, ProductType.PMS);
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();
          return getAnalysis(sixMonthsDate, ProductType.PMS);
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(yesterdayDate, ProductType.PMS);
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();
          return getAnalysis(oneYearDate, ProductType.PMS);
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();
          return getAnalysis(fiveYearsDate, ProductType.PMS);
        }

        if (period === PeriodicInterval.MAX) {
          analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.PMS,
              );
            }),
          );
          return analysis.flat();
        }
      }

      /************************** DPK Product Type ***************************************/
      if (product === ProductType.DPK) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();
          return getAnalysis(oneWeekDate, ProductType.DPK);
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(oneMonthDate, ProductType.DPK);
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();
          return getAnalysis(threeMonthsDate, ProductType.DPK);
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();
          return getAnalysis(sixMonthsDate, ProductType.DPK);
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(yesterdayDate, ProductType.DPK);
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();
          return getAnalysis(oneYearDate, ProductType.DPK);
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();
          return getAnalysis(fiveYearsDate, ProductType.DPK);
        }

        if (period === PeriodicInterval.MAX) {
          analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.DPK,
              );
            }),
          );
          return analysis.flat();
        }
      }

      /************************** LPG Product Type ***************************************/
      if (product === ProductType.LPG) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();
          return getAnalysis(oneWeekDate, ProductType.LPG);
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(oneMonthDate, ProductType.LPG);
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();
          return getAnalysis(threeMonthsDate, ProductType.LPG);
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();
          return getAnalysis(sixMonthsDate, ProductType.LPG);
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(yesterdayDate, ProductType.LPG);
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();
          return getAnalysis(oneYearDate, ProductType.LPG);
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();
          return getAnalysis(fiveYearsDate, ProductType.LPG);
        }

        if (period === PeriodicInterval.MAX) {
          analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.LPG,
              );
            }),
          );
          return analysis.flat();
        }
      }

      /************************** ICE Product Type ****************************************/
      if (product === ProductType.ICE) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();
          return getAnalysis(oneWeekDate, ProductType.ICE);
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(oneMonthDate, ProductType.ICE);
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();
          return getAnalysis(threeMonthsDate, ProductType.ICE);
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();
          return getAnalysis(sixMonthsDate, ProductType.ICE);
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'months').toDate();
          return getAnalysis(yesterdayDate, ProductType.ICE);
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();
          return getAnalysis(oneYearDate, ProductType.ICE);
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();
          return getAnalysis(fiveYearsDate, ProductType.ICE);
        }

        if (period === PeriodicInterval.MAX) {
          analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.ICE,
              );
            }),
          );
          return analysis.flat();
        }
      }
    } catch (error) {
      error.location = `PetroDataServices.${this.petroDataAnalysis.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving petro data analysis
   *
   * @param petroDataAnalysisDto
   * @returns {Promise<any>}
   */

  async petroDataAnalysisPercentages(): Promise<any> {
    try {
      const priceData = await this.petroDataRepository.getAllPrices();

      let AGOPercentageChange: number,
        DPKPercentageChange: number,
        LPGPercentageChange: number,
        PMSPercentageChange: number,
        ICEPercentageChange: number;
      const theLength: number = priceData.length;
      for (let i = 1; i < theLength; i++) {
        const oldAGOPrice = priceData[i - 1].AGO;
        const oldDPKPrice = priceData[i - 1].DPK;
        const oldLPGPrice = priceData[i - 1].LPG;
        const oldPMSPrice = priceData[i - 1].PMS;
        const oldICEPrice = priceData[i - 1].ICE;

        const newAGOPrice = priceData[i].AGO;
        const newDPKPrice = priceData[i].DPK;
        const newLPGPrice = priceData[i].LPG;
        const newPMSPrice = priceData[i].PMS;
        const newICEPrice = priceData[i].ICE;

        if (newAGOPrice) {
          AGOPercentageChange =
            ((newAGOPrice - oldAGOPrice) / oldAGOPrice) * 100;
        }

        if (newDPKPrice) {
          DPKPercentageChange =
            ((newDPKPrice - oldDPKPrice) / oldDPKPrice) * 100;
        }

        if (newLPGPrice) {
          LPGPercentageChange =
            ((newLPGPrice - oldLPGPrice) / oldLPGPrice) * 100;
        }

        if (newPMSPrice) {
          PMSPercentageChange =
            ((newPMSPrice - oldPMSPrice) / oldPMSPrice) * 100;
        }

        if (newICEPrice) {
          ICEPercentageChange =
            ((newICEPrice - oldICEPrice) / oldICEPrice) * 100;
        }
      }

      const mostRecentPrices = await this.petroDataRepository.getAllPrices(2);

      function recentPriceChgFxn(current: number, initial: number) {
        const result = current - initial;
        return result > 0 ? `+${result.toFixed(2)}` : `${result.toFixed(2)}`;
      }

      return {
        AGOData: {
          overallPricePercentChange:
            AGOPercentageChange > 0
              ? `+${AGOPercentageChange.toFixed(2)}`
              : `${AGOPercentageChange.toFixed(2)}`,
          currentPrice: mostRecentPrices[1].AGO,
          recentPricePercentChange: recentPriceChgFxn(
            mostRecentPrices[1].AGO,
            mostRecentPrices[0].AGO,
          ),
        },
        DPKData: {
          overallPricePercentChange:
            DPKPercentageChange > 0
              ? `+${DPKPercentageChange.toFixed(2)}`
              : `${DPKPercentageChange.toFixed(2)}`,
          currentPrice: mostRecentPrices[1].DPK,
          recentPricePercentChange: recentPriceChgFxn(
            mostRecentPrices[1].DPK,
            mostRecentPrices[0].DPK,
          ),
        },
        LPGData: {
          overallPricePercentChange:
            LPGPercentageChange > 0
              ? `+${LPGPercentageChange.toFixed(2)}`
              : `${LPGPercentageChange.toFixed(2)}`,
          currentPrice: mostRecentPrices[1].LPG,
          recentPricePercentChange: recentPriceChgFxn(
            mostRecentPrices[1].LPG,
            mostRecentPrices[0].LPG,
          ),
        },
        PMSData: {
          overallPricePercentChange:
            PMSPercentageChange > 0
              ? `+${PMSPercentageChange.toFixed(2)}`
              : `${PMSPercentageChange.toFixed(2)}`,
          currentPrice: mostRecentPrices[1].PMS,
          recentPricePercentChange: recentPriceChgFxn(
            mostRecentPrices[1].PMS,
            mostRecentPrices[0].PMS,
          ),
        },
        // ICEData: {
        //   overallPricePercentChange:
        //     ICEPercentageChange > 0
        //       ? `+${ICEPercentageChange.toFixed(2)}` ?? '0.00'
        //       : `${ICEPercentageChange.toFixed(2)}` ?? '0.00',
        //   currentPrice: mostRecentPrices[1].ICE ?? '0.00',
        //   recentPricePercentChange:
        //     recentPriceChgFxn(
        //       mostRecentPrices[1].ICE,
        //       mostRecentPrices[0].ICE,
        //     ) ?? '0.00',
        // },
      };
    } catch (error) {
      error.location = `PetroDataServices.${this.petroDataAnalysisPercentages.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving petro data analysis projections
   *
   * @param petroDataAnalysisProjectionDto
   * @returns {Promise<any>}
   */

  async petroDataAnalysisProjections(
    petroDataAnalysisProjectionDto: PetroDataAnalysisProjectionDto,
  ): Promise<any> {
    try {
      const { flag, page } = petroDataAnalysisProjectionDto;

      if (!flag) {
        AppResponse.error({
          message: 'Please provide a flag',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      let queryString;

      const axiosCallFxn = async (queryString: string) => {
        const { data } = await lastValueFrom(
          this.httpService
            .get(
              `${this.configService.get<string>(
                'G_NEWS_URL',
              )}?q=${queryString}&lang=en&country=us&page=${page}&max=5&sortby=publishedAt&apikey=${this.configService.get<string>(
                'G_NEWS_SECRET_KEY',
              )}`,
            )
            .pipe(
              catchError((error: AxiosError) => {
                return AppResponse.error({
                  message: error?.message,
                  status: HttpStatus.BAD_REQUEST,
                });
              }),
            ),
        );
        return data;
      };

      if (flag === ProductType.PMS) {
        return axiosCallFxn('petrol');
      }

      if (flag === ProductType.ICE) {
        return axiosCallFxn('ICE brent crude');
      }

      if (flag === ProductType.LPG) {
        return axiosCallFxn('liquefied petroleum gas');
      }

      if (flag === ProductType.AGO) {
        return axiosCallFxn('gas oil OR diesel');
      }

      if (flag === ProductType.DPK) {
        queryString = 'kerosene';
        return axiosCallFxn('kerosene');
      }
    } catch (error) {
      error.location = `PetroDataServices.${this.petroDataAnalysisProjections.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving raw petro data
   *
   * @param batch
   * @returns {Promise<any>}
   */

  async retrieveRawPetroData(batch: number): Promise<any> {
    try {
      /* Returns the range of the dates */
      const getDateRange =
        await this.petroDataRepository.aggregateDateRange(batch);

      const result = await Promise.all(
        Array.from(getDateRange, (index: any) => {
          return {
            ...index,
            category: 'Pricing',
            period: 'Weekly',
            year: index?.weekStartDate?.getFullYear(),
            source: 'Nigerian Bureau Of Statistics',
          };
        }),
      );

      const weeklyDatesCount =
        await this.petroDataRepository.aggregateTotalWeeks();
      return { count: weeklyDatesCount[0].totalWeeks, result };
    } catch (error) {
      error.location = `PetroDataServices.${this.retrieveRawPetroData.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving raw petro data
   *
   * @param rawDataActionsDto
   * @returns {Promise<any>}
   */

  async rawDataActions(rawDataActionsDto: RawDataActionsDto): Promise<any> {
    try {
      const { flag, weekStartDate, weekEndDate } = rawDataActionsDto;

      if (!flag) {
        AppResponse.error({
          message: 'Please provide a flag',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      if (flag !== FileExtensionType.CSV && flag !== FileExtensionType.XLSX) {
        AppResponse.error({
          message: 'Invalid flag provided',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const getDataWithinRange =
        await this.petroDataRepository.retrievePetroData(
          weekStartDate,
          weekEndDate,
        );

      /************************ Export CSV files ****************************/
      if (flag === FileExtensionType.CSV) {
        const csvWriter = createObjectCsvWriter({
          path: 'petro-data.csv',
          header: [
            { id: 'State', title: 'State' },
            { id: 'Day', title: 'Day' },
            { id: 'Year', title: 'Year' },
            { id: 'Month', title: 'Month' },
            { id: 'Period', title: 'Period' },
            { id: 'AGO', title: 'AGO' },
            { id: 'PMS', title: 'PMS' },
            { id: 'DPK', title: 'DPK' },
            { id: 'LPG', title: 'LPG' },
            { id: 'Region', title: 'Region' },
          ],
        });

        await csvWriter.writeRecords(getDataWithinRange);

        const csvBuffer = require('fs').createReadStream('petro-data.csv');

        const getImageUrl = await this.uploadS3(
          getDataWithinRange,
          'csv',
          csvBuffer,
        );
        const { name, url } = getImageUrl.data;

        fs.unlinkSync('petro-data.csv');

        return { name, url };
      }

      /************************ Export XLSX files ****************************/
      if (flag === FileExtensionType.XLSX) {
        // Create a new workbook and add a worksheet
        const workbook = xlsx.utils.book_new();

        // Add a worksheet
        const worksheet = xlsx.utils.json_to_sheet(getDataWithinRange);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'PetroData');

        const xlsxBuffer = xlsx.write(workbook, {
          bookType: 'xlsx',
          type: 'buffer',
        });

        const getImageUrl = await this.uploadS3(
          getDataWithinRange,
          'xlsx',
          xlsxBuffer,
        );

        const { name, url } = getImageUrl.data;

        return { name, url };
      }
    } catch (error) {
      error.location = `PetroDataServices.${this.rawDataActions.name} method`;
      AppResponse.error(error);
    }
  }

  private async uploadS3(file: any, flag: string, buffer: any) {
    let savedImages: any = {};
    const errors = [];
    const fileName = `${uuidv4().replace(/-/g, '').toLocaleUpperCase()}`;

    let fileType: string = flag === FileExtensionType.CSV ? 'csv' : 'xlsx';
    // if (flags === FileExtensionType.CSV) {
    //   const { originalname } = file;
    //   const splitImg = originalname.split('.');
    //   // Last element in the array
    //   fileType = splitImg[splitImg.length - 1];
    // } else {
    //   fileType = 'csv';
    // }

    const params = {
      Bucket: this.configService.get<string>('SPACES_BUCKET_NAME'),
      Key: `${this.configService.get<string>(
        'PETRO_DATA_FILE_DIR',
      )}/${fileName}.${fileType}`,
      Body: buffer,
      ACL: 'public-read',
    };
    const data = await this.getS3().upload(params).promise();
    if (data) {
      savedImages = { name: fileName, type: fileType, url: data.Location };
    } else {
      errors.push(file);
    }

    return {
      data: savedImages,
      errors: errors.length ? errors : null,
    };
  }

  private getS3() {
    return new S3({
      accessKeyId: this.configService.get<string>('SPACES_ACCESS_KEY'),
      secretAccessKey: this.configService.get<string>('SPACES_SECRET_KEY'),
      endpoint: this.configService.get('SPACES_ENDPOINT'),
    });
  }
}
