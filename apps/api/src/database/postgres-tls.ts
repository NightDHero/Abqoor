export type PostgresSslMode = "disable" | "require" | "verify-full";

type PostgresSslConfig = {
  ca?: string;
  rejectUnauthorized: boolean;
};

type ResolvePostgresConnectionInput = {
  caCertificate?: string;
  connectionString: string;
  defaultMode: PostgresSslMode;
  enforceTls: boolean;
  explicitMode?: PostgresSslMode;
};

const sslFileParameters = ["sslcert", "sslkey", "sslrootcert"] as const;

export const parsePostgresSslMode = (
  value: string | undefined,
  label = "DATABASE_SSL_MODE"
): PostgresSslMode | undefined => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (
    normalized === "disable" ||
    normalized === "require" ||
    normalized === "verify-full"
  ) {
    return normalized;
  }

  throw new Error(`${label} must be one of: disable, require, verify-full.`);
};

export const createPostgresSslConfig = (
  mode: PostgresSslMode,
  caCertificate?: string
): PostgresSslConfig | undefined => {
  if (mode === "disable") return undefined;
  if (mode === "require") {
    if (caCertificate) {
      throw new Error(
        "DATABASE_CA_CERT cannot be used with DATABASE_SSL_MODE=require. Use verify-full to verify a CA."
      );
    }
    return { rejectUnauthorized: false };
  }

  return {
    ...(caCertificate ? { ca: caCertificate } : {}),
    rejectUnauthorized: true
  };
};

export const resolvePostgresConnectionConfig = (
  input: ResolvePostgresConnectionInput
) => {
  let parsed: URL;
  try {
    parsed = new URL(input.connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol.");
  }

  if (sslFileParameters.some((parameter) => parsed.searchParams.has(parameter))) {
    throw new Error(
      "Remove sslcert, sslkey, and sslrootcert from DATABASE_URL. Use DATABASE_CA_CERT for trusted CA verification."
    );
  }
  if (parsed.searchParams.has("ssl")) {
    throw new Error(
      "Remove the ssl query parameter from DATABASE_URL and use DATABASE_SSL_MODE instead."
    );
  }

  const urlMode = parsePostgresSslMode(
    parsed.searchParams.get("sslmode") ?? undefined,
    "DATABASE_URL sslmode"
  );
  if (input.explicitMode && urlMode && input.explicitMode !== urlMode) {
    throw new Error(
      "DATABASE_SSL_MODE conflicts with the sslmode value in DATABASE_URL. Configure TLS in one place."
    );
  }

  const mode = input.explicitMode ?? urlMode ?? input.defaultMode;
  if (input.enforceTls && mode === "disable") {
    throw new Error("PostgreSQL TLS cannot be disabled in production.");
  }

  // node-postgres replaces an explicit ssl object when sslmode is left in the URL.
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("uselibpqcompat");

  return {
    connectionString: parsed.toString(),
    mode,
    ssl: createPostgresSslConfig(mode, input.caCertificate)
  };
};
