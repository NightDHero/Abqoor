import bcrypt from "bcryptjs";
import { closeDatabase } from "../src/database/client.js";
import { isManagedAdminUser } from "../src/modules/admin/admin.repository.js";
import {
  findUserByEmail,
  updateUserPasswordAndInvalidateSessions
} from "../src/modules/auth/auth.repository.js";
import { normalizeEmail } from "../src/modules/auth/auth.service.js";

const emailInput = process.env.ADMIN_PASSWORD_RESET_EMAIL?.trim() ?? "";
const password = process.env.ADMIN_PASSWORD_RESET_PASSWORD ?? "";
const confirmation = process.env.ADMIN_PASSWORD_RESET_CONFIRM ?? "";

try {
  if (!emailInput || !password || confirmation !== "RESET") {
    throw new Error(
      "ADMIN_PASSWORD_RESET_EMAIL, ADMIN_PASSWORD_RESET_PASSWORD, and ADMIN_PASSWORD_RESET_CONFIRM=RESET are required."
    );
  }

  const email = normalizeEmail(emailInput);
  const user = await findUserByEmail(email);
  if (!user) throw new Error("The requested administrator account does not exist.");
  if (!(await isManagedAdminUser(user.id))) {
    throw new Error("The requested account is not a database-managed administrator.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await updateUserPasswordAndInvalidateSessions(user.id, passwordHash, true);
  console.log("Administrator password reset completed; a password change is required at next sign-in.");
} finally {
  await closeDatabase();
}
