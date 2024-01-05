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
@Controller('auth')
export class DataEntryController {
  constructor(private readonly dataEntryService: DataEntryService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_DATA_ENTRY_USER, Role.RWX_ADMIN)
  @Post('/create')
  async createPetroData(
    @Req() req: any,
    @Res() res: Response,
    @Body() uploadDataEntryDto: UploadDataEntryDto,
  ): Promise<Response> {
    uploadDataEntryDto.userId = req.user.userId;
    const data =
      await this.dataEntryService.uploadDataEntry(uploadDataEntryDto);
    return res
      .status(201)
      .json(success('Successfully created petro data', 201, data));
  }
}
