import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schema/user.schema';
import { Model } from 'mongoose';
import { PropDataInput } from 'src/common/utils/util.interface';
import {
  PasswordReset,
  PasswordResetDocument,
} from 'src/schema/passwordReset.schema';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PasswordReset.name)
    private passwordResetModel: Model<PasswordResetDocument>,
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
    console.log(where);
    return await this.passwordResetModel.findByIdAndDelete(where);
  }
}
