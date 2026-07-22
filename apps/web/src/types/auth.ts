export type User = {
  id: string;
  email: string;
  createdAt: string;
  profileCompleted: boolean;
};

export type AuthMode = "login" | "register";
