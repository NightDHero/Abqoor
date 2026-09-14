import type { NextFunction, Request, RequestHandler, Response } from "express";

type RateLimitOptions = {
  keyPrefix: string;
  maxRequests: number;
  message: string;
  windowMs: number;
  keyGenerator?: (request: Request) => string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const getClientIdentifier = (request: Request) =>
  request.ip || request.socket.remoteAddress || "unknown";

export const securityHeaders: RequestHandler = (
  _request: Request,
  response: Response,
  next: NextFunction
) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  response.setHeader("X-Download-Options", "noopen");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  next();
};

export const createFixedWindowRateLimit = (
  options: RateLimitOptions
): RequestHandler => {
  const entries = new Map<string, RateLimitEntry>();

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();

    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) {
        entries.delete(key);
      }
    }

    const discriminator =
      options.keyGenerator?.(request) ?? getClientIdentifier(request);
    const key = `${options.keyPrefix}:${discriminator}`;
    const existing = entries.get(key);
    const entry =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + options.windowMs };

    entry.count += 1;
    entries.set(key, entry);

    if (entry.count > options.maxRequests) {
      response.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000)))
      );
      response.status(429).json({ message: options.message });
      return;
    }

    next();
  };
};

const emailFromBody = (request: Request) => {
  const email = (request.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "unknown";
};

export const authRateLimit = createFixedWindowRateLimit({
  keyGenerator: (request) =>
    `${getClientIdentifier(request)}:${emailFromBody(request)}`,
  keyPrefix: "auth",
  maxRequests: 30,
  message: "Too many authentication attempts. Please try again later.",
  windowMs: 15 * 60 * 1000
});

export const adminImportRateLimit = createFixedWindowRateLimit({
  keyPrefix: "admin-import",
  maxRequests: 30,
  message: "Too many import requests. Please try again later.",
  windowMs: 60 * 60 * 1000
});
