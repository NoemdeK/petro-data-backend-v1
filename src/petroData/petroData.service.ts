import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateXlsxDto } from './dto/create-xlsx.dto';
import { AppResponse } from 'src/common/app.response';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { Readable, Transform, pipeline } from 'stream';
import { PetroDataRepository } from './petroData.repository';
import { promisify } from 'util';
import * as csvParser from 'csv-parser';
import { Logger } from '@nestjs/common';
import {
  PeriodicInterval,
  ProductType,
  fileExtensionType,
} from './enum/utils/enum.util';
import * as exceljs from 'exceljs';
import { PetroDataAnalysisDto } from './dto/petro-data-analysis.dto';
import * as moment from 'moment';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class PetroDataService {
  constructor(private readonly petroDataRepository: PetroDataRepository) {}

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
        fileExtensionType.CSV,
        fileExtensionType.XLSX,
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
      if (fileExtType === fileExtensionType.CSV) {
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
                // Convert Period date to iso string format
                if (data.Period) {
                  data.Period = moment(data.Period, 'DD-MMM-YY').toISOString();
                }
                await this.petroDataRepository.createPetroData(data);
              } catch (error) {
                this.logger.log('Error processing data:', error);
              }
            });

            this.logger.log('Data processing complete');
          });
      }

      /************************** XLSX File Extension  ********************************/
      if (fileExtType === fileExtensionType.XLSX) {
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
                  : await this.petroDataRepository.getPeriodicPetroDataForLPG(
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
    } catch (error) {
      error.location = `PetroDataServices.${this.petroDataAnalysis.name} method`;
      AppResponse.error(error);
    }
  }
}
