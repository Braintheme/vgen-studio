import { createParamDecorator } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { CLS_USER_KEY, SYSTEM_USER, type CurrentUser as CurrentUserValue } from './current-user.js';

/** `@CurrentUser() user` in controllers. */
export const CurrentUser = createParamDecorator(
  (): CurrentUserValue =>
    ClsServiceManager.getClsService().get<CurrentUserValue | undefined>(CLS_USER_KEY) ?? SYSTEM_USER,
);
