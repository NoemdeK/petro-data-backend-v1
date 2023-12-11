import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schema/user.schema';
import { Model } from 'mongoose';
import { PropDataInput } from 'src/common/utils/util.interface';

@Injectable()
export class AuthRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * @Responsibility: Repo for creating a user
   *
   * @param data
   * @returns {Promise<Admin>}
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
   * @returns {Promise<Admin>}
   */

  async findUser(
    where: PropDataInput,
    attributes?: string,
  ): Promise<UserDocument> {
    return await this.userModel.findOne(where).lean().select(attributes);
  }
}
