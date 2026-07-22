import type { CookieOptions, Request, Response } from "express";
import { Router } from "express";
import { env } from "../../config/env.js";
import { isStudentProfileCompleted } from "../profile/profile.repository.js";
import { requireAuth } from "./auth.middleware.js";
import {
  AuthError,
  createSessionToken,
  loginUser,
  registerUser
} from "./auth.service.js";
import { toPublicUser, type UserRecord } from "./auth.types.js";

export const authRouter = Router();

const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/"
};

const setSessionCookie = (response: Response, user: { id: string; email: string }) => {
  const token = createSessionToken({ sub: user.id, email: user.email });
  response.cookie(env.sessionCookieName, token, sessionCookieOptions);
};

const toAuthResponseUser = (user: UserRecord) =>
  toPublicUser(user, isStudentProfileCompleted(user.id));

const getCredentials = (request: Request) => {
  const { email, password } = request.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    throw new AuthError("Email and password are required.");
  }

  return { email, password };
};

const handleAuthError = (error: unknown, response: Response) => {
  if (error instanceof AuthError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: "Authentication request failed." });
};

authRouter.post("/register", async (request, response) => {
  try {
    const { email, password } = getCredentials(request);
    const user = await registerUser(email, password);

    setSessionCookie(response, user);
    response.status(201).json({ user: toAuthResponseUser(user) });
  } catch (error) {
    handleAuthError(error, response);
  }
});

authRouter.post("/login", async (request, response) => {
  try {
    const { email, password } = getCredentials(request);
    const user = await loginUser(email, password);

    setSessionCookie(response, user);
    response.status(200).json({ user: toAuthResponseUser(user) });
  } catch (error) {
    handleAuthError(error, response);
  }
});

authRouter.post("/logout", (_request, response) => {
  response.clearCookie(env.sessionCookieName, {
    ...sessionCookieOptions,
    maxAge: undefined
  });
  response.status(204).send();
});

authRouter.get("/me", requireAuth, (request, response) => {
  response.status(200).json({ user: request.user });
});
