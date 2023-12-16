import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AppResponse } from 'src/common/app.response';
import { PetroDataService } from './petroData.service';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  PetroDataAnalysisDto,
  PetroDataAnalysisProjectionDto,
  RawDataActionsDto,
} from './dto/petro-data-analysis.dto';
import { JwtAuthGuard } from 'src/guards/jwt/jwt.guard';
import { RoleGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decorators/roles.decorator';
import { Role } from 'src/common/interfaces/roles.interface';

const { success } = AppResponse;

@Controller('petro-data')
export class PetroDataController {
  constructor(private readonly petroDataService: PetroDataService) {}

  // @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_USER)
  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadXlsxCsvFilesIntoDb(
    @Req() req: any,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Response> {
    const configFileBuffer: Buffer = req.file.buffer;
    const data = await this.petroDataService.uploadXlsxCsvFilesIntoDb(
      file,
      configFileBuffer,
    );
    return res
      .status(201)
      .json(
        success(
          'Successfully stored xlsx/csv files into the database',
          201,
          data,
        ),
      );
  }

  // @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_USER, Role.RW_USER, Role.R_USER)
  @Get('/analysis')
  async petroDataAnalysis(
    @Req() req: any,
    @Res() res: Response,
    @Body() petroDataAnalysisDto: PetroDataAnalysisDto,
    @Query('period') period: string,
  ): Promise<Response> {
    petroDataAnalysisDto.period = period;
    const data =
      await this.petroDataService.petroDataAnalysis(petroDataAnalysisDto);
    return res
      .status(200)
      .json(success('Successfully analyzed petro data', 200, data));
  }

  // @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_USER, Role.RW_USER, Role.R_USER)
  @Get('/analysis/price-percentage-change')
  async petroDataAnalysisPercentages(
    @Req() req: any,
    @Res() res: Response,
  ): Promise<Response> {
    const data = await this.petroDataService.petroDataAnalysisPercentages();
    return res
      .status(200)
      .json(
        success(
          'Successfully analyzed petro data price percentage(s) change',
          200,
          data,
        ),
      );
  }

  // @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_USER, Role.RW_USER, Role.R_USER)
  @Get('/analysis/projections')
  async petroDataAnalysisProjections(
    @Req() req: any,
    @Res() res: Response,
    @Query('flag') flag: string,
    @Query('page') page: string,
  ): Promise<Response> {
    function payload(): PetroDataAnalysisProjectionDto {
      return {
        page,
        flag,
      };
    }
    const data =
      await this.petroDataService.petroDataAnalysisProjections(payload());
    return res
      .status(200)
      .json(success('Successfully retrieved analysis projections', 200, data));
  }

  // @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_USER, Role.RW_USER, Role.R_USER)
  @Get('/raw')
  async retrieveRawPetroData(
    @Req() req: any,
    @Res() res: Response,
    @Query('batch') batch: number,
  ): Promise<Response> {
    const data = await this.petroDataService.retrieveRawPetroData(batch);
    return res
      .status(200)
      .json(
        success('Successfully retrieved raw petro weekly dataset', 200, data),
      );
  }

  // @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_USER, Role.RW_USER, Role.R_USER)
  @Post('/raw/actions')
  async rawDataActions(
    @Req() req: any,
    @Res() res: Response,
    @Query('weekStartDate') weekStartDate: string,
    @Query('weekEndDate') weekEndDate: string,
    @Query('flag') flag: string,
  ): Promise<Response> {
    function payload(): RawDataActionsDto {
      return {
        weekStartDate,
        weekEndDate,
        flag,
      };
    }
    const data = await this.petroDataService.rawDataActions(payload());
    return res
      .status(200)
      .json(
        success('Successfully performed action on weekly dataset', 200, data),
      );
  }
}
