import "../src/database/client.js";
import { ensureSeedAdminAccount } from "../src/modules/admin/admin.service.js";

const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
const password = process.env.INITIAL_ADMIN_PASSWORD ?? "";

if (!email || !password) {
  console.error(
    "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required to seed an administrator."
  );
  process.exit(1);
}

const user = await ensureSeedAdminAccount({ email, password });

console.log(`Seed administrator is ready: ${user.email}`);
