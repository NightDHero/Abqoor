export type User = {
  id: string;
  email: string;
  createdAt: string;
  profileCompleted: boolean;
  username: string | null;
};

export type AuthMode = "login" | "register";
