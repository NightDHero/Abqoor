import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPasswordHash
} from "../auth/auth.repository.js";
import type { UserRecord } from "../auth/auth.types.js";
import {
  findStudentProfileByUserId,
  isUsernameAvailable,
  upsertStudentProfile
} from "../profile/profile.repository.js";
import {
  adminAccountTransaction,
  grantManagedAdmin,
  isManagedAdminUser,
  listAllUsers,
  listManagedAdmins,
  removeManagedAdmin
} from "./admin.repository.js";

export type AdminAccountSource = "managed" | "environment" | "managed_and_environment";

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
  password?: unknown;
  passwordConfirmation?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 8;

export class AdminAccountError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isConfiguredAdminEmail = (email: string) =>
  env.adminEmails.includes(email.toLowerCase());

export const isUserAdministrator = (userId: string, email: string) => {
  return isConfiguredAdminEmail(email) || isManagedAdminUser(userId);
};

const toSeedUsernameBase = (email: string) => {
  const localPart = email.split("@")[0] ?? "admin";
  const normalized = localPart
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 20);

  return normalized.length >= 3 ? normalized : "admin";
};

const getAvailableSeedUsername = (email: string, userId: string) => {
  const base = toSeedUsernameBase(email);

  if (isUsernameAvailable(base, userId)) {
    return base;
  }

  for (let index = 2; index <= 999; index += 1) {
    const suffix = String(index);
    const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    if (isUsernameAvailable(candidate, userId)) {
      return candidate;
    }
  }

  throw new AdminAccountError("تعذر إنشاء اسم مستخدم فريد للمدير الأول.", 500);
};

const ensureSeedAdminProfile = (user: UserRecord) => {
  const profile = findStudentProfileByUserId(user.id);

  if (profile?.profile_completed === 1 && profile.username) {
    return;
  }

  upsertStudentProfile({
    attemptCount: null,
    examDate: null,
    hasExamDate: false,
    hasTakenQudurat: false,
    latestScore: null,
    studyStrategyPreference: "fastest_highest_score",
    studyStylePreference: "no_preference",
    targetScore: 90,
    userId: user.id,
    username: profile?.username ?? getAvailableSeedUsername(user.email, user.id),
    weakerSection: "both",
    weeklyStudyHours: "more_than_15"
  });
};

const validateCreateAdminAccountInput = (input: CreateAdminAccountInput) => {
  if (
    typeof input.email !== "string" ||
    typeof input.password !== "string" ||
    typeof input.passwordConfirmation !== "string"
  ) {
    throw new AdminAccountError(
      "البريد الإلكتروني وكلمة المرور وتأكيد كلمة المرور مطلوبة."
    );
  }

  const email = normalizeEmail(input.email);

  if (!emailPattern.test(email)) {
    throw new AdminAccountError("البريد الإلكتروني غير صالح.");
  }

  if (input.password.length < passwordMinLength) {
    throw new AdminAccountError(
      `كلمة المرور يجب أن تكون ${passwordMinLength} أحرف على الأقل.`
    );
  }

  if (input.password !== input.passwordConfirmation) {
    throw new AdminAccountError("كلمة المرور وتأكيدها غير متطابقين.");
  }

  return {
    email,
    password: input.password
  };
};

const getEffectiveAdminUsers = () => {
  const managedAdminIds = new Set(
    listManagedAdmins().map((admin) => admin.user_id)
  );

  return listAllUsers().filter(
    (user) => managedAdminIds.has(user.id) || isConfiguredAdminEmail(user.email)
  );
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

  if (account.source !== "managed") {
    return "هذا المدير ممنوح عبر إعدادات التشغيل ولا يمكن إزالته من لوحة الإدارة.";
  }

  return null;
};

export const listAdminAccounts = (currentUserId: string): PublicAdminAccount[] => {
  const managedAdmins = listManagedAdmins();
  const managedByUserId = new Map(
    managedAdmins.map((admin) => [admin.user_id, admin])
  );
  const effectiveAdminUsers = getEffectiveAdminUsers();
  const effectiveAdminCount = effectiveAdminUsers.length;

  return effectiveAdminUsers
    .map((user) => {
      const managedAdmin = managedByUserId.get(user.id) ?? null;
      const configured = isConfiguredAdminEmail(user.email);
      const source: AdminAccountSource =
        managedAdmin && configured
          ? "managed_and_environment"
          : configured
            ? "environment"
            : "managed";
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
  const { email, password } = validateCreateAdminAccountInput(input);

  if (findUserByEmail(email)) {
    throw new AdminAccountError(
      "يوجد حساب بهذا البريد الإلكتروني. استخدم تسجيل الدخول بدلا من إنشاء حساب جديد.",
      409
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = adminAccountTransaction(() => {
    const createdUser = createUser(email, passwordHash);
    grantManagedAdmin(createdUser.id, grantedByUserId);
    return createdUser;
  });

  return user;
};

export const removeAdminPrivileges = (
  targetUserId: string,
  currentUserId: string
) => {
  const targetUser = findUserById(targetUserId);

  if (!targetUser || !isUserAdministrator(targetUser.id, targetUser.email)) {
    throw new AdminAccountError("لم يتم العثور على المدير المطلوب.", 404);
  }

  const account = listAdminAccounts(currentUserId).find(
    (admin) => admin.userId === targetUserId
  );

  if (!account) {
    throw new AdminAccountError("لم يتم العثور على المدير المطلوب.", 404);
  }

  if (!account.canRemove) {
    throw new AdminAccountError(
      account.removalBlockedReason ?? "لا يمكن إزالة صلاحيات هذا المدير.",
      409
    );
  }

  removeManagedAdmin(targetUserId);
};

export const ensureSeedAdminAccount = async (input: {
  email: string;
  password: string;
}) => {
  const validated = validateCreateAdminAccountInput({
    email: input.email,
    password: input.password,
    passwordConfirmation: input.password
  });
  const passwordHash = await bcrypt.hash(validated.password, 12);

  return adminAccountTransaction<UserRecord>(() => {
    const existingUser = findUserByEmail(validated.email);
    const user = existingUser
      ? updateUserPasswordHash(existingUser.id, passwordHash)
      : createUser(validated.email, passwordHash);

    grantManagedAdmin(user.id, null);
    ensureSeedAdminProfile(user);
    return user;
  });
};
