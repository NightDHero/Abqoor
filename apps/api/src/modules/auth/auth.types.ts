export type UserRecord = {
  id: string;
  email: string;
  email_verified_at: string | null;
  password_hash: string;
  must_change_password: number;
  session_version: number;
  created_at: string;
  updated_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  profileCompleted: boolean;
  username: string | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
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
  createdAt: user.created_at,
  profileCompleted,
  username,
  isAdmin,
  mustChangePassword: user.must_change_password === 1
});
