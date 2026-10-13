/**
 * The acting user. Authentication does not exist yet, so every request runs as the
 * system user; the shape is what real auth (JWT/sessions + permissions) will fill in.
 */
export interface CurrentUser {
  readonly id: string;
  readonly roles: readonly string[];
}

export const SYSTEM_USER: CurrentUser = { id: 'system', roles: ['admin'] };

export const CLS_USER_KEY = 'currentUser';
