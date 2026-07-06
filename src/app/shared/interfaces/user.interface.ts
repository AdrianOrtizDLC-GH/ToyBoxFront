// Alias used across DTOs/entities for date/timestamp fields serialized as strings (ISO format from the API).
export type DateString = string;
import { UserRole } from "../enums/user-role.enum";
import { UserStatus } from "../enums/user-status.enum";

export { UserRole } from "../enums/user-role.enum";

/**
 * Models a full user account record. `password` is optional/only present
 * transiently on request payloads — it should never be populated on data
 * read back from the API.
 */
export interface User {
  id_users: number;
  username: string;
  email: string;
  password?: string;
  profile_picture: string | null;
  role: UserRole;
  status: UserStatus;
  registration_date: DateString;
  user_birthday: DateString;
  user_city: string;
  user_province: string;
  user_zipcode: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
}

/**
 * Lightweight user projection embedded in other entities (chats,
 * favorites, reviews, reports) to avoid over-fetching full User data.
 */
export interface UserSummary {
  id_users: number;
  username: string;
  profile_picture: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
}

/**
 * A User enriched with aggregated review statistics, used on profile pages.
 */
export interface UserProfile extends User {
  average_rating: number;
  review_count: number;
}

/**
 * Public-facing subset of a User's data, safe to expose to other users
 * (omits email, password, phone number, status).
 */
export interface UserPublic {
  id_users: number;
  username: string;
  profile_picture: string | null;
  first_name: string;
  last_name: string;
  user_city: string;
  user_province: string;
  registration_date: DateString;
  role: UserRole;
}

// Payload for the login request (AuthService.login).
export interface LoginRequest {
  email: string;
  password: string;
}

// Payload for the registration request (AuthService.register).
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_birthday: DateString;
  user_city: string;
  user_province: string;
  user_zipcode: string;
  phone_number?: string | null;
}

// Response returned by login/register endpoints: session token plus the authenticated user.
export interface AuthResponse {
  token: string;
  user: User;
}

// Payload for updating a user's own profile; all fields optional (partial update).
export interface UpdateUserProfileRequest {
  username?: string;
  email?: string;
  password?: string;
  profile_picture?: string | null;
  first_name?: string;
  last_name?: string;
  user_birthday?: DateString;
  user_city?: string;
  user_province?: string;
  user_zipcode?: string;
  phone_number?: string | null;
  remove_profile_picture?: boolean; // If true, clears the existing profile picture.
}