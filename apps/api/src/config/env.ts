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

const toStorageDriver = (value: string | undefined, fallback: "local" | "r2") => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === "local" || normalized === "r2") {
    return normalized;
  }

  throw new Error("STORAGE_DRIVER must be one of: local, r2.");
};

const toIntegerInRange = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
  label: string
) => {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
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
const initialAdminEmail = toOptionalString(process.env.INITIAL_ADMIN_EMAIL);
const initialAdminPassword = toOptionalString(process.env.INITIAL_ADMIN_PASSWORD);
const storageDriver = toStorageDriver(
  process.env.STORAGE_DRIVER,
  nodeEnv === "production" ? "r2" : "local"
);
const r2AccountId = toOptionalString(process.env.R2_ACCOUNT_ID);
const r2Bucket = toOptionalString(process.env.R2_BUCKET);
const r2AccessKeyId = toOptionalString(process.env.R2_ACCESS_KEY_ID);
const r2SecretAccessKey = toOptionalString(process.env.R2_SECRET_ACCESS_KEY);

if (nodeEnv === "production" && jwtSecret === "development-only-change-me") {
  throw new Error("JWT_SECRET must be set in production.");
}

if (nodeEnv === "production" && frontendOrigins.length === 0) {
  throw new Error("FRONTEND_ORIGIN must be set in production.");
}

if (
  storageDriver === "r2" &&
  (!r2AccountId || !r2Bucket || !r2AccessKeyId || !r2SecretAccessKey)
) {
  throw new Error(
    "R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set when STORAGE_DRIVER=r2."
  );
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
  initialAdminEmail,
  initialAdminPassword,
  pdftoppmPath: process.env.PDFTOPPM_PATH,
  storageDriver,
  r2: {
    accountId: r2AccountId,
    bucket: r2Bucket,
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
    publicBaseUrl: toOptionalString(process.env.R2_PUBLIC_BASE_URL)
  },
  questionImageWebpQuality: toIntegerInRange(
    process.env.QUESTION_IMAGE_WEBP_QUALITY,
    88,
    1,
    100,
    "QUESTION_IMAGE_WEBP_QUALITY"
  ),
  isProduction: nodeEnv === "production"
};
