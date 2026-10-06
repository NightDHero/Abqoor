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

const toDatabaseDriver = (
  value: string | undefined,
  fallback: "postgres" | "sqlite"
) => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === "postgres" || normalized === "sqlite") {
    return normalized;
  }

  throw new Error("DATABASE_DRIVER must be one of: postgres, sqlite.");
};

const toBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (!value?.trim()) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error("Boolean environment values must be true or false.");
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
const jwtSecret = toOptionalString(process.env.JWT_SECRET) ?? "development-only-change-me";
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
const databaseDriver = toDatabaseDriver(
  process.env.DATABASE_DRIVER,
  nodeEnv === "production" ? "postgres" : "sqlite"
);
const databaseUrl = toOptionalString(process.env.DATABASE_URL);
const databasePath = process.env.DATABASE_PATH ?? "./data/abqoor.sqlite";
const databasePoolMax = toIntegerInRange(
  process.env.DATABASE_POOL_MAX,
  nodeEnv === "production" ? 3 : 5,
  1,
  20,
  "DATABASE_POOL_MAX"
);
const databaseSsl = toBooleanEnv(
  process.env.DATABASE_SSL,
  databaseDriver === "postgres" && nodeEnv === "production"
);
const databaseCaCertificate = toOptionalString(process.env.DATABASE_CA_CERT)?.replace(
  /\\n/g,
  "\n"
);
const storageDriver = toStorageDriver(
  process.env.STORAGE_DRIVER,
  nodeEnv === "production" ? "r2" : "local"
);
const resendApiKey = toOptionalString(process.env.RESEND_API_KEY);
const transactionalEmailFrom =
  toOptionalString(process.env.TRANSACTIONAL_EMAIL_FROM) ??
  toOptionalString(process.env.PASSWORD_RESET_EMAIL_FROM);
const googleClientId = toOptionalString(process.env.GOOGLE_CLIENT_ID);
const twilioAccountSid = toOptionalString(process.env.TWILIO_ACCOUNT_SID);
const twilioAuthToken = toOptionalString(process.env.TWILIO_AUTH_TOKEN);
const twilioVerifyServiceSid = toOptionalString(
  process.env.TWILIO_VERIFY_SERVICE_SID
);
const r2AccountId = toOptionalString(process.env.R2_ACCOUNT_ID);
const r2Bucket = toOptionalString(process.env.R2_BUCKET);
const r2AccessKeyId = toOptionalString(process.env.R2_ACCESS_KEY_ID);
const r2SecretAccessKey = toOptionalString(process.env.R2_SECRET_ACCESS_KEY);
const sessionCookieSameSite = toCookieSameSite(
  process.env.SESSION_COOKIE_SAMESITE,
  nodeEnv === "production" ? "none" : "lax"
);
const passwordResetUrlBase =
  toOptionalString(process.env.PASSWORD_RESET_URL_BASE)?.replace(/\/$/, "") ??
  frontendOrigins[0];
const configuredSessionCookieName =
  process.env.SESSION_COOKIE_NAME?.trim() || "abqoor_session";
const sessionCookieName =
  nodeEnv === "production" && !configuredSessionCookieName.startsWith("__Host-")
    ? `__Host-${configuredSessionCookieName}`
    : configuredSessionCookieName;

if (nodeEnv === "production" && jwtSecret === "development-only-change-me") {
  throw new Error("JWT_SECRET must be set in production.");
}

if (nodeEnv === "production" && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production.");
}

if (nodeEnv === "production" && frontendOrigins.length === 0) {
  throw new Error("FRONTEND_ORIGIN must be set in production.");
}

if (nodeEnv === "production" && databaseDriver !== "postgres") {
  throw new Error("DATABASE_DRIVER must be postgres in production.");
}

if (databaseDriver === "postgres" && !databaseUrl) {
  throw new Error("DATABASE_URL is required when DATABASE_DRIVER=postgres.");
}

if (nodeEnv === "production" && !databaseUrl) {
  throw new Error("DATABASE_URL is required in production.");
}

if (nodeEnv === "production" && sessionCookieSameSite !== "none") {
  throw new Error(
    "SESSION_COOKIE_SAMESITE must be none in production so Vercel can send cookies to the Render API."
  );
}

if (
  storageDriver === "r2" &&
  (!r2AccountId || !r2Bucket || !r2AccessKeyId || !r2SecretAccessKey)
) {
  throw new Error(
    "R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set when STORAGE_DRIVER=r2."
  );
}

if (nodeEnv === "production" && (!resendApiKey || !transactionalEmailFrom)) {
  throw new Error(
    "RESEND_API_KEY and TRANSACTIONAL_EMAIL_FROM are required in production for email verification and password recovery."
  );
}

if (nodeEnv === "production" && !googleClientId) {
  throw new Error("GOOGLE_CLIENT_ID is required in production.");
}

if (
  nodeEnv === "production" &&
  (!twilioAccountSid || !twilioAuthToken || !twilioVerifyServiceSid)
) {
  throw new Error(
    "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID are required in production."
  );
}

export const env = {
  nodeEnv,
  port: toPort(process.env.PORT, 4000),
  frontendOrigins,
  database: {
    caCertificate: databaseCaCertificate,
    driver: databaseDriver,
    path: databasePath,
    poolMax: databasePoolMax,
    ssl: databaseSsl,
    url: databaseUrl
  },
  databasePath,
  jwtSecret,
  jwtAudience: process.env.JWT_AUDIENCE?.trim() || "abqoor-web",
  jwtIssuer: process.env.JWT_ISSUER?.trim() || "abqoor-api",
  sessionAbsoluteTtlMinutes: toIntegerInRange(
    process.env.SESSION_ABSOLUTE_TTL_MINUTES,
    7 * 24 * 60,
    30,
    30 * 24 * 60,
    "SESSION_ABSOLUTE_TTL_MINUTES"
  ),
  sessionIdleTtlMinutes: toIntegerInRange(
    process.env.SESSION_IDLE_TTL_MINUTES,
    12 * 60,
    15,
    7 * 24 * 60,
    "SESSION_IDLE_TTL_MINUTES"
  ),
  sessionCookieName,
  sessionCookieDomain:
    nodeEnv === "production"
      ? undefined
      : toOptionalString(process.env.SESSION_COOKIE_DOMAIN),
  sessionCookieSameSite,
  adminEmails,
  initialAdminEmail,
  initialAdminPassword,
  transactionalEmailFrom,
  passwordResetEmailFrom: transactionalEmailFrom,
  emailVerificationCodeTtlMinutes: toIntegerInRange(
    process.env.EMAIL_VERIFICATION_CODE_TTL_MINUTES,
    10,
    5,
    30,
    "EMAIL_VERIFICATION_CODE_TTL_MINUTES"
  ),
  emailVerificationResendCooldownSeconds: toIntegerInRange(
    process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    60,
    30,
    300,
    "EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS"
  ),
  passwordResetTokenTtlMinutes: toIntegerInRange(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    30,
    5,
    120,
    "PASSWORD_RESET_TOKEN_TTL_MINUTES"
  ),
  passwordResetUrlBase,
  resendApiKey,
  googleClientId,
  phoneVerificationResendCooldownSeconds: toIntegerInRange(
    process.env.PHONE_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    60,
    30,
    300,
    "PHONE_VERIFICATION_RESEND_COOLDOWN_SECONDS"
  ),
  twilio: {
    accountSid: twilioAccountSid,
    authToken: twilioAuthToken,
    verifyServiceSid: twilioVerifyServiceSid
  },
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
