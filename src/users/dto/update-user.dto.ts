import { CreateUserDto } from 'src/auth/dto/create-user.dto';

export class UpdateUserDto extends CreateUserDto {
  id: string;
}
