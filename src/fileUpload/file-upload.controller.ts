import {
  Controller,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { FileUploadService } from './file-upload.service';
import { AppResponse } from 'src/common/app.response';
import { FileUploadDto } from './dto/file-upload.dto';

const { success } = AppResponse;

@Controller('upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('/files')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFiles(
    @Req() req: any,
    @Res() res: Response,
    @UploadedFile()
    file: Express.Multer.File,
  ): Promise<Response> {
    const data = await this.fileUploadService.uploadFiles(file);

    return res
      .status(200)
      .json(success('Successfully uploaded file', 200, data));
  }
}
