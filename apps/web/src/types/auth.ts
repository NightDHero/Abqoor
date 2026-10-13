export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  profileCompleted: boolean;
  username: string | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
};

export type AuthMode = "login" | "register";
