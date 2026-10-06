export type User = {
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

export type AuthMode = "login" | "register";
