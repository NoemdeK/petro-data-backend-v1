import { CreateUserDto } from 'src/auth/dto/create-user.dto';

export class UserProfileSettingsDto extends CreateUserDto {
  userId: string;
  avatar: string;
}
