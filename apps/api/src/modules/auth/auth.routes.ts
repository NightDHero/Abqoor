import type { CookieOptions, Request, Response } from "express";
import { Router } from "express";
import { env } from "../../config/env.js";
import { isUserAdministrator } from "../admin/admin.service.js";
import { getStudentProfileIdentity } from "../profile/profile.repository.js";
import {
  accountChangeRateLimit,
  authRateLimit,
  emailVerificationRateLimit,
  passwordResetConfirmRateLimit,
  passwordResetRequestRateLimit,
  phoneVerificationRateLimit,
  registrationRateLimit
} from "../security/security.middleware.js";
import { requireAuth } from "./auth.middleware.js";
import {
  AuthError,
  addPhoneNumber,
  createSessionToken,
  loginWithGoogle,
  linkGoogleIdentity,
  loginUser,
  registerStudent,
  requestPasswordReset,
  resetPassword
} from "./auth.service.js";
import { validatePassword } from "./auth.service.js";
import {
  requestRegistrationCode,
  verifyRegistrationCode
} from "./email-verification.service.js";
import {
  requestPhoneVerification,
  verifyPhoneCode
} from "./phone-verification.service.js";
import { revokeAuthSession } from "./auth.service.js";
import { toPublicUser, type UserRecord } from "./auth.types.js";
import {
  fingerprintIdentifier,
  writeSecurityEvent
} from "../security/security-audit.service.js";
import { asyncHandler } from "../security/async-handler.js";

export const authRouter = Router();

const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: env.sessionCookieSameSite,
  secure: env.isProduction,
  maxAge: env.sessionAbsoluteTtlMinutes * 60 * 1000,
  path: "/",
  domain: env.sessionCookieDomain
};

const setSessionCookie = async (
  response: Response,
  user: { id: string; email: string; session_version: number }
) => {
  const token = await createSessionToken({
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
  const { email, identifier, password } = request.body as {
    email?: unknown;
    identifier?: unknown;
    password?: unknown;
  };

  const account = typeof identifier === "string" ? identifier : email;
  if (typeof account !== "string" || typeof password !== "string") {
    throw new AuthError("البريد الإلكتروني أو رقم الجوال وكلمة المرور مطلوبان.");
  }

  return { identifier: account, password };
};

const handleAuthError = (error: unknown, response: Response) => {
  if (error instanceof AuthError) {
    response.status(error.statusCode).json({
      ...(error.code ? { code: error.code } : {}),
      message: error.message
    });
    return;
  }

  response.status(500).json({ message: "Authentication request failed." });
};

authRouter.post(
  "/register/code",
  emailVerificationRateLimit,
  async (request, response) => {
    try {
      const { email } = request.body as { email?: unknown };
      if (typeof email !== "string") {
        throw new AuthError("البريد الإلكتروني مطلوب.");
      }
      const result = await requestRegistrationCode(email);
      writeSecurityEvent(request, "auth.email_verification_requested", {
        detail: { delivery: result.delivered ? "sent" : "not_sent" },
        outcome: "success"
      });
      response.status(202).json({
        message: "إذا كان البريد صالحاً لإنشاء حساب، فستصلك رسالة برمز التحقق."
      });
    } catch (error) {
      if (error instanceof AuthError && error.statusCode === 400) {
        handleAuthError(error, response);
        return;
      }
      writeSecurityEvent(request, "auth.email_verification_requested", {
        detail: { delivery: "failed" },
        outcome: "failure"
      });
      response.status(202).json({
        message: "إذا كان البريد صالحاً لإنشاء حساب، فستصلك رسالة برمز التحقق."
      });
    }
  }
);

authRouter.post(
  "/register/phone-code",
  phoneVerificationRateLimit,
  async (request, response) => {
    const { phoneNumber } = request.body as { phoneNumber?: unknown };
    if (typeof phoneNumber !== "string") {
      response.status(400).json({ message: "رقم الجوال مطلوب." });
      return;
    }
    try {
      const result = await requestPhoneVerification({
        phoneNumber,
        purpose: "registration"
      });
      writeSecurityEvent(request, "auth.phone_verification_requested", {
        detail: { delivery: result.delivered ? "sent" : "not_sent" },
        outcome: "success"
      });
    } catch {
      writeSecurityEvent(request, "auth.phone_verification_requested", {
        detail: { delivery: "failed" },
        outcome: "failure"
      });
    }
    response.status(202).json({
      message: "إذا كان الرقم صالحاً للاستخدام، فستصلك رسالة برمز التحقق."
    });
  }
);

authRouter.post("/register", registrationRateLimit, async (request, response) => {
  try {
    const { email, password, passwordConfirmation, phoneNumber, phoneVerificationCode, verificationCode } = request.body as {
      email?: unknown;
      password?: unknown;
      passwordConfirmation?: unknown;
      phoneNumber?: unknown;
      phoneVerificationCode?: unknown;
      verificationCode?: unknown;
    };
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof passwordConfirmation !== "string" ||
      typeof phoneNumber !== "string" ||
      typeof phoneVerificationCode !== "string" ||
      typeof verificationCode !== "string"
    ) {
      throw new AuthError("رقم الجوال وتأكيد كلمة المرور ورمز التحقق مطلوبة.");
    }
    if (password !== passwordConfirmation) {
      throw new AuthError("كلمة المرور وتأكيدها غير متطابقين.");
    }
    validatePassword(password);
    const verifiedPhoneNumber = await verifyPhoneCode(
      phoneNumber,
      phoneVerificationCode
    );
    await verifyRegistrationCode(email, verificationCode);
    const user = await registerStudent({
      email,
      password,
      passwordConfirmation,
      phoneNumber: verifiedPhoneNumber,
      phoneVerified: true
    });

    await setSessionCookie(response, user);
    writeSecurityEvent(request, "auth.registration", {
      actorUserId: user.id,
      outcome: "success"
    });
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
    const delivered = typeof email === "string" && typeof phoneNumber === "string"
      ? await requestPasswordReset(email, phoneNumber).catch(() => false)
      : false;

    response.status(202).json({
      message:
        "إذا كانت البيانات مرتبطة بحساب، ستصلك تعليمات استعادة كلمة المرور."
    });
    writeSecurityEvent(request, "auth.password_reset_requested", {
      detail: {
        account: typeof email === "string" ? fingerprintIdentifier(email) : "invalid",
        delivery: delivered ? "sent" : "not_sent"
      },
      outcome: "success"
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
      writeSecurityEvent(request, "auth.password_reset", { outcome: "success" });
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
    const { identifier, password } = getCredentials(request);
    const user = await loginUser(identifier, password);

    await setSessionCookie(response, user);
    const publicUser = await toAuthResponseUser(user);
    writeSecurityEvent(request, "auth.login", {
      actorUserId: user.id,
      outcome: "success"
    });
    if (publicUser.isAdmin) {
      writeSecurityEvent(request, "admin.login", {
        actorUserId: user.id,
        outcome: "success"
      });
    }
    response.status(200).json({ user: publicUser });
  } catch (error) {
    writeSecurityEvent(request, "auth.login", {
      detail: {
        account: fingerprintIdentifier(
          typeof request.body?.identifier === "string"
            ? request.body.identifier
            : typeof request.body?.email === "string"
              ? request.body.email
              : "invalid"
        )
      },
      outcome: "failure"
    });
    handleAuthError(error, response);
  }
});

authRouter.post("/google", authRateLimit, async (request, response) => {
  try {
    const { credential } = request.body as { credential?: unknown };
    if (typeof credential !== "string") {
      throw new AuthError("بيانات تسجيل الدخول عبر Google مطلوبة.");
    }
    const user = await loginWithGoogle(credential);
    await setSessionCookie(response, user);
    writeSecurityEvent(request, "auth.google_login", {
      actorUserId: user.id,
      outcome: "success"
    });
    response.status(200).json({ user: await toAuthResponseUser(user) });
  } catch (error) {
    writeSecurityEvent(request, "auth.google_login", { outcome: "failure" });
    handleAuthError(error, response);
  }
});

authRouter.post("/google/link", authRateLimit, async (request, response) => {
  try {
    const { credential, password } = request.body as {
      credential?: unknown;
      password?: unknown;
    };
    if (typeof credential !== "string" || typeof password !== "string") {
      throw new AuthError("بيانات Google وكلمة مرور حساب عبقور مطلوبة.");
    }
    const user = await linkGoogleIdentity(credential, password);
    await setSessionCookie(response, user);
    writeSecurityEvent(request, "auth.google_link", {
      actorUserId: user.id,
      outcome: "success"
    });
    response.status(200).json({ user: await toAuthResponseUser(user) });
  } catch (error) {
    writeSecurityEvent(request, "auth.google_link", { outcome: "failure" });
    handleAuthError(error, response);
  }
});

authRouter.post("/logout", requireAuth, asyncHandler(async (request, response) => {
  if (request.authSessionId) await revokeAuthSession(request.authSessionId);
  response.clearCookie(env.sessionCookieName, {
    ...sessionCookieOptions,
    maxAge: undefined
  });
  response.status(204).send();
  writeSecurityEvent(request, "auth.logout", {
    actorUserId: request.user?.id,
    outcome: "success"
  });
}));

authRouter.post("/phone/code", requireAuth, phoneVerificationRateLimit, async (request, response) => {
  try {
    const { phoneNumber } = request.body as { phoneNumber?: unknown };
    if (typeof phoneNumber !== "string") {
      throw new AuthError("رقم الجوال مطلوب.");
    }
    await requestPhoneVerification({
      phoneNumber,
      purpose: "link",
      userId: request.user?.id
    });
    response.status(202).json({ message: "أرسلنا رمز التحقق إلى رقم الجوال." });
  } catch (error) {
    handleAuthError(error, response);
  }
});

authRouter.patch("/phone", requireAuth, accountChangeRateLimit, async (request, response) => {
  try {
    const { code, phoneNumber } = request.body as {
      code?: unknown;
      phoneNumber?: unknown;
    };
    if (typeof code !== "string" || typeof phoneNumber !== "string") {
      throw new AuthError("رقم الجوال ورمز التحقق مطلوبان.");
    }
    const verifiedPhoneNumber = await verifyPhoneCode(phoneNumber, code);
    const user = await addPhoneNumber(request.user?.id ?? "", verifiedPhoneNumber);
    response.status(200).json({ user: await toAuthResponseUser(user) });
  } catch (error) {
    handleAuthError(error, response);
  }
});

authRouter.get("/me", requireAuth, (request, response) => {
  response.status(200).json({ user: request.user });
});
