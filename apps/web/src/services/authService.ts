import type { AuthMode, User } from "../types/auth";
import { apiRequest } from "./http";

type AuthResponse = {
  user: User;
};

export const authService = {
  getCurrentUser: async () => {
    return apiRequest<AuthResponse>("/auth/me");
  },
  authenticate: async (mode: AuthMode, input: { email: string; password: string }) => {
    return apiRequest<AuthResponse>(`/auth/${mode}`, {
      body: JSON.stringify(input),
      method: "POST"
    });
  },
  logout: async () => {
    await apiRequest<null>("/auth/logout", {
      method: "POST"
    });
  }
};
