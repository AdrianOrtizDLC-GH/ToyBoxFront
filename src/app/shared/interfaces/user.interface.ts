export type DateString = string;
import { UserRole } from "../enums/user-role.enum";
import { UserStatus } from "../enums/user-status.enum";

export { UserRole } from "../enums/user-role.enum";
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

export interface UserSummary {
  id_users: number;
  username: string;
  profile_picture: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
}

export interface UserProfile extends User {
  average_rating: number;
  review_count: number;
}

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

export interface LoginRequest {
  email: string;
  password: string;
}

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

export interface AuthResponse {
  token: string;
  user: User;
}

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
  remove_profile_picture?: boolean;
}