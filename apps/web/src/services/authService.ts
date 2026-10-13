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
      email?: string;
      identifier?: string;
      password: string;
      passwordConfirmation?: string;
      verificationCode?: string;
    }
  ) => {
    return apiRequest<AuthResponse>(`/auth/${mode}`, {
      body: JSON.stringify(input),
      method: "POST"
    });
  },
  requestRegistrationCode: (email: string) =>
    apiRequest<{ message: string }>("/auth/register/code", {
      body: JSON.stringify({ email }),
      method: "POST"
    }),
  authenticateWithGoogle: (credential: string) =>
    apiRequest<AuthResponse>("/auth/google", {
      body: JSON.stringify({ credential }),
      method: "POST"
    }),
  linkGoogleAccount: (input: { credential: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/google/link", {
      body: JSON.stringify(input),
      method: "POST"
    }),
  requestPasswordReset: (input: { email: string }) =>
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
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
  }) => apiRequest<{ message: string }>("/auth/change-password", {
    body: JSON.stringify(input),
    method: "POST"
  }),
  logout: async () => {
    await apiRequest<null>("/auth/logout", {
      method: "POST"
    });
  }
};
