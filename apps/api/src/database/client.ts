import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import pg from "pg";
import { env } from "../config/env.js";
import * as initialPostgresSchema from "./postgres-migrations/001_initial_schema.js";
import { initializeSqliteSchema } from "./sqlite-schema.js";

const { Pool, types } = pg;

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

type QueryParameters = Record<string, unknown> | readonly unknown[] | unknown;

export type DatabaseRunResult = {
  changes: number;
};

export type DatabaseStatement<
  BindParameters = unknown,
  Result = unknown
> = {
  all: (...params: BindParameters extends readonly unknown[] ? BindParameters : QueryParameters[]) =>
    | Result[]
    | Promise<Result[]>;
  get: (...params: BindParameters extends readonly unknown[] ? BindParameters : QueryParameters[]) =>
    | Result
    | undefined
    | Promise<Result | undefined>;
  run: (...params: BindParameters extends readonly unknown[] ? BindParameters : QueryParameters[]) =>
    | DatabaseRunResult
    | Promise<DatabaseRunResult>;
};

type PostgresMigration = {
  id: string;
  sql: string;
};

const postgresMigrations: PostgresMigration[] = [initialPostgresSchema];
const transactionClientStorage = new AsyncLocalStorage<pg.PoolClient>();

let sqliteDatabase: Database.Database | null = null;
let postgresPool: pg.Pool | null = null;
let databaseInitialization: Promise<void> | null = null;
let databaseInitialized = false;

const databasePath = resolve(process.cwd(), env.database.path);

const normalizeSql = (sql: string) => {
  return sql
    .replace(
      /username\s*=\s*@username\s+COLLATE\s+NOCASE/gi,
      "LOWER(username) = LOWER(@username)"
    );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const collectParameters = (params: readonly QueryParameters[]) => {
  if (params.length === 1) {
    const [first] = params;
    if (Array.isArray(first)) {
      return first;
    }
    if (isRecord(first)) {
      return first;
    }
  }

  return params;
};

const toPostgresQuery = (sql: string, params: readonly QueryParameters[]) => {
  const normalizedSql = normalizeSql(sql);
  const parameterInput = collectParameters(params);

  if (isRecord(parameterInput)) {
    const values: unknown[] = [];
    const parameterIndexes = new Map<string, number>();
    const text = normalizedSql.replace(
      /@([A-Za-z_][A-Za-z0-9_]*)/g,
      (_match, name: string) => {
        const existingIndex = parameterIndexes.get(name);
        if (existingIndex !== undefined) {
          return `$${existingIndex}`;
        }

        values.push(parameterInput[name] ?? null);
        const index = values.length;
        parameterIndexes.set(name, index);
        return `$${index}`;
      }
    );

    return { text, values };
  }

  const values = Array.isArray(parameterInput) ? [...parameterInput] : [parameterInput];
  let index = 0;
  const text = normalizedSql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });

  return { text, values: params.length === 0 ? [] : values };
};

const getPostgresPool = () => {
  if (!postgresPool) {
    postgresPool = new Pool({
      connectionString: env.database.url,
      max: env.database.poolMax,
      ssl: env.database.ssl ? { rejectUnauthorized: false } : undefined
    });
  }

  return postgresPool;
};

const initializeSqliteDatabase = () => {
  if (sqliteDatabase) {
    return sqliteDatabase;
  }

  mkdirSync(dirname(databasePath), { recursive: true });

  sqliteDatabase = new Database(databasePath);
  sqliteDatabase.pragma("journal_mode = WAL");
  sqliteDatabase.pragma("foreign_keys = ON");
  sqliteDatabase.pragma("busy_timeout = 5000");
  sqliteDatabase.pragma("synchronous = NORMAL");
  initializeSqliteSchema(sqliteDatabase);

  return sqliteDatabase;
};

const runPostgresMigrations = async (client: pg.PoolClient) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS database_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  for (const migration of postgresMigrations) {
    const existing = await client.query(
      "SELECT id FROM database_migrations WHERE id = $1",
      [migration.id]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO database_migrations (id, applied_at) VALUES ($1, $2)",
        [migration.id, new Date().toISOString()]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
};

const initializePostgresDatabase = async () => {
  const pool = getPostgresPool();
  let client: pg.PoolClient | null = null;

  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    await runPostgresMigrations(client);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.replace(env.database.url ?? "", "[redacted DATABASE_URL]")
        : "Unknown database error.";
    throw new Error(`PostgreSQL database initialization failed: ${message}`);
  } finally {
    client?.release();
  }
};

export const initializeDatabase = async () => {
  if (databaseInitialized) {
    return;
  }

  if (!databaseInitialization) {
    databaseInitialization =
      env.database.driver === "postgres"
        ? initializePostgresDatabase()
        : Promise.resolve().then(() => {
            initializeSqliteDatabase();
          });
  }

  await databaseInitialization;
  databaseInitialized = true;
};

const getCurrentPostgresExecutor = async () => {
  await initializeDatabase();
  return transactionClientStorage.getStore() ?? getPostgresPool();
};

const runPostgresQuery = async <Result extends pg.QueryResultRow>(
  sql: string,
  params: readonly QueryParameters[]
) => {
  const executor = await getCurrentPostgresExecutor();
  const query = toPostgresQuery(sql, params);
  return executor.query<Result>(query.text, query.values);
};

const sqliteStatement = <Result>(sql: string) => {
  const sqlite = initializeSqliteDatabase();
  return sqlite.prepare(normalizeSql(sql)) as Database.Statement;
};

export const db = {
  exec(sql: string) {
    if (env.database.driver === "postgres") {
      return runPostgresQuery(sql, []).then(() => undefined);
    }

    return initializeSqliteDatabase().exec(sql);
  },

  prepare<BindParameters = unknown, Result = unknown>(
    sql: string
  ): DatabaseStatement<BindParameters, Result> {
    return {
      all: (...params) => {
        if (env.database.driver === "postgres") {
          return runPostgresQuery<Result & pg.QueryResultRow>(sql, params).then((result) => result.rows);
        }

        return sqliteStatement<Result>(sql).all(...params) as Result[];
      },
      get: (...params) => {
        if (env.database.driver === "postgres") {
          return runPostgresQuery<Result & pg.QueryResultRow>(sql, params).then(
            (result) => result.rows[0]
          );
        }

        return sqliteStatement<Result>(sql).get(...params) as Result | undefined;
      },
      run: (...params) => {
        if (env.database.driver === "postgres") {
          return runPostgresQuery<Result & pg.QueryResultRow>(sql, params).then((result) => ({
            changes: result.rowCount ?? 0
          }));
        }

        const result = sqliteStatement<Result>(sql).run(...params);
        return { changes: result.changes };
      }
    };
  },

  async transaction<T>(operation: () => T | Promise<T>) {
    if (env.database.driver === "postgres") {
      await initializeDatabase();
      const existingClient = transactionClientStorage.getStore();
      if (existingClient) {
        return operation();
      }

      const client = await getPostgresPool().connect();
      try {
        await client.query("BEGIN");
        const result = await transactionClientStorage.run(client, operation);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    const sqlite = initializeSqliteDatabase();
    sqlite.exec("BEGIN");
    try {
      const result = await operation();
      sqlite.exec("COMMIT");
      return result;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }
};

export const closeDatabase = async () => {
  if (postgresPool) {
    await postgresPool.end();
    postgresPool = null;
  }

  if (sqliteDatabase) {
    sqliteDatabase.close();
    sqliteDatabase = null;
  }

  databaseInitialization = null;
  databaseInitialized = false;
};
