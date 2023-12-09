import { Role } from 'src/common/interfaces/roles.interface';

export interface JwtPayload {
  readonly userId: string;
  readonly role: Role;
}
