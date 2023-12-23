import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto, LoginDto } from './dto/create-user.dto';
import { AppResponse } from 'src/common/app.response';
import { hashSync, genSaltSync, compareSync } from 'bcrypt';
import { Role } from 'src/common/interfaces/roles.interface';
import { AuthRepository } from './auth.repository';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { MailDispatcherDto } from 'src/email/dto/send-mail.dto';
import { forgotPasswordTemplate } from 'src/email/templates/forgot-password.template';
import { EmailService } from 'src/email/email.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { passwordResetTemplate } from 'src/email/templates/password-reset-template';
import { UserProfileSettingsDto } from 'src/petroData/dto/settings.dto';
import { PetroDataUtility } from 'src/petroData/petroData.utility';
import { FileExtensionType } from 'src/petroData/enum/utils/enum.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly petroDataUtility: PetroDataUtility,
  ) {}

  /**
   * @Responsibility: dedicated service for signing up a new user
   *
   * @param createUserDto
   * @returns {Promise<any>}
   */

  async signup(createUserDto: CreateUserDto): Promise<any> {
    try {
      let { firstName, lastName, email, password } = createUserDto;

      /* Hash password before storing it */
      password = password ? hashSync(password, genSaltSync()) : null;

      function userData(): CreateUserDto {
        return {
          firstName,
          lastName,
          email,
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
   * @Responsibility: dedicated service for signing up a data entry user
   *
   * @param createUserDto
   * @returns {Promise<any>}
   */

  async dataEntrySignup(createUserDto: CreateUserDto): Promise<any> {
    try {
      let { firstName, lastName, email, password } = createUserDto;

      /* Hash password before storing it */
      password = password ? hashSync(password, genSaltSync()) : null;

      function userData(): CreateUserDto {
        return {
          firstName,
          lastName,
          email,
          password,
          role: Role.RWX_DATA_ENTRY_USER,
        };
      }
      await this.authRepository.createUser(userData());
      return;
    } catch (error) {
      error.location = `AuthServices.${this.dataEntrySignup.name} method`;
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

  /**
   * @Responsibility: dedicated service for forget password
   *
   * @param email
   * @returns {Promise<any>}
   */

  async forgotPassword(email: string): Promise<any> {
    try {
      const user = await this.authRepository.findUser({ email });
      if (!user) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }
      const token = randomUUID().split('-').join('');

      const findUserPwdToken = await this.authRepository.findResetPwdToken({
        email,
      });

      if (!findUserPwdToken) {
        await this.authRepository.createResetPwdToken({
          email,
          token,
          expiresIn: moment().utc().add(1, 'hour').toDate(),
        });
      } else {
        await this.authRepository.updateResetPwdToken(
          { email },
          { token, expiresIn: moment().utc().add(1, 'hour').toDate() },
        );
      }

      const resetPasswordLink = `${this.configService.get<string>(
        'FRONTEND_BASE_URL',
      )}/auth/reset-password/${token}`;
      const emailFrom = this.configService.get<string>('EMAIL_SENDER');

      function emailDispatcherPayload(): MailDispatcherDto {
        return {
          to: `${user?.email}`,
          from: emailFrom,
          subject: 'Password Reset Token',
          text: 'Password Reset Token',
          html: forgotPasswordTemplate(user?.firstName, resetPasswordLink),
        };
      }
      /* Send email to user */
      await this.emailService.emailDispatcher(emailDispatcherPayload());
    } catch (error) {
      error.location = `AuthServices.${this.forgotPassword.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for reset password
   *
   * @param resetPasswordDto
   * @returns {Promise<any>}
   */

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<any> {
    try {
      let { token, password } = resetPasswordDto;

      const getToken = await this.authRepository.findResetPwdToken({
        token,
      });
      if (!getToken) {
        AppResponse.error({
          message: 'Invalid token',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const theUser = await this.authRepository.findUser({
        email: getToken?.email,
      });
      if (!theUser) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      /* Check if token has expired */
      if (moment.utc().toDate() > getToken?.expiresIn) {
        AppResponse.error({
          message: 'Token has expired. Please request a new one',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      /* Update password of user */
      password = hashSync(password, genSaltSync());
      await this.authRepository.updateUser(
        { email: getToken?.email },
        { password },
      );

      await this.authRepository.removeResetPwdToken({ _id: getToken?._id });

      const emailFrom = this.configService.get<string>('EMAIL_SENDER');
      function emailDispatcherPayload(): MailDispatcherDto {
        return {
          to: `${getToken?.email}`,
          from: emailFrom,
          subject: 'Password Successfuly Reset',
          text: 'Password Successfuly Reset',
          html: passwordResetTemplate(theUser?.firstName),
        };
      }
      /* Send email to user */
      await this.emailService.emailDispatcher(emailDispatcherPayload());
    } catch (error) {
      error.location = `AuthServices.${this.resetPassword.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving logged in user details
   *
   * @param userId
   * @returns {Promise<any>}
   */

  async userProfile(userId: string): Promise<any> {
    try {
      const user = await this.authRepository.findUser({ _id: userId });
      const { password, ...otherUserDetails } = user;

      if (!user) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.BAD_REQUEST,
        });
      }
      return otherUserDetails;
    } catch (error) {
      error.location = `AuthServices.${this.userProfile.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for updating user profile
   *
   * @param userProfileSettingsDto
   * @returns {Promise<any>}
   */

  async userProfileSettings(
    userProfileSettingsDto: UserProfileSettingsDto,
  ): Promise<any> {
    try {
      const { userId, firstName, lastName, avatar } = userProfileSettingsDto;

      const user = await this.authRepository.findUser({ _id: userId });

      if (!user) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const getImageUrl = await this.petroDataUtility.uploadS3(
        avatar,
        FileExtensionType.OTHERS,
        Buffer.from(avatar.buffer),
      );

      function updateData() {
        return {
          firstName,
          lastName,
          avatar: getImageUrl?.data?.url,
        };
      }

      await this.authRepository.updateUser({ _id: user?._id }, updateData());
      return;
    } catch (error) {
      console.log(error);
      error.location = `AuthServices.${this.userProfile.name} method`;
      AppResponse.error(error);
    }
  }
}
