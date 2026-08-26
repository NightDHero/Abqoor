import { Router, type Response } from "express";
import { requireAdmin } from "./admin.middleware.js";
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

adminRouter.get("/accounts", (request, response) => {
  response.status(200).json({
    admins: listAdminAccounts(request.user?.id ?? "")
  });
});

adminRouter.post("/accounts", async (request, response) => {
  try {
    const user = await createAdminAccount(
      (request.body ?? {}) as {
        email?: unknown;
        password?: unknown;
        passwordConfirmation?: unknown;
      },
      request.user?.id ?? ""
    );

    const admin = listAdminAccounts(request.user?.id ?? "").find(
      (account) => account.userId === user.id
    );

    if (!admin) {
      throw new AdminAccountError("تم إنشاء الحساب لكن تعذر قراءة صلاحياته.", 500);
    }

    response.status(201).json({ admin });
  } catch (error) {
    handleAdminAccountError(error, response);
  }
});

adminRouter.delete("/accounts/:userId", (request, response) => {
  try {
    removeAdminPrivileges(request.params.userId, request.user?.id ?? "");
    response.status(200).json({
      admins: listAdminAccounts(request.user?.id ?? "")
    });
  } catch (error) {
    handleAdminAccountError(error, response);
  }
});
