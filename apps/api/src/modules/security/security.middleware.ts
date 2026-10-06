import { createHash, randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "../../config/env.js";
import { writeSecurityEvent } from "./security-audit.service.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

type RateLimitOptions = {
  keyPrefix: string;
  maxEntries?: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  windowMs: number;
  keyGenerator?: (request: Request) => string;
};

type RateLimitEntry = { count: number; resetAt: number };

const getClientIdentifier = (request: Request) =>
  request.ip || request.socket.remoteAddress || "unknown";

export const requestContext: RequestHandler = (request, response, next) => {
  const incoming = request.get("x-request-id");
  request.requestId =
    incoming && /^[A-Za-z0-9._-]{1,80}$/.test(incoming) ? incoming : randomUUID();
  response.setHeader("X-Request-Id", request.requestId);
  next();
};

export const securityHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  response.setHeader("X-Download-Options", "noopen");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  if (env.isProduction) {
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  next();
};

export const sensitiveResponseCacheControl: RequestHandler = (
  request,
  response,
  next
) => {
  if (/^\/(auth|profile|admin|questions|review|sessions|exams)(?:\/|$)/.test(request.path)) {
    response.setHeader("Cache-Control", "no-store, private");
    response.setHeader("Pragma", "no-cache");
  }
  next();
};

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
export const enforceBrowserRequestOrigin: RequestHandler = (
  request,
  response,
  next
) => {
  if (safeMethods.has(request.method)) {
    next();
    return;
  }
  const origin = request.get("origin");
  const fetchSite = request.get("sec-fetch-site");
  if (origin && !env.frontendOrigins.includes(origin)) {
    response.status(403).json({ message: "Request origin is not allowed." });
    return;
  }
  if (!origin && fetchSite === "cross-site") {
    response.status(403).json({ message: "Cross-site request is not allowed." });
    return;
  }
  next();
};

export const createFixedWindowRateLimit = (
  options: RateLimitOptions
): RequestHandler => {
  const entries = new Map<string, RateLimitEntry>();
  const maxEntries = options.maxEntries ?? 5_000;
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }
  }, Math.min(options.windowMs, 60_000));
  cleanup.unref();

  return (request, response, next) => {
    const now = Date.now();
    const discriminator =
      options.keyGenerator?.(request) ?? getClientIdentifier(request);
    const key = `${options.keyPrefix}:${discriminator}`;
    const existing = entries.get(key);
    const entry =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + options.windowMs };
    entry.count += 1;
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      entries.delete(oldestKey);
    }
    if (options.skipSuccessfulRequests) {
      response.once("finish", () => {
        if (response.statusCode >= 400) return;
        const current = entries.get(key);
        if (current !== entry) return;
        entries.delete(key);
      });
    }
    if (entry.count > options.maxRequests) {
      response.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000)))
      );
      writeSecurityEvent(request, "rate_limit.exceeded", {
        detail: { limiter: options.keyPrefix },
        outcome: "blocked"
      });
      response.status(429).json({ message: options.message });
      return;
    }
    next();
  };
};

const composeRateLimits = (...handlers: RequestHandler[]): RequestHandler =>
  (request, response, next) => {
    let index = 0;
    const runNext = (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }
      const handler = handlers[index++];
      if (!handler) {
        next();
        return;
      }
      handler(request, response, runNext);
    };
    runNext();
  };

const emailFromBody = (request: Request) => {
  const body = request.body as
    | { credential?: unknown; email?: unknown; identifier?: unknown }
    | undefined;
  const account = typeof body?.identifier === "string"
    ? body.identifier
    : typeof body?.email === "string"
      ? body.email
      : typeof body?.credential === "string"
        ? createHash("sha256").update(body.credential).digest("hex")
        : undefined;
  return typeof account === "string" ? account.trim().toLowerCase() : "unknown";
};

const authMessage = "Too many authentication attempts. Please try again later.";
export const authRateLimit = composeRateLimits(
  createFixedWindowRateLimit({
    keyPrefix: "auth-global", keyGenerator: () => "global", maxEntries: 1,
    maxRequests: 5_000, message: authMessage, skipSuccessfulRequests: true,
    windowMs: 15 * 60 * 1000
  }),
  createFixedWindowRateLimit({
    keyPrefix: "auth-ip", maxRequests: 60, message: authMessage,
    skipSuccessfulRequests: true, windowMs: 15 * 60 * 1000
  }),
  createFixedWindowRateLimit({
    keyGenerator: emailFromBody, keyPrefix: "auth-account", maxRequests: 15,
    message: authMessage, skipSuccessfulRequests: true,
    windowMs: 15 * 60 * 1000
  })
);

export const registrationRateLimit = composeRateLimits(
  createFixedWindowRateLimit({
    keyPrefix: "registration-global", keyGenerator: () => "global", maxEntries: 1,
    maxRequests: 1_000, message: authMessage, windowMs: 60 * 60 * 1000
  }),
  createFixedWindowRateLimit({
    keyPrefix: "registration-ip", maxRequests: 20, message: authMessage,
    windowMs: 60 * 60 * 1000
  })
);

export const emailVerificationRateLimit = composeRateLimits(
  createFixedWindowRateLimit({
    keyPrefix: "email-verification-ip", maxRequests: 10,
    message: "طلبات كثيرة لإرسال رمز التحقق. حاول لاحقاً.",
    windowMs: 60 * 60 * 1000
  }),
  createFixedWindowRateLimit({
    keyGenerator: emailFromBody, keyPrefix: "email-verification-account",
    maxRequests: 5,
    message: "طلبات كثيرة لإرسال رمز التحقق. حاول لاحقاً.",
    windowMs: 60 * 60 * 1000
  })
);

const phoneFromBody = (request: Request) => {
  const phone = (request.body as { phoneNumber?: unknown } | undefined)?.phoneNumber;
  return typeof phone === "string" ? phone.trim().replace(/\D/g, "") : "unknown";
};

export const phoneVerificationRateLimit = composeRateLimits(
  createFixedWindowRateLimit({
    keyPrefix: "phone-verification-ip", maxRequests: 10,
    message: "طلبات كثيرة لإرسال رمز الجوال. حاول لاحقاً.",
    windowMs: 60 * 60 * 1000
  }),
  createFixedWindowRateLimit({
    keyGenerator: phoneFromBody, keyPrefix: "phone-verification-destination",
    maxRequests: 5,
    message: "طلبات كثيرة لإرسال رمز الجوال. حاول لاحقاً.",
    windowMs: 60 * 60 * 1000
  })
);

export const accountChangeRateLimit = createFixedWindowRateLimit({
  keyGenerator: (request) => request.user?.id ?? getClientIdentifier(request),
  keyPrefix: "account-change", maxRequests: 10,
  message: "Too many account changes. Please try again later.",
  windowMs: 60 * 60 * 1000
});

export const passwordResetRequestRateLimit = composeRateLimits(
  createFixedWindowRateLimit({
    keyPrefix: "password-reset-ip", maxRequests: 20,
    message: "طلبات كثيرة لاستعادة كلمة المرور. حاول لاحقاً.",
    windowMs: 60 * 60 * 1000
  }),
  createFixedWindowRateLimit({
    keyGenerator: emailFromBody, keyPrefix: "password-reset-account", maxRequests: 5,
    message: "طلبات كثيرة لاستعادة كلمة المرور. حاول لاحقاً.",
    windowMs: 60 * 60 * 1000
  })
);

export const passwordResetConfirmRateLimit = createFixedWindowRateLimit({
  keyPrefix: "password-reset-confirm", maxRequests: 10,
  message: "محاولات كثيرة لتعيين كلمة المرور. حاول لاحقاً.",
  windowMs: 15 * 60 * 1000
});

export const adminImportRateLimit = createFixedWindowRateLimit({
  keyPrefix: "admin-import", maxRequests: 30,
  message: "Too many import requests. Please try again later.",
  windowMs: 60 * 60 * 1000
});

export const studySessionRateLimit = createFixedWindowRateLimit({
  keyGenerator: (request) => request.user?.id ?? getClientIdentifier(request),
  keyPrefix: "study-session", maxRequests: 300,
  message: "Too many study session requests. Please try again later.",
  windowMs: 15 * 60 * 1000
});
