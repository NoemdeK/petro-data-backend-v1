import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/common/interfaces/roles.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private refletor: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.refletor.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // allow all routes with no Role decorator
    if (!requiredRoles) {
      return true;
    }
    // get the request object
    const req = context.switchToHttp().getRequest();

    if (!req?.user?.role) {
      return true;
    }

    if (!req.headers['workspace']) {
      return requiredRoles.some((role) => role === req.user.role);
    }

    return requiredRoles.some((role) => role === req.user.role);
  }
}