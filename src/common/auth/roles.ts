/**
 * Role values, mirroring the auth service's `User.Role` enum. Used with the
 * `@Roles(...)` decorator, e.g. `@Roles([Role.ADMIN])`.
 */
export const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
