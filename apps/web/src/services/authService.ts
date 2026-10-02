import type { AuthMode, User } from "../types/auth";
import { apiRequest } from "./http";

type AuthResponse = {
  user: User;
};

export const authService = {
  getCurrentUser: async () => {
    return apiRequest<AuthResponse>("/auth/me");
  },
  authenticate: async (
    mode: AuthMode,
    input: {
      email: string;
      password: string;
      passwordConfirmation?: string;
      phoneNumber?: string;
    }
  ) => {
    return apiRequest<AuthResponse>(`/auth/${mode}`, {
      body: JSON.stringify(input),
      method: "POST"
    });
  },
  requestPasswordReset: (input: { email: string; phoneNumber: string }) =>
    apiRequest<{ message: string }>("/auth/forgot-password", {
      body: JSON.stringify(input),
      method: "POST"
    }),
  resetPassword: (input: {
    password: string;
    passwordConfirmation: string;
    token: string;
  }) =>
    apiRequest<{ message: string }>("/auth/reset-password", {
      body: JSON.stringify(input),
      method: "POST"
    }),
  addPhoneNumber: (input: { password: string; phoneNumber: string }) =>
    apiRequest<AuthResponse>("/auth/phone", {
      body: JSON.stringify(input),
      method: "PATCH"
    }),
  logout: async () => {
    await apiRequest<null>("/auth/logout", {
      method: "POST"
    });
  }
};
