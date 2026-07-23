export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  createdAt: string;
  profileCompleted: boolean;
  username: string | null;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export const toPublicUser = (
  user: UserRecord,
  profileCompleted = false,
  username: string | null = null
): PublicUser => ({
  id: user.id,
  email: user.email,
  createdAt: user.created_at,
  profileCompleted,
  username
});
