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
import { AppResponse } from 'src/common/app.response';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/guards/jwt/jwt.guard';
import { RoleGuard } from 'src/guards/roles.guard';
import { Response } from 'express';
import { Roles } from 'src/guards/decorators/roles.decorator';
import { Role } from 'src/common/interfaces/roles.interface';
import { CreateUserDto } from 'src/auth/dto/create-user.dto';
import { RetrieveUsersDto } from './dto/retrieve-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const { success } = AppResponse;

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_ADMIN, Role.RWX_DATA_ENTRY_USER)
  @Post('/create')
  async createUser(
    @Req() req: any,
    @Res() res: Response,
    @Body() createUserDto: CreateUserDto,
  ): Promise<Response> {
    createUserDto.userId = req.user.userId;
    const data = await this.userService.createUser(createUserDto);
    return res
      .status(201)
      .json(success('Successfully created new user', 201, data));
  }

  @Post('/account/verify')
  async verifyUserAccount(
    @Req() req: any,
    @Res() res: Response,
    @Query('id') id: string,
  ): Promise<Response> {
    const data = await this.userService.verifyUserAccount(id);
    return res
      .status(200)
      .json(success('Successfully verified user', 200, data));
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_ADMIN, Role.RWX_DATA_ENTRY_USER)
  @Get('/retrieve')
  async retrieveUsers(
    @Req() req: any,
    @Res() res: Response,
    @Query('flag') flag: string,
    @Query('batch') batch: string,
    @Query('search') search?: string,
  ): Promise<Response> {
    function payload(): RetrieveUsersDto {
      return {
        flag,
        search,
        batch,
        userId: req.user.userId,
      };
    }

    const data = await this.userService.retrieveUsers(payload());
    return res
      .status(200)
      .json(success('Successfully retrieved users', 200, data));
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_ADMIN, Role.RWX_DATA_ENTRY_USER)
  @Patch('/update')
  async updateUser(
    @Req() req: any,
    @Res() res: Response,
    @Body() updateUserDto: UpdateUserDto,
    @Query('id') id: string,
  ): Promise<Response> {
    updateUserDto.id = id;

    const data = await this.userService.updateUser(updateUserDto);
    return res
      .status(200)
      .json(success('Successfully updated user', 200, data));
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_ADMIN, Role.RWX_DATA_ENTRY_USER)
  @Patch('/suspend')
  async suspendUser(
    @Req() req: any,
    @Res() res: Response,
    @Query('id') id: string,
  ): Promise<Response> {
    const data = await this.userService.suspendUser(id);
    return res
      .status(200)
      .json(success('Successfully suspended user', 200, data));
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_ADMIN, Role.RWX_DATA_ENTRY_USER)
  @Patch('/suspend')
  async deleteUser(
    @Req() req: any,
    @Res() res: Response,
    @Query('id') id?: string,
  ): Promise<Response> {
    const data = await this.userService.deleteUser(id);
    return res
      .status(200)
      .json(success('Successfully deleted user', 200, data));
  }
}
