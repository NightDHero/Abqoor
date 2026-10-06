export type UserRecord = {
  id: string;
  email: string;
  email_verified_at: string | null;
  password_hash: string;
  phone_number: string | null;
  phone_verified_at: string | null;
  session_version: number;
  created_at: string;
  updated_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  createdAt: string;
  profileCompleted: boolean;
  username: string | null;
  isAdmin: boolean;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  jti: string;
  authTime: number;
  ver?: number;
};

export const toPublicUser = (
  user: UserRecord,
  profileCompleted = false,
  username: string | null = null,
  isAdmin = false
): PublicUser => ({
  id: user.id,
  email: user.email,
  emailVerified: Boolean(user.email_verified_at),
  phoneNumber: user.phone_number,
  phoneVerified: Boolean(user.phone_verified_at),
  createdAt: user.created_at,
  profileCompleted,
  username,
  isAdmin
});
