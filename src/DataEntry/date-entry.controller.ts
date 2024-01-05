import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AppResponse } from 'src/common/app.response';
import { DataEntryService } from './data-entry.service';
import { JwtAuthGuard } from 'src/guards/jwt/jwt.guard';
import { RoleGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decorators/roles.decorator';
import { Role } from 'src/common/interfaces/roles.interface';
import { UploadDataEntryDto } from './dto/upload-date-entry.dto';

const { success } = AppResponse;
@Controller('data-entry')
export class DataEntryController {
  constructor(private readonly dataEntryService: DataEntryService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_DATA_ENTRY_USER, Role.RWX_ADMIN)
  @Post('/upload')
  async uploadDataEntry(
    @Req() req: any,
    @Res() res: Response,
    @Body() uploadDataEntryDto: UploadDataEntryDto,
  ): Promise<Response> {
    uploadDataEntryDto.userId = req.user.userId;
    const data =
      await this.dataEntryService.uploadDataEntry(uploadDataEntryDto);
    return res
      .status(201)
      .json(success('Successfully uploaded data entry', 201, data));
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_ADMIN)
  @Get('/retrieve')
  async retrieveDataEntry(
    @Req() req: any,
    @Res() res: Response,
    @Body() uploadDataEntryDto: UploadDataEntryDto,
  ): Promise<Response> {
    uploadDataEntryDto.userId = req.user.userId;
    const data =
      await this.dataEntryService.retrieveDataEntry(uploadDataEntryDto);
    return res
      .status(200)
      .json(success('Successfully retrieved data entry', 201, data));
  }
}
