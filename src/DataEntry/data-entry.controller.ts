import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AppResponse } from 'src/common/app.response';
import { DataEntryService } from './data-entry.service';
import { JwtAuthGuard } from 'src/guards/jwt/jwt.guard';
import { RoleGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decorators/roles.decorator';
import { Role } from 'src/common/interfaces/roles.interface';
import { UploadDataEntryDto } from './dto/upload-date-entry.dto';
import { RetrieveDataEntry } from './dto/retrieve-data-entry.dto';
import { DataEntryActionsDto } from './dto/data-entry-actions.dto';

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
  @Roles(Role.RWX_ADMIN, Role.RWX_DATA_ENTRY_USER)
  @Get('/retrieve')
  async retrieveDataEntry(
    @Req() req: any,
    @Res() res: Response,
    @Query('flag') flag: string,
    @Query('batch') batch: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
  ): Promise<Response> {
    function payload(): RetrieveDataEntry {
      return {
        flag,
        batch,
        userId: req.user.userId,
        search,
        filter,
      };
    }

    const data = await this.dataEntryService.retrieveDataEntry(payload());
    return res
      .status(200)
      .json(success('Successfully retrieved data entry', 200, data));
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Patch('/actions')
  @Roles(Role.RWX_ADMIN, Role.RWX_DATA_ENTRY_USER)
  async dataEntryActions(
    @Req() req: any,
    @Res() res: Response,
    @Query('entryId') entryId: string,
    @Query('flag') flag: string,
  ): Promise<Response> {
    function payload(): DataEntryActionsDto {
      return {
        entryId,
        flag,
        dataEntryApproverId: req.user.userId,
        rejectionReason: req.body.rejectionReason,
      };
    }
    const data = await this.dataEntryService.dataEntryActions(payload());
    return res
      .status(200)
      .json(success('Successfully performed action on data entry', 200, data));
  }
}
