/**
 * Account status of a user, controlled by admin actions
 * (UsersService.setStatus). A blocked user should be prevented from
 * signing in / performing actions by the backend.
 */
export enum UserStatus {
  Active = 'active',
  Blocked = 'blocked'
}