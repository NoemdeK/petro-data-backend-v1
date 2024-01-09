import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from 'src/auth/dto/create-user.dto';
import { AppResponse } from 'src/common/app.response';
import { hashSync, genSaltSync, compareSync } from 'bcrypt';
import { Role } from 'src/common/interfaces/roles.interface';
import { DataEntryUtility } from 'src/DataEntry/data-entry.utility';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from 'src/auth/auth.repository';
import { RetrieveUsersDto } from './dto/retrieve-users.dto';
import { RetrieveUsersFlag, UserStatus } from './enum/utils/enum.util';
import { UserUtility } from './user.utility';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailDispatcherDto } from 'src/email/dto/send-mail.dto';
import { accountActivationTemplate } from 'src/email/templates/account-activation.template';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class UserService {
  constructor(
    private readonly configService: ConfigService,
    private dataEntryUtility: DataEntryUtility,
    private userUtility: UserUtility,
    private authRepository: AuthRepository,
    private emailService: EmailService,
  ) {}

  /** @Responsibility: dedicated service for creating a new user
   *
   * @param createUserDto
   *
   * @returns {Promise<any>}
   */

  async createUser(createUserDto: CreateUserDto): Promise<any> {
    try {
      const { firstName, lastName, email, password, role, userId } =
        createUserDto;

      if (
        role !== Role.RWX_DATA_ENTRY_USER &&
        role !== Role.RWX_DATA_ENTRY_ANALYST
      ) {
        AppResponse.error({
          message: 'Invalid role provided',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const userExists = await this.authRepository.findUser({ email });
      if (userExists) {
        AppResponse.error({
          message: 'User already exists',
          status: HttpStatus.CONFLICT,
        });
      }

      const createUserData = {
        firstName,
        lastName,
        email,
        password: password ? hashSync(password, genSaltSync()) : null,
        role,
        [role === Role.RWX_DATA_ENTRY_USER ? 'pdfaId' : 'pdaId']:
          role === Role.RWX_DATA_ENTRY_USER
            ? this.dataEntryUtility.generateUniqueDataEntryCode(
                Role.RWX_DATA_ENTRY_USER,
              )
            : this.dataEntryUtility.generateUniqueDataEntryCode(
                Role.RWX_DATA_ENTRY_ANALYST,
              ),
      };

      /* Create the user */
      const theUser = await this.authRepository.createUser(createUserData);

      const adminDetails = await this.authRepository.findUser({ _id: userId });
      const adminName = `${adminDetails?.firstName} ${adminDetails?.lastName}`;

      const activationLink = `${this.configService.get<string>(
        'FRONTEND_BASE_URL',
      )}/auth/activate-account/${theUser?._id}`;
      const emailFrom = this.configService.get<string>('EMAIL_SENDER');

      function emailDispatcherPayload(): MailDispatcherDto {
        return {
          to: `${createUserData?.email}`,
          from: emailFrom,
          subject: 'Activate your account',
          text: 'Account Activation',
          html: accountActivationTemplate(
            createUserData?.firstName,
            adminName,
            adminDetails?.email,
            createUserData?.role === Role.RWX_DATA_ENTRY_ANALYST
              ? 'analyst'
              : 'field agent',
            activationLink,
          ),
        };
      }

      /* Send email to user */
      await this.emailService.emailDispatcher(emailDispatcherPayload());

      return;
    } catch (error) {
      error.location = `UserServices.${this.createUser.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for verfying a user account
   *
   * @param id
   * @returns {Promise<any>}
   */

  async verifyUserAccount(id: string): Promise<any> {
    try {
      const theUser = await this.authRepository.findUser({ _id: id });
      if (!theUser) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      /* make the user active */
      await this.authRepository.updateUser(
        { _id: theUser?._id },
        { status: UserStatus.ACTIVE },
      );

      return {
        userId: theUser?._id,
        hasPassword: theUser?.password ? true : false,
      };
    } catch (error) {
      error.location = `UserServices.${this.verifyUserAccount.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for retrieving users
   *
   * @param retrieveUsersDto
   * @returns {Promise<any>}
   */

  async retrieveUsers(retrieveUsersDto: RetrieveUsersDto): Promise<any> {
    try {
      const { flag, batch, search, userId } = retrieveUsersDto;

      if (
        flag !== RetrieveUsersFlag.ANALYSTS &&
        flag !== RetrieveUsersFlag.FIELD_AGENTS
      ) {
        AppResponse.error({
          message: 'Invalid flag',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const { data, count } = await this.authRepository.retrieveUsers<object>({
        batch,
        search,
        flag,
      });

      const result = await Promise.all(
        Array.from(data, async (index: any) => {
          const theAdminUser = await this.authRepository.findUser({
            _id: userId,
          });

          return {
            _id: index?._id,
            [index?.pdfaId ? 'pdfaId' : 'pdaId']: index?.pdfaId
              ? index?.pdfaId
              : index?.pdaId,
            firstName: index?.firstName,
            lastName: index?.lasstName,
            email: index?.email,
            status: index?.status,
            createdBy: `${theAdminUser?.firstName?.trim()} ${theAdminUser?.lastName?.trim()}`,
            dateCreated: this.dataEntryUtility.customDateFormat(
              index?.createdAt,
            ),
            lastLoggedIn:
              this.dataEntryUtility.customDateFormat(index?.lastLoggedIn) ??
              null,
            duration: this.userUtility.calcDuration(
              index?.createdAt,
              index?.lastLoggedIn,
            ),
          };
        }),
      );
      return { result, count };
    } catch (error) {
      error.location = `UserServices.${this.retrieveUsers.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for updating a user(s)
   *
   * @param updateUserDto
   * @returns {Promise<any>}
   */

  async updateUser(updateUserDto: UpdateUserDto): Promise<any> {
    try {
      const { firstName, lastName, email, role, id } = updateUserDto;

      const theUser = await this.authRepository.findUser({ _id: id });
      if (!theUser) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (
        theUser?.status === UserStatus.PENDING ||
        theUser?.status === UserStatus.SUSPENDED
      ) {
        AppResponse.error({
          message: 'User is either suspended or is not active yet.',
          status: HttpStatus.FORBIDDEN,
        });
      }

      function updateUserData() {
        return {
          firstName,
          lastName,
          email,
          role,
        };
      }

      await this.authRepository.updateUser(
        { _id: theUser._id },
        updateUserData(),
      );

      return;
    } catch (error) {
      error.location = `UserServices.${this.updateUser.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for suspending a user(s)
   *
   * @param id
   * @returns {Promise<any>}
   */

  async suspendUser(id: string): Promise<any> {
    try {
      const theUser = await this.authRepository.findUser({ _id: id });
      if (!theUser) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      await this.authRepository.updateUser(
        { _id: theUser._id },
        { status: UserStatus.SUSPENDED },
      );

      return;
    } catch (error) {
      error.location = `UserServices.${this.suspendUser.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: dedicated service for deleting a user(s)
   *
   * @param id
   * @returns {Promise<any>}
   */

  async deleteUser(id: string): Promise<any> {
    try {
      const theUser = await this.authRepository.findUser({ _id: id });
      if (!theUser) {
        AppResponse.error({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      await this.authRepository.deleteUser({ _id: theUser._id });

      return;
    } catch (error) {
      error.location = `UserServices.${this.deleteUser.name} method`;
      AppResponse.error(error);
    }
  }
}
