import type { CookieOptions, Request, Response } from "express";
import { Router } from "express";
import { env } from "../../config/env.js";
import { isUserAdministrator } from "../admin/admin.service.js";
import { getStudentProfileIdentity } from "../profile/profile.repository.js";
import {
  authRateLimit,
  passwordResetConfirmRateLimit,
  passwordResetRequestRateLimit
} from "../security/security.middleware.js";
import { requireAuth } from "./auth.middleware.js";
import {
  AuthError,
  addPhoneNumber,
  createSessionToken,
  loginUser,
  registerStudent,
  requestPasswordReset,
  resetPassword
} from "./auth.service.js";
import { toPublicUser, type UserRecord } from "./auth.types.js";

export const authRouter = Router();

const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: env.sessionCookieSameSite,
  secure: env.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
  domain: env.sessionCookieDomain
};

const setSessionCookie = (
  response: Response,
  user: { id: string; email: string; session_version: number }
) => {
  const token = createSessionToken({
    sub: user.id,
    email: user.email,
    ver: user.session_version
  });
  response.cookie(env.sessionCookieName, token, sessionCookieOptions);
};

const toAuthResponseUser = async (user: UserRecord) => {
  const profileIdentity = await getStudentProfileIdentity(user.id);
  return toPublicUser(
    user,
    profileIdentity.profileCompleted,
    profileIdentity.username,
    await isUserAdministrator(user.id, user.email)
  );
};

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

authRouter.post("/register", authRateLimit, async (request, response) => {
  try {
    const { email, password } = getCredentials(request);
    const { passwordConfirmation, phoneNumber } = request.body as {
      passwordConfirmation?: unknown;
      phoneNumber?: unknown;
    };
    if (
      typeof passwordConfirmation !== "string" ||
      typeof phoneNumber !== "string"
    ) {
      throw new AuthError("رقم الجوال وتأكيد كلمة المرور مطلوبان.");
    }
    const user = await registerStudent({
      email,
      password,
      passwordConfirmation,
      phoneNumber
    });

    setSessionCookie(response, user);
    response.status(201).json({ user: await toAuthResponseUser(user) });
  } catch (error) {
    handleAuthError(error, response);
  }
});

authRouter.post(
  "/forgot-password",
  passwordResetRequestRateLimit,
  async (request, response) => {
    const { email, phoneNumber } = request.body as {
      email?: unknown;
      phoneNumber?: unknown;
    };
    if (typeof email === "string" && typeof phoneNumber === "string") {
      await requestPasswordReset(email, phoneNumber).catch(() => undefined);
    }

    response.status(202).json({
      message:
        "إذا كانت البيانات مرتبطة بحساب، ستصلك تعليمات استعادة كلمة المرور."
    });
  }
);

authRouter.post(
  "/reset-password",
  passwordResetConfirmRateLimit,
  async (request, response) => {
    try {
      const { password, passwordConfirmation, token } = request.body as {
        password?: unknown;
        passwordConfirmation?: unknown;
        token?: unknown;
      };
      if (
        typeof password !== "string" ||
        typeof passwordConfirmation !== "string" ||
        typeof token !== "string"
      ) {
        throw new AuthError("رابط الاستعادة وكلمة المرور وتأكيدها مطلوبة.");
      }
      await resetPassword({ password, passwordConfirmation, token });
      response.clearCookie(env.sessionCookieName, {
        ...sessionCookieOptions,
        maxAge: undefined
      });
      response.status(200).json({ message: "تم تغيير كلمة المرور بنجاح." });
    } catch (error) {
      handleAuthError(error, response);
    }
  }
);

authRouter.post("/login", authRateLimit, async (request, response) => {
  try {
    const { email, password } = getCredentials(request);
    const user = await loginUser(email, password);

    setSessionCookie(response, user);
    response.status(200).json({ user: await toAuthResponseUser(user) });
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

authRouter.patch("/phone", requireAuth, authRateLimit, async (request, response) => {
  try {
    const { password, phoneNumber } = request.body as {
      password?: unknown;
      phoneNumber?: unknown;
    };
    if (typeof password !== "string" || typeof phoneNumber !== "string") {
      throw new AuthError("رقم الجوال وكلمة المرور مطلوبان.");
    }
    const user = await addPhoneNumber(request.user?.id ?? "", phoneNumber, password);
    response.status(200).json({ user: await toAuthResponseUser(user) });
  } catch (error) {
    handleAuthError(error, response);
  }
});

authRouter.get("/me", requireAuth, (request, response) => {
  response.status(200).json({ user: request.user });
});
