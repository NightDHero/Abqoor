import "dotenv/config";

const toPort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toCookieSameSite = (
  value: string | undefined,
  fallback: "lax" | "none" | "strict"
) => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "lax" ||
    normalized === "none" ||
    normalized === "strict"
  ) {
    return normalized;
  }

  throw new Error("SESSION_COOKIE_SAMESITE must be one of: lax, none, strict.");
};

const toOptionalString = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const toFrontendOrigins = (value: string | undefined) => {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean)
    .map((origin) => {
      let parsed: URL;

      try {
        parsed = new URL(origin);
      } catch {
        throw new Error(
          `Invalid frontend origin "${origin}". Use an absolute http(s) origin.`
        );
      }

      if (
        (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
        parsed.username ||
        parsed.password ||
        (parsed.pathname !== "/" && parsed.pathname !== "") ||
        parsed.search ||
        parsed.hash
      ) {
        throw new Error(
          `Invalid frontend origin "${origin}". Paths, credentials, query strings, and fragments are not allowed.`
        );
      }

      return parsed.origin;
    })
    .filter((origin, index, origins) => origins.indexOf(origin) === index);
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET ?? "development-only-change-me";
const frontendOriginValue =
  process.env.FRONTEND_ORIGIN ??
  process.env.CORS_ORIGIN ??
  (nodeEnv === "production"
    ? undefined
    : "http://localhost:5173,http://127.0.0.1:5173");
const frontendOrigins = toFrontendOrigins(frontendOriginValue);
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (nodeEnv === "production" && jwtSecret === "development-only-change-me") {
  throw new Error("JWT_SECRET must be set in production.");
}

if (nodeEnv === "production" && frontendOrigins.length === 0) {
  throw new Error("FRONTEND_ORIGIN must be set in production.");
}

export const env = {
  nodeEnv,
  port: toPort(process.env.PORT, 4000),
  frontendOrigins,
  databasePath: process.env.DATABASE_PATH ?? "./data/abqoor.sqlite",
  jwtSecret,
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "abqoor_session",
  sessionCookieDomain: toOptionalString(process.env.SESSION_COOKIE_DOMAIN),
  sessionCookieSameSite: toCookieSameSite(
    process.env.SESSION_COOKIE_SAMESITE,
    nodeEnv === "production" ? "none" : "lax"
  ),
  adminEmails,
  pdftoppmPath: process.env.PDFTOPPM_PATH,
  isProduction: nodeEnv === "production"
};
