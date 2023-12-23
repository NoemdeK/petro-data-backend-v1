import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestHandler, Response, Request } from 'express';
import { AppResponse } from 'src/common/app.response';
import { CreateUserDto, LoginDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from 'src/guards/jwt/jwt.guard';
import { RoleGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decorators/roles.decorator';
import { Role } from 'src/common/interfaces/roles.interface';
import { UserProfileSettingsDto } from 'src/petroData/dto/settings.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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
    const data = await this.authService.signup(createUserDto);

    return res
      .status(201)
      .json(success('Successfully created user', 201, data));
  }

  @Post('/signup/data-entry')
  async dataEntrySignup(
    @Req() req: any,
    @Res() res: Response,
    @Body() createUserDto: CreateUserDto,
  ): Promise<Response> {
    const data = await this.authService.dataEntrySignup(createUserDto);

    return res
      .status(201)
      .json(success('Successfully created data entry user', 201, data));
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
  @UseInterceptors(FileInterceptor('file'))
  async userProfileSettings(
    @UploadedFile()
    @Req()
    req: any,
    @Res() res: Response,
    @UploadedFile()
    file: Express.Multer.File,
    @Body() userProfileSettingsDto: UserProfileSettingsDto,
    @Query('id') id: string,
  ): Promise<Response> {
    function payload() {
      return {
        firstName: userProfileSettingsDto.firstName,
        lastName: userProfileSettingsDto.lastName,
        avatar: file,
        userId: id,
      };
    }

    const data = await this.authService.userProfileSettings(payload());
    return res
      .status(200)
      .json(success('Successfully updated user profile settings', 200, data));
  }
}
