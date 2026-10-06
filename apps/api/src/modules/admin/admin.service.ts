import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPasswordAndInvalidateSessions
} from "../auth/auth.repository.js";
import type { UserRecord } from "../auth/auth.types.js";
import { bankConfig, calculateStudyPlan } from "../banks/bank-config.js";
import {
  findStudentProfileByUserId,
  isUsernameAvailable,
  upsertStudentProfile
} from "../profile/profile.repository.js";
import {
  adminAccountTransaction,
  acquireAdminSecurityLock,
  consumeBootstrap,
  grantManagedAdmin,
  isManagedAdminUser,
  listAllUsers,
  listManagedAdmins,
  removeManagedAdmin,
  isBootstrapConsumed
} from "./admin.repository.js";
import { revokeUserAuthSessions } from "../auth/auth-session.repository.js";
import { validatePassword } from "../auth/auth.service.js";

export type AdminAccountSource = "managed";

export type PublicAdminAccount = {
  userId: string;
  email: string;
  source: AdminAccountSource;
  createdAt: string;
  updatedAt: string;
  grantedByEmail: string | null;
  isCurrentUser: boolean;
  canRemove: boolean;
  removalBlockedReason: string | null;
};

type CreateAdminAccountInput = {
  email?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AdminAccountError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isUserAdministrator = async (userId: string, _email?: string) =>
  isManagedAdminUser(userId);

const toSeedUsernameBase = (email: string) => {
  const localPart = email.split("@")[0] ?? "admin";
  const normalized = localPart
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 20);

  return normalized.length >= 3 ? normalized : "admin";
};

const getAvailableSeedUsername = async (email: string, userId: string) => {
  const base = toSeedUsernameBase(email);

  if (await isUsernameAvailable(base, userId)) {
    return base;
  }

  for (let index = 2; index <= 999; index += 1) {
    const suffix = String(index);
    const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    if (await isUsernameAvailable(candidate, userId)) {
      return candidate;
    }
  }

  throw new AdminAccountError("تعذر إنشاء اسم مستخدم فريد للمدير الأول.", 500);
};

const ensureSeedAdminProfile = async (user: UserRecord) => {
  const profile = await findStudentProfileByUserId(user.id);

  if (profile?.profile_completed === 1 && profile.username) {
    return;
  }

  const studyPlanStartDate = new Date().toISOString().slice(0, 10);
  const quantitativeStudyDays = [0, 2, 4] as const;
  const verbalStudyDays = [1, 3] as const;
  const studyPlan = calculateStudyPlan({
    bankCount: bankConfig.availableBankCount,
    quantitativeStudyDays,
    restDay: 5,
    reviewDay: 6,
    startDate: studyPlanStartDate,
    verbalStudyDays
  });

  await upsertStudentProfile({
    attemptCount: null,
    examDate: null,
    hasExamDate: false,
    hasTakenQudurat: false,
    latestScore: null,
    quantitativeStudyDays: [...quantitativeStudyDays],
    studyPlanBankCount: studyPlan.bankCount,
    studyPlanCalendarDays: studyPlan.calendarDays,
    studyPlanCompletionDate: studyPlan.completionDate,
    studyPlanStartDate,
    studyPlanStudyDays: studyPlan.studyDays,
    targetScore: 90,
    userId: user.id,
    username:
      profile?.username ?? (await getAvailableSeedUsername(user.email, user.id)),
    weakerSection: "both",
    weeklyRestDay: 5,
    weeklyReviewDay: 6,
    verbalStudyDays: [...verbalStudyDays]
  });
};

const validateCreateAdminAccountInput = (input: CreateAdminAccountInput) => {
  if (
    typeof input.email !== "string"
  ) {
    throw new AdminAccountError(
      "البريد الإلكتروني مطلوب."
    );
  }

  const email = normalizeEmail(input.email);

  if (!emailPattern.test(email)) {
    throw new AdminAccountError("البريد الإلكتروني غير صالح.");
  }

  return { email };
};

const getEffectiveAdminUsers = async () => {
  const managedAdminIds = new Set(
    (await listManagedAdmins()).map((admin) => admin.user_id)
  );

  return (await listAllUsers()).filter((user) => managedAdminIds.has(user.id));
};

const getRemovalBlockReason = (
  account: {
    userId: string;
    email: string;
    source: AdminAccountSource;
  },
  currentUserId: string,
  effectiveAdminCount: number
) => {
  if (account.userId === currentUserId) {
    return "لا يمكن إزالة صلاحيات حسابك الحالي من هذه الصفحة.";
  }

  if (effectiveAdminCount <= 1) {
    return "لا يمكن إزالة آخر مدير في النظام.";
  }

  return null;
};

export const listAdminAccounts = async (
  currentUserId: string
): Promise<PublicAdminAccount[]> => {
  const managedAdmins = await listManagedAdmins();
  const managedByUserId = new Map(
    managedAdmins.map((admin) => [admin.user_id, admin])
  );
  const effectiveAdminUsers = await getEffectiveAdminUsers();
  const effectiveAdminCount = effectiveAdminUsers.length;

  return effectiveAdminUsers
    .map((user) => {
      const managedAdmin = managedByUserId.get(user.id) ?? null;
      const source: AdminAccountSource = "managed";
      const createdAt = managedAdmin?.created_at ?? user.created_at;
      const updatedAt = managedAdmin?.updated_at ?? user.updated_at;
      const account = {
        userId: user.id,
        email: user.email,
        source
      };
      const removalBlockedReason = getRemovalBlockReason(
        account,
        currentUserId,
        effectiveAdminCount
      );

      return {
        ...account,
        canRemove: removalBlockedReason === null,
        createdAt,
        grantedByEmail: managedAdmin?.granted_by_email ?? null,
        isCurrentUser: user.id === currentUserId,
        removalBlockedReason,
        updatedAt
      };
    })
    .sort((left, right) =>
      left.email.localeCompare(right.email, "en", { sensitivity: "base" })
    );
};

export const createAdminAccount = async (
  input: CreateAdminAccountInput,
  grantedByUserId: string
) => {
  const { email } = validateCreateAdminAccountInput(input);

  const user = await findUserByEmail(email);
  if (!user) {
    throw new AdminAccountError(
      "يجب أن ينشئ المستخدم حساب عبقور ويسجل دخوله أولاً قبل منحه صلاحيات الإدارة.",
      404
    );
  }
  await adminAccountTransaction(async () => {
    await acquireAdminSecurityLock();
    if (await isManagedAdminUser(user.id)) {
      throw new AdminAccountError("هذا الحساب يملك صلاحيات الإدارة بالفعل.", 409);
    }
    await grantManagedAdmin(user.id, grantedByUserId);
    await revokeUserAuthSessions(user.id);
  });

  return user;
};

export const removeAdminPrivileges = async (
  targetUserId: string,
  currentUserId: string
) => {
  await adminAccountTransaction(async () => {
    await acquireAdminSecurityLock();
    const admins = await listManagedAdmins();
    if (!admins.some((admin) => admin.user_id === targetUserId)) {
      throw new AdminAccountError("لم يتم العثور على المدير المطلوب.", 404);
    }
    if (targetUserId === currentUserId) {
      throw new AdminAccountError("لا يمكن إزالة صلاحيات حسابك الحالي من هذه الصفحة.", 409);
    }
    if (admins.length <= 1) {
      throw new AdminAccountError("لا يمكن إزالة آخر مدير في النظام.", 409);
    }
    await removeManagedAdmin(targetUserId);
    await revokeUserAuthSessions(targetUserId);
  });
};

export const ensureSeedAdminAccount = async (input: {
  email: string;
  password: string;
}) => {
  const email = normalizeEmail(input.email);
  if (!emailPattern.test(email)) {
    throw new AdminAccountError("البريد الإلكتروني غير صالح.");
  }
  validatePassword(input.password);
  const existingUser = await findUserByEmail(email);
  const existingPasswordHash = existingUser?.password_hash ?? null;
  const passwordMatches = existingPasswordHash
    ? await bcrypt.compare(input.password, existingPasswordHash)
    : false;
  const passwordHash = passwordMatches && existingPasswordHash
    ? existingPasswordHash
    : await bcrypt.hash(input.password, 12);

  return adminAccountTransaction<UserRecord>(async () => {
    const user = existingUser
      ? passwordMatches
        ? existingUser
        : await updateUserPasswordAndInvalidateSessions(existingUser.id, passwordHash)
      : await createUser(email, passwordHash);

    if (!(await isManagedAdminUser(user.id))) {
      await grantManagedAdmin(user.id, null);
    }

    await ensureSeedAdminProfile(user);
    return user;
  });
};

export const ensureConfiguredSeedAdminAccount = async () => {
  if (!env.initialAdminEmail && !env.initialAdminPassword) {
    return null;
  }

  if (!env.initialAdminEmail || !env.initialAdminPassword) {
    throw new AdminAccountError(
      "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set together.",
      500
    );
  }

  const email = normalizeEmail(env.initialAdminEmail);
  const bootstrapKey = `initial-admin:${email}`;
  if (await isBootstrapConsumed(bootstrapKey)) return findUserByEmail(email);

  const existing = await findUserByEmail(email);
  if (existing) {
    const matches = await bcrypt.compare(env.initialAdminPassword, existing.password_hash);
    if (!matches) {
      throw new AdminAccountError(
        "INITIAL_ADMIN_PASSWORD does not match the existing account; startup will not reset it.",
        500
      );
    }
  }
  const user = await ensureSeedAdminAccount({ email, password: env.initialAdminPassword });
  await consumeBootstrap(bootstrapKey);
  return user;
};

export const importConfiguredAdminEmails = async () => {
  for (const emailInput of env.adminEmails) {
    const email = normalizeEmail(emailInput);
    const bootstrapKey = `admin-email:${email}`;
    if (await isBootstrapConsumed(bootstrapKey)) continue;
    const user = await findUserByEmail(email);
    if (!user) continue;
    await adminAccountTransaction(async () => {
      await acquireAdminSecurityLock();
      await grantManagedAdmin(user.id, null);
      await revokeUserAuthSessions(user.id);
      await consumeBootstrap(bootstrapKey);
    });
  }
};
