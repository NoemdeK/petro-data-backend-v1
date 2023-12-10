import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppResponse } from 'src/common/app.response';
import { PetroDataService } from './petroData.service';
import { Response } from 'express';
import { CreateXlsxDto } from './dto/create-xlsx.dto';
import { FileInterceptor } from '@nestjs/platform-express';

const { success } = AppResponse;

@Controller('petro-data')
export class PetroDataController {
  constructor(private readonly petroDataService: PetroDataService) {}

  // @UseGuards(JwtAuthGuard, WorkspaceGuard, RoleGuard)
  // @Roles(Role.ADMIN, Role.MEMBER)
  @Post('/upload-xlsx')
  @UseInterceptors(FileInterceptor('file'))
  async uploadXlsxFileIntoDb(
    @Req() req: any,
    @Res() res: Response,
    @Body() createXlsxDto: CreateXlsxDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Response> {
    // function payload() /* : CreateXlsxDto */ {
    //   return {
    //     file,
    //     //...createXlsxDto,
    //   };
    // }
    const configFileBuffer: Buffer = req.file.buffer;
    const data = await this.petroDataService.uploadXlsxFileIntoDb(
      file,
      configFileBuffer,
    );
    return res
      .status(200)
      .json(
        success('Successfully stored xlsx data into the database', 201, data),
      );
  }
}
