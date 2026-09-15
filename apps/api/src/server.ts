import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeDatabase } from "./database/client.js";
import { ensureConfiguredSeedAdminAccount } from "./modules/admin/admin.service.js";

let app: Awaited<ReturnType<typeof createApp>>;

try {
  app = await createApp();
  const configuredAdmin = await ensureConfiguredSeedAdminAccount();

  if (configuredAdmin) {
    console.log(`Configured administrator is ready: ${configuredAdmin.email}`);
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Configured administrator initialization failed."
  );
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`Abqoor API listening on port ${env.port}`);
  console.log(`Allowed frontend origins: ${env.frontendOrigins.join(", ")}`);
});

const shutdown = async () => {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
