import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto, LoginDto } from './dto/create-user.dto';
import { AppResponse } from 'src/common/app.response';
import { hashSync, genSaltSync, compareSync } from 'bcrypt';
import { Role } from 'src/common/interfaces/roles.interface';
import { AuthRepository } from './auth.repository';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private jwtService: JwtService,
  ) {}

  /**
   * @Responsibility: dedicated service for signing up a new user
   *
   * @param signUpDto
   * @returns {Promise<any>}
   */

  async signup(createUserDto: CreateUserDto): Promise<any> {
    try {
      let { email, password } = createUserDto;

      /* Hash password before storing it */
      password = password ? hashSync(password, genSaltSync()) : null;

      function userData(): CreateUserDto {
        return {
          email: email,
          password,
          role: Role.RWX_USER,
        };
      }
      await this.authRepository.createUser(userData());
      return;
    } catch (error) {
      error.location = `AuthServices.${this.signup.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for user login
   *
   * @param loginDto
   * @returns {Promise<any>}
   */

  async login(loginDto: LoginDto): Promise<any> {
    try {
      let { email, password } = loginDto;

      let theUser = await this.authRepository.findUser(
        { email },
        '_id email password role',
      );

      if (!theUser) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const validPassword = compareSync(password, theUser?.password);

      if (!validPassword) {
        AppResponse.error({
          message: 'Invalid Password',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      /* Generate jwt token  for auth */
      function jwtPayloadForAuth() {
        return {
          userId: theUser?._id,
          role: theUser?.role,
        };
      }

      return { auth: this.jwtService.sign(jwtPayloadForAuth()) };
    } catch (error) {
      error.location = `AuthServices.${this.login.name} method`;
      AppResponse.error(error);
    }
  }
}
