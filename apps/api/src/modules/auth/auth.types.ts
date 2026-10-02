export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  phone_number: string | null;
  session_version: number;
  created_at: string;
  updated_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  phoneNumber: string | null;
  createdAt: string;
  profileCompleted: boolean;
  username: string | null;
  isAdmin: boolean;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
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
  phoneNumber: user.phone_number,
  createdAt: user.created_at,
  profileCompleted,
  username,
  isAdmin
});
