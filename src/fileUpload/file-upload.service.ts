import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { S3 } from 'aws-sdk';
import { FileExtensionType } from 'src/petroData/enum/utils/enum.util';
import { FileUploadDto } from './dto/file-upload.dto';

@Injectable()
export class FileUploadService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * @Responsibility: dedicated service for uploading files
   *
   * @param fileUploadDto
   * @returns {Promise<any>}
   */

  /* Private fxn to store files in digital ocean spaces */
  async uploadFiles(file: any): Promise<any> {
    let savedFiles: any = {};
    const errors = [];
    const fileName = `${uuidv4().replace(/-/g, '').toLocaleUpperCase()}`;

    // Last element in the array
    const { originalname } = file;
    const splitImg = originalname.split('.');
    const fileType = splitImg[splitImg.length - 1];

    const params = {
      Bucket: this.configService.get<string>('SPACES_BUCKET_NAME'),
      Key: `${this.configService.get<string>(
        'PETRO_DATA_FILE_DIR',
      )}/${fileName}.${fileType}`,
      Body: Buffer.from(file.buffer),
      ACL: 'public-read',
    };
    const data = await this.getS3().upload(params).promise();
    if (data) {
      savedFiles = { name: fileName, type: fileType, url: data.Location };
    } else {
      errors.push(file);
    }

    return savedFiles;
  }

  private getS3() {
    return new S3({
      accessKeyId: this.configService.get<string>('SPACES_ACCESS_KEY'),
      secretAccessKey: this.configService.get<string>('SPACES_SECRET_KEY'),
      endpoint: this.configService.get('SPACES_ENDPOINT'),
    });
  }
}
