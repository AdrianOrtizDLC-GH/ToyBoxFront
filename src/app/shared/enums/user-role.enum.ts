/**
 * Access-level role assigned to a user account. Consulted by role.guard.ts
 * (route data `roles`) and AuthService.hasRole() to gate access to
 * moderator/admin areas of the app.
 */
export enum UserRole {
  User = 'user',                    // Normal user, can buy/sell.
  Moderator = 'moderator',          // Moderator, reviews reports.
  Administrator = 'administrator'   // Administrator, full management.
}
