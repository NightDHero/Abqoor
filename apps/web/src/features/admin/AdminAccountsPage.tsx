import { FormEvent, useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { HttpError } from "../../services/http";
import type { AdminAccount } from "../../types/admin";
import { navigateTo } from "../../utils/router";
import { AdminShell } from "./AdminShell";
import { formatAdminDate } from "./adminUtils";

const sourceLabels: Record<AdminAccount["source"], string> = {
  environment: "إعدادات التشغيل",
  managed: "لوحة الإدارة",
  managed_and_environment: "لوحة الإدارة وإعدادات التشغيل"
};

export function AdminAccountsPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const loadAdmins = async () => {
    const response = await adminService.getAdminAccounts();
    setAdmins(response.admins);
  };

  useEffect(() => {
    void loadAdmins()
      .catch(() => setError("تعذر تحميل حسابات المدراء."))
      .finally(() => setIsLoading(false));
  }, []);

  const createAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== passwordConfirmation) {
      setError("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await adminService.createAdminAccount({
        email,
        password,
        passwordConfirmation
      });
      await loadAdmins();
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      setMessage(`تم إنشاء المدير ${response.admin.email} بنجاح.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر إنشاء حساب المدير."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAdmin = async (admin: AdminAccount) => {
    if (!admin.canRemove) {
      return;
    }

    setError("");
    setMessage("");
    setRemovingUserId(admin.userId);

    try {
      const response = await adminService.removeAdminAccount(admin.userId);
      setAdmins(response.admins);
      setMessage(`تمت إزالة صلاحيات المدير من ${admin.email}.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر إزالة صلاحيات المدير."
      );
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <AdminShell
      currentPath="/admin/accounts"
      description="إدارة حسابات المدراء الحقيقيين داخل عبقور."
      title="إدارة المدراء"
    >
      {error ? <p className="admin-alert error">{error}</p> : null}
      {message ? <p className="admin-alert">{message}</p> : null}

      <section className="admin-panel">
        <header className="admin-panel-heading">
          <div>
            <h2>إنشاء مدير جديد</h2>
            <p>سيتم إنشاء مستخدم عبقور كامل بصلاحيات إدارية.</p>
          </div>
          <button
            className="secondary"
            type="button"
            onClick={() => navigateTo("/login")}
          >
            لدي حساب
          </button>
        </header>

        <form className="admin-form-grid" onSubmit={createAdmin}>
          <label>
            البريد الإلكتروني
            <input
              autoComplete="email"
              dir="ltr"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            كلمة المرور
            <input
              autoComplete="new-password"
              dir="ltr"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            تأكيد كلمة المرور
            <input
              autoComplete="new-password"
              dir="ltr"
              minLength={8}
              required
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
            />
          </label>
          <div className="admin-form-actions">
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? "جاري الإنشاء..." : "إنشاء مدير"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-heading">
          <h2>المدراء الحاليون</h2>
          <p>{admins.length.toLocaleString("ar-SA")} حساب</p>
        </header>

        {isLoading ? <p className="admin-empty">جاري تحميل المدراء...</p> : null}
        {!isLoading && admins.length === 0 ? (
          <p className="admin-empty">لا توجد حسابات مدير مسجلة.</p>
        ) : null}

        {admins.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الحساب</th>
                  <th>مصدر الصلاحية</th>
                  <th>أضيف بواسطة</th>
                  <th>تاريخ الإضافة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.userId}>
                    <td>
                      <span>
                        <strong dir="ltr">{admin.email}</strong>
                        {admin.isCurrentUser ? <small>حسابك الحالي</small> : null}
                      </span>
                    </td>
                    <td>{sourceLabels[admin.source]}</td>
                    <td>{admin.grantedByEmail ?? "إعداد أولي"}</td>
                    <td>{formatAdminDate(admin.createdAt)}</td>
                    <td>
                      <button
                        className="danger"
                        disabled={!admin.canRemove || removingUserId === admin.userId}
                        type="button"
                        title={admin.removalBlockedReason ?? undefined}
                        onClick={() => void removeAdmin(admin)}
                      >
                        {removingUserId === admin.userId
                          ? "جاري الإزالة..."
                          : "إزالة الصلاحية"}
                      </button>
                      {!admin.canRemove && admin.removalBlockedReason ? (
                        <small>{admin.removalBlockedReason}</small>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
