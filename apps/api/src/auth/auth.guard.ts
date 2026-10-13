import { CanActivate, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CLS_USER_KEY, SYSTEM_USER } from './current-user.js';

/**
 * Global guard. Today it lets everyone in as the system user; it is the single
 * place where real authentication and permission checks will plug in.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  canActivate(): boolean {
    this.cls.set(CLS_USER_KEY, SYSTEM_USER);
    return true;
  }
}
