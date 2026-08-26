import { db } from "../../database/client.js";
import type { UserRecord } from "../auth/auth.types.js";

export type ManagedAdminRecord = {
  user_id: string;
  email: string;
  granted_by: string | null;
  granted_by_email: string | null;
  created_at: string;
  updated_at: string;
};

const findManagedAdminByUserIdStatement = db.prepare<
  string,
  { user_id: string }
>("SELECT user_id FROM admin_accounts WHERE user_id = ?");

const grantManagedAdminStatement = db.prepare(`
  INSERT INTO admin_accounts (user_id, granted_by, created_at, updated_at)
  VALUES (@userId, @grantedBy, @createdAt, @updatedAt)
  ON CONFLICT(user_id) DO UPDATE SET
    granted_by = excluded.granted_by,
    updated_at = excluded.updated_at
`);

const removeManagedAdminStatement = db.prepare<string>(
  "DELETE FROM admin_accounts WHERE user_id = ?"
);

const listManagedAdminsStatement = db.prepare<[], ManagedAdminRecord>(`
  SELECT
    admin_accounts.user_id,
    users.email,
    admin_accounts.granted_by,
    grantor.email AS granted_by_email,
    admin_accounts.created_at,
    admin_accounts.updated_at
  FROM admin_accounts
  INNER JOIN users ON users.id = admin_accounts.user_id
  LEFT JOIN users AS grantor ON grantor.id = admin_accounts.granted_by
  ORDER BY admin_accounts.created_at ASC
`);

const listAllUsersStatement = db.prepare<[], UserRecord>(
  "SELECT * FROM users ORDER BY created_at ASC"
);

export const adminAccountTransaction = <T>(operation: () => T) =>
  db.transaction(operation)();

export const isManagedAdminUser = (userId: string) => {
  return Boolean(findManagedAdminByUserIdStatement.get(userId));
};

export const grantManagedAdmin = (
  userId: string,
  grantedBy: string | null
) => {
  const now = new Date().toISOString();

  grantManagedAdminStatement.run({
    createdAt: now,
    grantedBy,
    updatedAt: now,
    userId
  });
};

export const removeManagedAdmin = (userId: string) => {
  removeManagedAdminStatement.run(userId);
};

export const listManagedAdmins = () => {
  return listManagedAdminsStatement.all();
};

export const listAllUsers = () => {
  return listAllUsersStatement.all();
};
