import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { AppResponse } from 'src/common/app.response';
import { CreateUserDto, LoginDto } from './dto/create-user.dto';

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

  @Post('/login')
  async login(
    @Res() res: Response,
    @Body() loginDto: LoginDto,
  ): Promise<Response> {
    const data = await this.authService.login(loginDto);

    return res.status(200).json(success('Successfully logged in', 200, data));
  }
}
