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

import { parse } from 'csv-parse';
import * as PDFDocument from 'pdfkit';
import { PetroDataUtility } from './petroData.utility';
import * as path from 'path';

@Injectable()
export class PetroDataService {
  constructor(
    private readonly petroDataRepository: PetroDataRepository,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly petroDataUtility: PetroDataUtility,
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
                const formattedPeriodDate = moment(
                  data.Period,
                  'D-MMM-YY',
                ).format('YYYY-MM-DD');

                function csvUploadData() {
                  return {
                    State: data['State '] ?? data['State'],
                    Day: data.Day ?? null,
                    Year: data['Year '] ?? data['Year'],
                    Month: data['Month '] ?? data['Month'],
                    Period: moment(formattedPeriodDate).format('YYYY-MM-DD'),
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

      /************************** AGO Product Type ***************************************/
      if (product === ProductType.AGO) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneWeekDate,
            ProductType.AGO,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.AGO,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneMonthDate,
            ProductType.AGO,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.AGO,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            threeMonthsDate,
            ProductType.AGO,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.AGO,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            sixMonthsDate,
            ProductType.AGO,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.AGO,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            yesterdayDate,
            ProductType.AGO,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.AGO,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneYearDate,
            ProductType.AGO,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.AGO,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            fiveYearsDate,
            ProductType.AGO,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.AGO,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.MAX) {
          const analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              if (index === Regions.NATIONAL) {
                return await this.petroDataRepository.getNationalMaxPetroData(
                  ProductType.AGO,
                );
              }
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.AGO,
              );
            }),
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysis.flat(),
              ProductType.AGO,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysis.flat(),
          };
        }
      }

      /************************** PMS Product Type ***************************************/
      if (product === ProductType.PMS) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneWeekDate,
            ProductType.PMS,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.PMS,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneMonthDate,
            ProductType.PMS,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.PMS,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            threeMonthsDate,
            ProductType.PMS,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.PMS,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            sixMonthsDate,
            ProductType.PMS,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.PMS,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            yesterdayDate,
            ProductType.PMS,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.PMS,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneYearDate,
            ProductType.PMS,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.PMS,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            fiveYearsDate,
            ProductType.PMS,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.PMS,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.MAX) {
          const analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              if (index === Regions.NATIONAL) {
                return await this.petroDataRepository.getNationalMaxPetroData(
                  ProductType.PMS,
                );
              }
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.PMS,
              );
            }),
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysis.flat(),
              ProductType.PMS,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysis.flat(),
          };
        }
      }

      /************************** DPK Product Type ***************************************/
      if (product === ProductType.DPK) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneWeekDate,
            ProductType.DPK,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.DPK,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneMonthDate,
            ProductType.DPK,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.DPK,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            threeMonthsDate,
            ProductType.DPK,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.DPK,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            sixMonthsDate,
            ProductType.DPK,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.DPK,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            yesterdayDate,
            ProductType.DPK,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.DPK,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneYearDate,
            ProductType.DPK,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.DPK,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            fiveYearsDate,
            ProductType.DPK,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.DPK,
            );
          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.MAX) {
          const analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              if (index === Regions.NATIONAL) {
                return await this.petroDataRepository.getNationalMaxPetroData(
                  ProductType.DPK,
                );
              }
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.DPK,
              );
            }),
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysis.flat(),
              ProductType.DPK,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysis.flat(),
          };
        }
      }

      /************************** LPG Product Type ***************************************/
      if (product === ProductType.LPG) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneWeekDate,
            ProductType.LPG,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.LPG,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneMonthDate,
            ProductType.LPG,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.LPG,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            threeMonthsDate,
            ProductType.LPG,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.LPG,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            sixMonthsDate,
            ProductType.LPG,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.LPG,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            yesterdayDate,
            ProductType.LPG,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.LPG,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneYearDate,
            ProductType.LPG,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.LPG,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            fiveYearsDate,
            ProductType.LPG,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.LPG,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.MAX) {
          const analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              if (index === Regions.NATIONAL) {
                return await this.petroDataRepository.getNationalMaxPetroData(
                  ProductType.LPG,
                );
              }
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.LPG,
              );
            }),
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysis.flat(),
              ProductType.LPG,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysis.flat(),
          };
        }
      }

      /************************** ICE Product Type ****************************************/
      if (product === ProductType.ICE) {
        if (period === PeriodicInterval.ONE_WEEK) {
          const oneWeekDate = moment().subtract(7, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneWeekDate,
            ProductType.ICE,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.ICE,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_MONTH) {
          const oneMonthDate = moment().subtract(1, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneMonthDate,
            ProductType.ICE,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.ICE,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.THREE_MONTHS) {
          const threeMonthsDate = moment().subtract(3, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            threeMonthsDate,
            ProductType.ICE,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.ICE,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.SIX_MONTHS) {
          const sixMonthsDate = moment().subtract(6, 'months').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            sixMonthsDate,
            ProductType.ICE,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.ICE,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.YESTERDAY) {
          const yesterdayDate = moment().subtract(1, 'days').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            yesterdayDate,
            ProductType.ICE,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.ICE,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.ONE_YEAR) {
          const oneYearDate = moment().subtract(1, 'years').toDate();

          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            oneYearDate,
            ProductType.ICE,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.ICE,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.FIVE_YEARS) {
          const fiveYearsDate = moment().subtract(5, 'years').toDate();
          const analysisData = await this.petroDataUtility.getAnalysis(
            regions,
            fiveYearsDate,
            ProductType.ICE,
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysisData,
              ProductType.ICE,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall < 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysisData,
          };
        }

        if (period === PeriodicInterval.MAX) {
          const analysis = await Promise.all(
            Array.from(regions, async (index: any) => {
              if (index === Regions.NATIONAL) {
                return await this.petroDataRepository.getNationalMaxPetroData(
                  ProductType.ICE,
                );
              }
              return await this.petroDataRepository.getMaxPetroData(
                index,
                ProductType.ICE,
              );
            }),
          );

          const { overall, recent } =
            this.petroDataUtility.overallAndRecentPercentPriceCghFxn(
              analysis.flat(),
              ProductType.ICE,
            );

          return {
            overallPriceChange:
              overall > 0 ? `+${overall}` : overall > 0 ? `${overall}` : '0.00',
            recentPriceChange:
              recent > 0 ? `+${recent}` : recent < 0 ? `${recent}` : '0.00',
            analysis: analysis.flat(),
          };
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
      const SEPriceData = await this.petroDataRepository.getAllPrices({
        Region: Regions.SOUTH_EAST,
      });

      const SWPriceData = await this.petroDataRepository.getAllPrices({
        Region: Regions.SOUTH_WEST,
      });

      const SSPriceData = await this.petroDataRepository.getAllPrices({
        Region: Regions.SOUTH_SOUTH,
      });

      const NEPriceData = await this.petroDataRepository.getAllPrices({
        Region: Regions.NORTH_EAST,
      });

      const NWPriceData = await this.petroDataRepository.getAllPrices({
        Region: Regions.NORTH_WEST,
      });

      const NCPriceData = await this.petroDataRepository.getAllPrices({
        Region: Regions.NORTH_CENTRAL,
      });

      const avgProductPricePerRegion = async (
        data: Array<object> | any,
        region: string,
        productType: string,
      ) => {
        /********************** Get overall price of the product ********************************/
        const overallProductPrice =
          productType === ProductType.AGO
            ? data.reduce(
                (accumulator, currentValue) => accumulator + currentValue.AGO,
                0,
              )
            : productType === ProductType.PMS
              ? data.reduce(
                  (accumulator, currentValue) => accumulator + currentValue.PMS,
                  0,
                )
              : productType === ProductType.DPK
                ? data.reduce(
                    (accumulator, currentValue) =>
                      accumulator + currentValue.DPK,
                    0,
                  )
                : productType === ProductType.LPG
                  ? data.reduce(
                      (accumulator, currentValue) =>
                        accumulator + currentValue.LPG,
                      0,
                    )
                  : data.reduce(
                      (accumulator, currentValue) =>
                        accumulator + currentValue.ICE,
                      0,
                    );

        /******************** calculate the overall count of the products in a region ****************/
        const overallCountByRegion =
          region === Regions.SOUTH_EAST
            ? await this.petroDataRepository.countDocuments({
                Region: Regions.SOUTH_EAST,
              })
            : region === Regions.SOUTH_WEST
              ? await this.petroDataRepository.countDocuments({
                  Region: Regions.SOUTH_WEST,
                })
              : region === Regions.SOUTH_SOUTH
                ? await this.petroDataRepository.countDocuments({
                    Region: Regions.SOUTH_SOUTH,
                  })
                : region === Regions.NORTH_EAST
                  ? await this.petroDataRepository.countDocuments({
                      Region: Regions.NORTH_EAST,
                    })
                  : region === Regions.NORTH_WEST
                    ? await this.petroDataRepository.countDocuments({
                        Region: Regions.NORTH_WEST,
                      })
                    : await this.petroDataRepository.countDocuments({
                        Region: Regions.NORTH_CENTRAL,
                      });

        const avgProductPrice =
          +overallProductPrice.toFixed(2) / +overallCountByRegion;

        return +avgProductPrice.toFixed(2);
      };

      /* Get product data by region */
      const AGODataByRegion = {
        SE: await avgProductPricePerRegion(
          SEPriceData,
          Regions.SOUTH_EAST,
          ProductType.AGO,
        ),
        SW: await avgProductPricePerRegion(
          SWPriceData,
          Regions.SOUTH_WEST,
          ProductType.AGO,
        ),
        SS: await avgProductPricePerRegion(
          SSPriceData,
          Regions.SOUTH_SOUTH,
          ProductType.AGO,
        ),
        NE: await avgProductPricePerRegion(
          NEPriceData,
          Regions.NORTH_EAST,
          ProductType.AGO,
        ),
        NW: await avgProductPricePerRegion(
          NWPriceData,
          Regions.NORTH_WEST,
          ProductType.AGO,
        ),
        NC: await avgProductPricePerRegion(
          NCPriceData,
          Regions.NORTH_CENTRAL,
          ProductType.AGO,
        ),
      };

      const PMSDataByRegion = {
        SE: await avgProductPricePerRegion(
          SEPriceData,
          Regions.SOUTH_EAST,
          ProductType.PMS,
        ),
        SW: await avgProductPricePerRegion(
          SWPriceData,
          Regions.SOUTH_WEST,
          ProductType.PMS,
        ),
        SS: await avgProductPricePerRegion(
          SSPriceData,
          Regions.SOUTH_SOUTH,
          ProductType.PMS,
        ),
        NE: await avgProductPricePerRegion(
          NEPriceData,
          Regions.NORTH_EAST,
          ProductType.PMS,
        ),
        NW: await avgProductPricePerRegion(
          NWPriceData,
          Regions.NORTH_WEST,
          ProductType.PMS,
        ),
        NC: await avgProductPricePerRegion(
          NCPriceData,
          Regions.NORTH_CENTRAL,
          ProductType.PMS,
        ),
      };

      const DPKDataByRegion = {
        SE: await avgProductPricePerRegion(
          SEPriceData,
          Regions.SOUTH_EAST,
          ProductType.DPK,
        ),
        SW: await avgProductPricePerRegion(
          SWPriceData,
          Regions.SOUTH_WEST,
          ProductType.DPK,
        ),
        SS: await avgProductPricePerRegion(
          SSPriceData,
          Regions.SOUTH_SOUTH,
          ProductType.DPK,
        ),
        NE: await avgProductPricePerRegion(
          NEPriceData,
          Regions.NORTH_EAST,
          ProductType.DPK,
        ),
        NW: await avgProductPricePerRegion(
          NWPriceData,
          Regions.NORTH_WEST,
          ProductType.DPK,
        ),
        NC: await avgProductPricePerRegion(
          NCPriceData,
          Regions.NORTH_CENTRAL,
          ProductType.DPK,
        ),
      };

      const LPGDataByRegion = {
        SE: await avgProductPricePerRegion(
          SEPriceData,
          Regions.SOUTH_EAST,
          ProductType.LPG,
        ),
        SW: await avgProductPricePerRegion(
          SWPriceData,
          Regions.SOUTH_WEST,
          ProductType.LPG,
        ),
        SS: await avgProductPricePerRegion(
          SSPriceData,
          Regions.SOUTH_SOUTH,
          ProductType.LPG,
        ),
        NE: await avgProductPricePerRegion(
          NEPriceData,
          Regions.NORTH_EAST,
          ProductType.LPG,
        ),
        NW: await avgProductPricePerRegion(
          NWPriceData,
          Regions.NORTH_WEST,
          ProductType.LPG,
        ),
        NC: await avgProductPricePerRegion(
          NCPriceData,
          Regions.NORTH_CENTRAL,
          ProductType.LPG,
        ),
      };

      const ICEDataByRegion = {
        SE: await avgProductPricePerRegion(
          SEPriceData,
          Regions.SOUTH_EAST,
          ProductType.ICE,
        ),
        SW: await avgProductPricePerRegion(
          SWPriceData,
          Regions.SOUTH_WEST,
          ProductType.ICE,
        ),
        SS: await avgProductPricePerRegion(
          SSPriceData,
          Regions.SOUTH_SOUTH,
          ProductType.ICE,
        ),
        NE: await avgProductPricePerRegion(
          NEPriceData,
          Regions.NORTH_EAST,
          ProductType.ICE,
        ),
        NW: await avgProductPricePerRegion(
          NWPriceData,
          Regions.NORTH_WEST,
          ProductType.ICE,
        ),
        NC: await avgProductPricePerRegion(
          NCPriceData,
          Regions.NORTH_CENTRAL,
          ProductType.ICE,
        ),
      };

      const AGOCurrentPrice =
        (+AGODataByRegion.SE +
          +AGODataByRegion.SW +
          +AGODataByRegion.SS +
          +AGODataByRegion.NE +
          +AGODataByRegion.NW +
          +AGODataByRegion.NC) /
        6;

      const PMSCurrentPrice =
        (+PMSDataByRegion.SE +
          +PMSDataByRegion.SW +
          +PMSDataByRegion.SS +
          +PMSDataByRegion.NE +
          +PMSDataByRegion.NW +
          +PMSDataByRegion.NC) /
        6;

      const DPKCurrentPrice =
        (+DPKDataByRegion.SE +
          +DPKDataByRegion.SW +
          +DPKDataByRegion.SS +
          +DPKDataByRegion.NE +
          +DPKDataByRegion.NW +
          +DPKDataByRegion.NC) /
        6;

      const LPGCurrentPrice =
        (+LPGDataByRegion.SE +
          +LPGDataByRegion.SW +
          +LPGDataByRegion.SS +
          +LPGDataByRegion.NE +
          +LPGDataByRegion.NW +
          +LPGDataByRegion.NC) /
        6;

      const ICECurrentPrice =
        (+ICEDataByRegion.SE +
          +ICEDataByRegion.SW +
          +ICEDataByRegion.SS +
          +ICEDataByRegion.NE +
          +ICEDataByRegion.NW +
          +ICEDataByRegion.NC) /
        6;

      /* Calculate the difference in last two prices for all products in every region */

      const SERecentPriceData = await this.petroDataRepository.getAllPrices(
        {
          Region: Regions.SOUTH_EAST,
        },
        2,
      );

      const SWRecentPriceData = await this.petroDataRepository.getAllPrices(
        {
          Region: Regions.SOUTH_WEST,
        },
        2,
      );

      const SSRecentPriceData = await this.petroDataRepository.getAllPrices(
        {
          Region: Regions.SOUTH_SOUTH,
        },
        2,
      );

      const NERecentPriceData = await this.petroDataRepository.getAllPrices(
        {
          Region: Regions.NORTH_EAST,
        },
        2,
      );

      const NWRecentPriceData = await this.petroDataRepository.getAllPrices(
        {
          Region: Regions.NORTH_WEST,
        },
        2,
      );

      const NCRecentPriceData = await this.petroDataRepository.getAllPrices(
        {
          Region: Regions.NORTH_CENTRAL,
        },
        2,
      );

      const recentAGOPriceChg =
        (SERecentPriceData[0].AGO ?? 0) -
        (SERecentPriceData[1].AGO ?? 0) +
        ((SWRecentPriceData[0].AGO ?? 0) - (SWRecentPriceData[1].AGO ?? 0)) +
        ((SSRecentPriceData[0].AGO ?? 0) - (SSRecentPriceData[1].AGO ?? 0)) +
        ((NERecentPriceData[0].AGO ?? 0) - (NERecentPriceData[1].AGO ?? 0)) +
        ((NWRecentPriceData[0].AGO ?? 0) - (NWRecentPriceData[1].AGO ?? 0)) +
        ((NCRecentPriceData[0].AGO ?? 0) - (NCRecentPriceData[1].AGO ?? 0));

      const recentPMSPriceChg =
        (SERecentPriceData[0].PMS ?? 0) -
        (SERecentPriceData[1].PMS ?? 0) +
        ((SWRecentPriceData[0].PMS ?? 0) - (SWRecentPriceData[1].PMS ?? 0)) +
        ((SSRecentPriceData[0].PMS ?? 0) - (SSRecentPriceData[1].PMS ?? 0)) +
        ((NERecentPriceData[0].PMS ?? 0) - (NERecentPriceData[1].PMS ?? 0)) +
        ((NWRecentPriceData[0].PMS ?? 0) - (NWRecentPriceData[1].PMS ?? 0)) +
        ((NCRecentPriceData[0].PMS ?? 0) - (NCRecentPriceData[1].PMS ?? 0));

      const recentDPKPriceChg =
        (SERecentPriceData[0].DPK ?? 0) -
        (SERecentPriceData[1].DPK ?? 0) +
        ((SWRecentPriceData[0].DPK ?? 0) - (SWRecentPriceData[1].DPK ?? 0)) +
        ((SSRecentPriceData[0].DPK ?? 0) - (SSRecentPriceData[1].DPK ?? 0)) +
        ((NERecentPriceData[0].DPK ?? 0) - (NERecentPriceData[1].DPK ?? 0)) +
        ((NWRecentPriceData[0].DPK ?? 0) - (NWRecentPriceData[1].DPK ?? 0)) +
        ((NCRecentPriceData[0].DPK ?? 0) - (NCRecentPriceData[1].DPK ?? 0));

      const recentLPGPriceChg =
        (SERecentPriceData[0].LPG ?? 0) -
        (SERecentPriceData[1].LPG ?? 0) +
        ((SWRecentPriceData[0].LPG ?? 0) - (SWRecentPriceData[1].LPG ?? 0)) +
        ((SSRecentPriceData[0].LPG ?? 0) - (SSRecentPriceData[1].LPG ?? 0)) +
        ((NERecentPriceData[0].LPG ?? 0) - (NERecentPriceData[1].LPG ?? 0)) +
        ((NWRecentPriceData[0].LPG ?? 0) - (NWRecentPriceData[1].LPG ?? 0)) +
        ((NCRecentPriceData[0].LPG ?? 0) - (NCRecentPriceData[1].LPG ?? 0));

      const recentICEPriceChg =
        (SERecentPriceData[0].ICE ?? 0) -
        (SERecentPriceData[1].ICE ?? 0) +
        ((SWRecentPriceData[0].ICE ?? 0) - (SWRecentPriceData[1].ICE ?? 0)) +
        ((SSRecentPriceData[0].ICE ?? 0) - (SSRecentPriceData[1].ICE ?? 0)) +
        ((NERecentPriceData[0].ICE ?? 0) - (NERecentPriceData[1].ICE ?? 0)) +
        ((NWRecentPriceData[0].ICE ?? 0) - (NWRecentPriceData[1].ICE ?? 0)) +
        ((NCRecentPriceData[0].ICE ?? 0) - (NCRecentPriceData[1].PMS ?? 0));

      const recentAGOPricePercentChange = +recentAGOPriceChg / 6;
      const recentPMSPricePercentChange = +recentPMSPriceChg / 6;
      const recentDPKPricePercentChange = +recentDPKPriceChg / 6;
      const recentLPGPricePercentChange = +recentLPGPriceChg / 6;
      const recentICEPricePercentChange = +recentICEPriceChg / 6;

      function overallPercentageChgFxn(productType: string) {
        let priceChgSE: number,
          priceChgSW: number,
          priceChgSS: number,
          priceChgNE: number,
          priceChgNW: number,
          priceChgNC: number;

        /********************** South East Products  ***************************/
        for (let i = 1; i < SEPriceData.length; i++) {
          /* Old price for products in South East */
          const oldPriceSE =
            productType === ProductType.AGO
              ? SEPriceData[i - 1].AGO
              : productType === ProductType.PMS
                ? SEPriceData[i - 1].PMS
                : productType === ProductType.DPK
                  ? SEPriceData[i - 1].DPK
                  : productType === ProductType.LPG
                    ? SEPriceData[i - 1].LPG
                    : SEPriceData[i - 1].ICE;

          /* New price for products in South East */
          const newPriceSE =
            productType === ProductType.AGO
              ? SEPriceData[i].AGO
              : productType === ProductType.PMS
                ? SEPriceData[i].PMS
                : productType === ProductType.DPK
                  ? SEPriceData[i].DPK
                  : productType === ProductType.LPG
                    ? SEPriceData[i].LPG
                    : SEPriceData[i].ICE;

          if (newPriceSE) {
            priceChgSE = ((newPriceSE - oldPriceSE) / oldPriceSE) * 100;
          }
        }

        /********************** South West Products  ***************************/
        for (let i = 1; i < SWPriceData.length; i++) {
          /* Old price for products in South West */
          const oldPriceSW =
            productType === ProductType.AGO
              ? SWPriceData[i - 1].AGO
              : productType === ProductType.PMS
                ? SWPriceData[i - 1].PMS
                : productType === ProductType.DPK
                  ? SWPriceData[i - 1].DPK
                  : productType === ProductType.LPG
                    ? SWPriceData[i - 1].LPG
                    : SWPriceData[i - 1].ICE;

          /* New price for products in South West */
          const newPriceSW =
            productType === ProductType.AGO
              ? SWPriceData[i].AGO
              : productType === ProductType.PMS
                ? SWPriceData[i].PMS
                : productType === ProductType.DPK
                  ? SWPriceData[i].DPK
                  : productType === ProductType.LPG
                    ? SWPriceData[i].LPG
                    : SWPriceData[i].ICE;

          if (newPriceSW) {
            priceChgSW = ((newPriceSW - oldPriceSW) / oldPriceSW) * 100;
          }
        }

        /********************** South South Products  ***************************/
        for (let i = 1; i < SSPriceData.length; i++) {
          /* Old price for products in South South */
          const oldPriceSS =
            productType === ProductType.AGO
              ? SSPriceData[i - 1].AGO
              : productType === ProductType.PMS
                ? SSPriceData[i - 1].PMS
                : productType === ProductType.DPK
                  ? SSPriceData[i - 1].DPK
                  : productType === ProductType.LPG
                    ? SSPriceData[i - 1].LPG
                    : SSPriceData[i - 1].ICE;

          /* New price for products in South South */
          const newPriceSS =
            productType === ProductType.AGO
              ? SSPriceData[i].AGO
              : productType === ProductType.PMS
                ? SSPriceData[i].PMS
                : productType === ProductType.DPK
                  ? SSPriceData[i].DPK
                  : productType === ProductType.LPG
                    ? SSPriceData[i].LPG
                    : SSPriceData[i].ICE;

          if (newPriceSS) {
            priceChgSS = ((newPriceSS - oldPriceSS) / oldPriceSS) * 100;
          }
        }

        /********************** North East Products  ***************************/
        for (let i = 1; i < NEPriceData.length; i++) {
          /* Old price for products in North East */
          const oldPriceNE =
            productType === ProductType.AGO
              ? NEPriceData[i - 1].AGO
              : productType === ProductType.PMS
                ? NEPriceData[i - 1].PMS
                : productType === ProductType.DPK
                  ? NEPriceData[i - 1].DPK
                  : productType === ProductType.LPG
                    ? NEPriceData[i - 1].LPG
                    : NEPriceData[i - 1].ICE;

          /* New price for products in North East */
          const newPriceNE =
            productType === ProductType.AGO
              ? NEPriceData[i].AGO
              : productType === ProductType.PMS
                ? NEPriceData[i].PMS
                : productType === ProductType.DPK
                  ? NEPriceData[i].DPK
                  : productType === ProductType.LPG
                    ? NEPriceData[i].LPG
                    : NEPriceData[i].ICE;

          if (newPriceNE) {
            priceChgNE = ((newPriceNE - oldPriceNE) / oldPriceNE) * 100;
          }
        }

        /********************** North West Products  ***************************/
        for (let i = 1; i < NWPriceData.length; i++) {
          /* Old price for products in North West */
          const oldPriceNW =
            productType === ProductType.AGO
              ? NWPriceData[i - 1].AGO
              : productType === ProductType.PMS
                ? NWPriceData[i - 1].PMS
                : productType === ProductType.DPK
                  ? NWPriceData[i - 1].DPK
                  : productType === ProductType.LPG
                    ? NWPriceData[i - 1].LPG
                    : NWPriceData[i - 1].ICE;

          /* New price for products in North West */
          const newPriceNW =
            productType === ProductType.AGO
              ? NWPriceData[i].AGO
              : productType === ProductType.PMS
                ? NWPriceData[i].PMS
                : productType === ProductType.DPK
                  ? NWPriceData[i].DPK
                  : productType === ProductType.LPG
                    ? NWPriceData[i].LPG
                    : NWPriceData[i].ICE;

          if (newPriceNW) {
            priceChgNW = ((newPriceNW - oldPriceNW) / oldPriceNW) * 100;
          }
        }

        /********************** North Central Products  ***************************/
        for (let i = 1; i < NCPriceData.length; i++) {
          /* Old price for products in North Central */
          const oldPriceNC =
            productType === ProductType.AGO
              ? NCPriceData[i - 1].AGO
              : productType === ProductType.PMS
                ? NCPriceData[i - 1].PMS
                : productType === ProductType.DPK
                  ? NCPriceData[i - 1].DPK
                  : productType === ProductType.LPG
                    ? NCPriceData[i - 1].LPG
                    : NCPriceData[i - 1].ICE;

          /* New price for products in North Central */
          const newPriceNC =
            productType === ProductType.AGO
              ? NCPriceData[i].AGO
              : productType === ProductType.PMS
                ? NCPriceData[i].PMS
                : productType === ProductType.DPK
                  ? NCPriceData[i].DPK
                  : productType === ProductType.LPG
                    ? NCPriceData[i].LPG
                    : NCPriceData[i].ICE;

          if (newPriceNC) {
            priceChgNC = ((newPriceNC - oldPriceNC) / oldPriceNC) * 100;
          }
        }

        const result =
          (+priceChgSE +
            +priceChgSW +
            +priceChgSS +
            +priceChgNE +
            +priceChgNW +
            +priceChgNC) /
          6;

        return result.toFixed(2);
      }

      const overallPercentageChgAGO = +overallPercentageChgFxn(ProductType.AGO);
      const overallPercentageChgPMS = +overallPercentageChgFxn(ProductType.PMS);
      const overallPercentageChgDPK = +overallPercentageChgFxn(ProductType.DPK);
      const overallPercentageChgLPG = +overallPercentageChgFxn(ProductType.LPG);
      const overallPercentageChgICE = +overallPercentageChgFxn(ProductType.ICE);

      return {
        AGOData: {
          overallPricePercentChange:
            overallPercentageChgAGO > 0
              ? `+${overallPercentageChgAGO}`
              : overallPercentageChgAGO < 0
                ? `${overallPercentageChgAGO}`
                : '0.00',
          currentPrice: AGOCurrentPrice ? AGOCurrentPrice.toFixed(2) : '0.00',
          recentPricePercentChange:
            recentAGOPricePercentChange > 0
              ? `+${recentAGOPricePercentChange.toFixed(2)}`
              : recentAGOPricePercentChange < 0
                ? `${recentAGOPricePercentChange.toFixed(2)}`
                : '0.00',
          closedDate: SERecentPriceData[0].Period,
        },
        PMSData: {
          overallPricePercentChange:
            overallPercentageChgPMS > 0
              ? `+${overallPercentageChgPMS}`
              : overallPercentageChgPMS < 0
                ? `${overallPercentageChgPMS}`
                : '0.00',
          currentPrice: PMSCurrentPrice ? PMSCurrentPrice.toFixed(2) : '0.00',
          recentPricePercentChange:
            recentPMSPricePercentChange > 0
              ? `+${recentPMSPricePercentChange.toFixed(2)}`
              : recentPMSPricePercentChange < 0
                ? `${recentPMSPricePercentChange.toFixed(2)}`
                : '0.00',
          closedDate: SERecentPriceData[0].Period,
        },

        DPKData: {
          overallPricePercentChange:
            overallPercentageChgDPK > 0
              ? `+${overallPercentageChgDPK}`
              : overallPercentageChgDPK < 0
                ? `${overallPercentageChgDPK}`
                : '0.00',
          currentPrice: DPKCurrentPrice ? DPKCurrentPrice.toFixed(2) : '0.00',
          recentPricePercentChange:
            recentDPKPricePercentChange > 0
              ? `+${recentDPKPricePercentChange.toFixed(2)}`
              : recentDPKPricePercentChange < 0
                ? `${recentDPKPricePercentChange.toFixed(2)}`
                : '0.00',
          closedDate: SERecentPriceData[0].Period,
        },

        LPGData: {
          overallPricePercentChange:
            overallPercentageChgLPG > 0
              ? `+${overallPercentageChgLPG}`
              : overallPercentageChgLPG < 0
                ? `${overallPercentageChgLPG}`
                : '0.00',
          currentPrice: LPGCurrentPrice ? LPGCurrentPrice.toFixed(2) : '0.00',
          recentPricePercentChange:
            recentLPGPricePercentChange > 0
              ? `+${recentLPGPricePercentChange.toFixed(2)}`
              : recentLPGPricePercentChange < 0
                ? `${recentLPGPricePercentChange.toFixed(2)}`
                : '0.00',
          closedDate: SERecentPriceData[0].Period,
        },

        ICEData: {
          overallPricePercentChange:
            overallPercentageChgICE > 0
              ? `+${overallPercentageChgICE}`
              : overallPercentageChgICE < 0
                ? `${overallPercentageChgICE}`
                : '0.00',
          currentPrice: ICECurrentPrice ? ICECurrentPrice.toFixed(2) : '0.00',
          recentPricePercentChange:
            recentICEPricePercentChange > 0
              ? `+${recentICEPricePercentChange.toFixed(2)}`
              : recentICEPricePercentChange > 0
                ? `${recentICEPricePercentChange.toFixed(2)}`
                : '0.00',
          closedDate: SERecentPriceData[0].Period,
        },
      };
    } catch (error) {
      error.location = `PetroDataServices.${this.petroDataAnalysisPercentages.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving petro data periodic price percentage change for five years
   *
   * @returns {Promise<any>}
   */

  async periodicPricePercentageChangeFiveYears(): Promise<any> {
    try {
      const fiveYearsDate = moment().subtract(5, 'years').toDate();
      const formattedDate = moment(fiveYearsDate).toISOString();
      const today = moment().toISOString();

      const periodicData =
        await this.petroDataRepository.retrievePeriodicPetroData(
          formattedDate,
          today,
        );
      return periodicData;
    } catch (error) {
      error.location = `PetroDataServices.${this.periodicPricePercentageChangeFiveYears.name} method`;
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

      if (
        flag !== FileExtensionType.CSV &&
        flag !== FileExtensionType.XLSX &&
        flag !== FileExtensionType.PDF
      ) {
        AppResponse.error({
          message: 'Invalid flag provided',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      let getDataWithinRange =
        await this.petroDataRepository.retrievePeriodicPetroData(
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

        const getImageUrl = await this.petroDataUtility.uploadS3(
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

        const getImageUrl = await this.petroDataUtility.uploadS3(
          getDataWithinRange,
          'xlsx',
          xlsxBuffer,
        );

        const { name, url } = getImageUrl.data;

        return { name, url };
      }

      /************************ Export PDF files ****************************/
      if (flag === FileExtensionType.PDF) {
        /* Clear the pervious content in petro-data.csv before proceeding */
        const pdfFilePath = 'petro-data.csv';
        fs.writeFileSync(pdfFilePath, '');

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

        const csvData = fs.readFileSync('petro-data.csv', 'utf8');
        const records = await this.parseCsv(csvData);

        const pdfDoc = new PDFDocument();
        const outputPath = 'petro-data.pdf';
        pdfDoc.pipe(fs.createWriteStream(outputPath));

        this.generatePdfContent(pdfDoc, records);

        pdfDoc.end();

        const pdfBuffer = fs.readFileSync(outputPath);

        const getImageUrl = await this.petroDataUtility.uploadS3(
          getDataWithinRange,
          'pdf',
          pdfBuffer,
        );

        const { name, url } = getImageUrl.data;

        /* Delete petro-data.csv file */
        fs.unlinkSync('petro-data.csv');

        return { name, url };
      }
    } catch (error) {
      error.location = `PetroDataServices.${this.rawDataActions.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for exporting all petor-data to csv
   *
   * @returns {Promise<any>}
   */

  async exportToDefaultCsv(): Promise<any> {
    try {
      const allData = await this.petroDataRepository.retrieveAllPetroData();

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

      await csvWriter.writeRecords(allData);

      const csvBuffer = require('fs').createReadStream('petro-data.csv');

      const getImageUrl = await this.petroDataUtility.uploadS3(
        allData,
        'csv',
        csvBuffer,
      );
      const { name, url } = getImageUrl.data;

      fs.unlinkSync('petro-data.csv');

      return { name, url };
    } catch (error) {
      error.location = `PetroDataServices.${this.rawDataActions.name} method`;
      AppResponse.error(error);
    }
  }

  /* Private fxn to parse csv data */
  private parseCsv(csvData: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      parse(csvData, { columns: true }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          data.forEach((record) => records.push(record));
          resolve(records);
        }
      });
    });
  }

  private generatePdfContent(pdfDoc: any, records: any[]): void {
    // Customize the PDF layout and content based on your requirements
    pdfDoc.fontSize(7);

    // Constants for column widths and table headers
    const columnWidths = [55, 15, 20, 25, 150, 30, 25, 25, 25, 65];
    const tableHeader = [
      'State',
      'Day',
      'Year',
      'Month',
      'Period',
      'AGO',
      'PMS',
      'DPK',
      'LPG',
      'Region',
    ];

    // Set the initial position for the table
    let tableX = 30;
    let tableY = 50;

    // Add the table header
    tableHeader.forEach((header, index) => {
      pdfDoc.text(header, tableX, tableY, {
        width: columnWidths[index],
        align: 'left',
      });
      tableX += columnWidths[index] + 5; // Add some padding between columns
    });

    // Move to the next row
    tableY += 10;

    // Populate the table with data
    records.forEach((record) => {
      tableX = 50; // Reset X position for each row

      let maxRowHeight = 0; // Track the maximum height of the current row

      tableHeader.forEach((header, index) => {
        let cellContent = String(record[header]);

        // Split text manually based on the available width of the column
        const maxLineWidth = columnWidths[index];
        let textLines = [];

        while (cellContent.length > 0) {
          let line = '';
          let i = 0;
          while (
            pdfDoc.widthOfString(line) < maxLineWidth &&
            i < cellContent.length
          ) {
            line += cellContent[i];
            i++;
          }
          textLines.push(line.trim());
          cellContent = cellContent.slice(i);
        }

        // Draw each line of the cell content
        textLines.forEach((line, lineIndex) => {
          const lineHeight =
            pdfDoc.heightOfString(line, {
              width: columnWidths[index],
            }) + 5;

          pdfDoc.text(line, tableX, tableY, {
            width: columnWidths[index],
            align: 'left', // Adjust alignment as needed
          });

          // Update the maximum height for the row
          maxRowHeight = Math.max(maxRowHeight, lineHeight);

          // Move to the next row within the same column
          tableY += lineHeight;
        });

        tableX += columnWidths[index]; // Move to the next column
        tableY -= maxRowHeight; // Reset Y position to the start of the row
      });

      // Move to the next row based on the maximum height of the current row
      tableY += maxRowHeight;
    });
  }
}
