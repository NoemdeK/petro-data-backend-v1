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
import { AuthService } from './auth.service';
import { Response } from 'express';
import { AppResponse } from 'src/common/app.response';
import { CreateUserDto, LoginDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from 'src/guards/jwt/jwt.guard';
import { RoleGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decorators/roles.decorator';
import { Role } from 'src/common/interfaces/roles.interface';
import { UserProfileSettingsDto } from 'src/petroData/dto/settings.dto';

const { success } = AppResponse;
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  async signup(
    @Req() req: any,
    @Res() res: Response,
    @Body() createUserDto: CreateUserDto,
  ): Promise<Response> {
    console.log(createUserDto);
    const data = await this.authService.signup(createUserDto);

    return res
      .status(201)
      .json(success('Successfully created user', 201, data));
  }

  @Post('/login')
  async login(
    @Res() res: Response,
    @Body() loginDto: LoginDto,
  ): Promise<Response> {
    const data = await this.authService.login(loginDto);

    return res.status(200).json(success('Successfully logged in', 200, data));
  }

  @Post('/forgot-password')
  async forgotPassword(
    @Res() res: Response,
    @Body('email') email: string,
  ): Promise<Response> {
    const data = await this.authService.forgotPassword(email);

    return res
      .status(200)
      .json(success('Password reset token successfully sent', 200, data));
  }

  @Post('/reset-password')
  async resetPassword(
    @Res() res: Response,
    @Query('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<Response> {
    resetPasswordDto.token = token;
    const data = await this.authService.resetPassword(resetPasswordDto);

    return res
      .status(200)
      .json(success('Successfully reset user password', 200, data));
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async userProfile(@Req() req: any, @Res() res: Response): Promise<Response> {
    const userId = req.user.userId;
    const data = await this.authService.userProfile(userId);

    return res
      .status(200)
      .json(success('Successfully retrieved user profile', 200, data));
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.RWX_USER, Role.RW_USER, Role.R_USER)
  @Patch('/me/settings')
  async userProfileSettings(
    @Req() req: any,
    @Res() res: Response,
    @Body() userProfileSettingsDto: UserProfileSettingsDto,
  ): Promise<Response> {
    userProfileSettingsDto.userId = req.user.userId;
    const data = await this.authService.userProfileSettings(
      userProfileSettingsDto,
    );
    return res
      .status(200)
      .json(success('Successfully updated user profile settings', 200, data));
  }
}
