import { useState, type FormEvent } from "react";
import { authService } from "../../services/authService";
import { HttpError } from "../../services/http";
import { navigateTo } from "../../utils/router";
import { homeContent } from "../home/homeContent";
import {
  validatePasswordConfirmation,
  validatePasswordInput
} from "./authFormValidation";

export function ForcedPasswordChangePage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errors = {
    currentPassword: currentPassword ? "" : "كلمة المرور المؤقتة مطلوبة.",
    newPassword: validatePasswordInput(newPassword),
    confirmation: validatePasswordConfirmation(newPassword, confirmation)
  };
  const isValid = Object.values(errors).every((value) => !value);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirmation: confirmation
      });
      navigateTo("/login");
    } catch (caught) {
      setError(caught instanceof HttpError ? caught.message : "تعذر تغيير كلمة المرور.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell" dir="rtl">
      <section className="auth-layout auth-recovery-layout">
        <aside className="auth-context">
          <img className="auth-brand-logo" alt="عبقور" src={homeContent.logoPath} />
          <h2>خطوة أمان أخيرة.</h2>
          <p>غيّر كلمة المرور المؤقتة قبل استخدام أدوات الإدارة.</p>
        </aside>
        <section className="auth-card">
          <header><p className="page-eyebrow">أمان الحساب</p><h1 className="auth-title">تعيين كلمة مرور جديدة</h1></header>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">كلمة المرور المؤقتة<input autoComplete="current-password" dir="ltr" required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label className="form-field">كلمة المرور الجديدة<input autoComplete="new-password" dir="ltr" minLength={12} required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />{newPassword && errors.newPassword ? <small className="field-error">{errors.newPassword}</small> : null}</label>
            <label className="form-field">تأكيد كلمة المرور الجديدة<input autoComplete="new-password" dir="ltr" minLength={12} required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />{confirmation && errors.confirmation ? <small className="field-error">{errors.confirmation}</small> : null}</label>
            {error ? <p className="error-message">{error}</p> : null}
            <button disabled={!isValid || isSubmitting} type="submit">{isSubmitting ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}</button>
          </form>
        </section>
      </section>
    </main>
  );
}
