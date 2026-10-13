import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CLS_USER_KEY, SYSTEM_USER, type CurrentUser } from './current-user.js';

/** Request-scoped context (AsyncLocalStorage) available to any service without plumbing. */
@Injectable()
export class RequestContextService {
  constructor(private readonly cls: ClsService) {}

  currentUser(): CurrentUser {
    return (
      (this.cls.isActive() ? this.cls.get<CurrentUser | undefined>(CLS_USER_KEY) : undefined) ?? SYSTEM_USER
    );
  }
}
