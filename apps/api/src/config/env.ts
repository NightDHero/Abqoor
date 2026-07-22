import "dotenv/config";

const toPort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET ?? "development-only-change-me";
const corsOrigins = (
  process.env.CORS_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (nodeEnv === "production" && jwtSecret === "development-only-change-me") {
  throw new Error("JWT_SECRET must be set in production.");
}

export const env = {
  nodeEnv,
  port: toPort(process.env.PORT, 4000),
  corsOrigins,
  databasePath: process.env.DATABASE_PATH ?? "./data/abqoor.sqlite",
  jwtSecret,
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "abqoor_session",
  adminEmails,
  pdftoppmPath: process.env.PDFTOPPM_PATH,
  isProduction: nodeEnv === "production"
};
