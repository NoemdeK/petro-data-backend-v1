import { Role } from 'src/common/interfaces/roles.interface';

export class CreateUserDto {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
  readonly role?: Role;
}

export class LoginDto extends CreateUserDto {}
