import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureConfiguredSeedAdminAccount } from "./modules/admin/admin.service.js";

const app = createApp();

try {
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

app.listen(env.port, () => {
  console.log(`Abqoor API listening on port ${env.port}`);
  console.log(`Allowed frontend origins: ${env.frontendOrigins.join(", ")}`);
});
