import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Abqoor API listening on port ${env.port}`);
  console.log(`Allowed frontend origins: ${env.frontendOrigins.join(", ")}`);
});
