export type User = {
  id: string;
  email: string;
  phoneNumber: string | null;
  createdAt: string;
  profileCompleted: boolean;
  username: string | null;
  isAdmin: boolean;
};

export type AuthMode = "login" | "register";
