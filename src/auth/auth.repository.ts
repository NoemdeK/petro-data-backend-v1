import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schema/user.schema';
import { Model } from 'mongoose';
import { PropDataInput } from 'src/common/utils/util.interface';
import {
  PasswordReset,
  PasswordResetDocument,
} from 'src/schema/password-reset.schema';
import { RetrieveUsersFlag } from 'src/users/enum/utils/enum.util';
import { Role } from 'src/common/interfaces/roles.interface';
import { DataEntryUtility } from 'src/DataEntry/data-entry.utility';
import { RetrieveUsersDto } from 'src/users/dto/retrieve-users.dto';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PasswordReset.name)
    private passwordResetModel: Model<PasswordResetDocument>,
    private readonly dataEntryUtility: DataEntryUtility,
  ) {}

  /**
   * @Responsibility: Repo for creating a user
   *
   * @param data
   * @returns {Promise<UserDocument>}
   */

  async createUser(data: any): Promise<UserDocument> {
    try {
      return await this.userModel.create(data);
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo to retrieve user detail
   *
   * @param where
   * @returns {Promise<UserDocument>}
   */

  async findUser(
    where: PropDataInput,
    attributes?: string,
  ): Promise<UserDocument> {
    return await this.userModel.findOne(where).lean().select(attributes);
  }

  /**
   * @Responsibility: Repo for updating a user
   *
   * @param where
   * @param data
   * @returns {Promise<UserDocument>}
   */

  async updateUser(where: any, data: any): Promise<UserDocument> {
    return await this.userModel.findOneAndUpdate(where, data, {
      new: true,
    });
  }

  /**
   * @Responsibility: Repo for deleting a user
   *
   * @param where
   * @returns {Promise<UserDocument>}
   */

  async deleteUser(where: any): Promise<UserDocument | any> {
    return await this.userModel.findByIdAndDelete(where);
  }

  /**
   * @Responsibility: Repo for retrieving a data entry
   *
   * @param data
   * @returns {Promise<DataEntryDocument>}
   */

  async retrieveUsers<T>({
    batch,
    search,
    flag,
  }: Partial<RetrieveUsersDto>): Promise<{ data: T[]; count: number }> {
    try {
      let data,
        query =
          flag === RetrieveUsersFlag.ANALYSTS
            ? { role: Role.RWX_DATA_ENTRY_ANALYST }
            : { role: Role.RWX_DATA_ENTRY_USER };

      // query: any = {
      //   $or: [
      //     { role: Role.RWX_DATA_ENTRY_ANALYST },
      //     { role: Role.RWX_DATA_ENTRY_USER },
      //   ],
      // };

      //todo ----->>>
      /* Searching functionality */
      // if (search) {
      //   query = {
      //     ...query,
      //     $or: [
      //       { pdaId: { $regex: new RegExp(search, 'i') } },
      //       { pdfaId: { $regex: new RegExp(search, 'i') } },
      //       { firstName: { $regex: new RegExp(search, 'i') } },
      //       { lastName: { $regex: new RegExp(search, 'i') } },
      //       { email: { $regex: new RegExp(search, 'i') } },
      //     ],
      //   };
      // }

      data = batch
        ? await this.userModel
            .find(query)
            .lean()
            .sort({ createdAt: -1 })
            .skip(this.dataEntryUtility.paginationFunc(+batch, 10))
            .limit(10)
        : await this.userModel
            .find(query)
            .lean()
            .sort({ createdAt: -1 })
            .limit(10);
      const count = await this.userModel.countDocuments(query);
      return { data, count };
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo to retrieve user reset password details
   *
   * @param where
   * @returns {Promise<PasswordResetDocument>}
   */

  async findResetPwdToken(
    where: PropDataInput,
  ): Promise<PasswordResetDocument> {
    return await this.passwordResetModel.findOne(where).lean();
  }

  /**
   * @Responsibility: Repo for creating user reset password details
   *
   * @param data
   * @returns {Promise<PasswordResetDocument>}
   */

  async createResetPwdToken(data: any): Promise<PasswordResetDocument> {
    try {
      return await this.passwordResetModel.create(data);
    } catch (error) {
      throw new Error(error?.messsage);
    }
  }

  /**
   * @Responsibility: Repo to update user reset password details
   *
   * @param where
   * @param data
   * @returns {Promise<PasswordResetDocument>}
   */

  async updateResetPwdToken(
    where: any,
    data: any,
  ): Promise<PasswordResetDocument> {
    return await this.passwordResetModel.findOneAndUpdate(where, data, {
      new: true,
    });
  }

  /**
   * @Responsibility: Repo to remove user reset password details
   *
   * @param where
   * @returns {Promise<PasswordResetDocument | any>}
   */

  async removeResetPwdToken(where: any): Promise<PasswordResetDocument | any> {
    return await this.passwordResetModel.findByIdAndDelete(where);
  }
}
