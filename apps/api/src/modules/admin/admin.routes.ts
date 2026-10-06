import { Router, type Response } from "express";
import { requireAdmin, requireRecentAuthentication } from "./admin.middleware.js";
import { writeSecurityEvent } from "../security/security-audit.service.js";
import { asyncHandler } from "../security/async-handler.js";
import {
  AdminAccountError,
  createAdminAccount,
  listAdminAccounts,
  removeAdminPrivileges
} from "./admin.service.js";

export const adminRouter = Router();

const handleAdminAccountError = (error: unknown, response: Response) => {
  if (error instanceof AdminAccountError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: "Admin account request failed." });
};

adminRouter.use(requireAdmin);

adminRouter.get("/accounts", asyncHandler(async (request, response) => {
  response.status(200).json({
    admins: await listAdminAccounts(request.user?.id ?? "")
  });
}));

adminRouter.post("/accounts", requireRecentAuthentication, async (request, response) => {
  try {
    const user = await createAdminAccount(
      (request.body ?? {}) as {
        email?: unknown;
      },
      request.user?.id ?? ""
    );

    const admin = (await listAdminAccounts(request.user?.id ?? "")).find(
      (account) => account.userId === user.id
    );

    if (!admin) {
      throw new AdminAccountError("تم إنشاء الحساب لكن تعذر قراءة صلاحياته.", 500);
    }

    response.status(201).json({ admin });
    writeSecurityEvent(request, "admin.privilege_granted", {
      actorUserId: request.user?.id,
      outcome: "success",
      targetId: user.id
    });
  } catch (error) {
    handleAdminAccountError(error, response);
  }
});

adminRouter.delete("/accounts/:userId", requireRecentAuthentication, async (request, response) => {
  try {
    const targetUserId = String(request.params.userId);
    await removeAdminPrivileges(targetUserId, request.user?.id ?? "");
    response.status(200).json({
      admins: await listAdminAccounts(request.user?.id ?? "")
    });
    writeSecurityEvent(request, "admin.privilege_removed", {
      actorUserId: request.user?.id,
      outcome: "success",
      targetId: targetUserId
    });
  } catch (error) {
    handleAdminAccountError(error, response);
  }
});
