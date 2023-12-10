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
import { fileExtensionType } from './enum/utils/enum.util';
import * as exceljs from 'exceljs';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class PetroDataService {
  constructor(private readonly petroDataRepository: PetroDataRepository) {}

  private readonly logger = new Logger(PetroDataService.name);

  /**
   * @Responsibility: dedicated service for creating an executive
   *
   * @param file
   * @returns {Promise<any>}
   */

  async uploadXlsxFileIntoDb(file: any, configFileBuffer: any): Promise<any> {
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
              await this.petroDataRepository.createPetroData(data);
            } catch (error) {
              this.logger.log('Error processing data:', error.message);
            }
          });
          this.logger.log('Data processing complete');
        });
      }
    } catch (error) {
      error.location = `ExecutiveServices.${this.uploadXlsxFileIntoDb.name} method`;
      AppResponse.error(error);
    }
  }
}
