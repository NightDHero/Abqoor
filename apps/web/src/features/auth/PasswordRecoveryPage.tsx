import { useEffect, useState, type FormEvent } from "react";
import { authService } from "../../services/authService";
import { HttpError } from "../../services/http";
import { navigateTo } from "../../utils/router";
import { homeContent } from "../home/homeContent";
import {
  validateEmailAddress,
  validatePasswordConfirmation,
  validatePasswordInput,
  validatePhoneNumber
} from "./authFormValidation";

const getResetToken = () =>
  new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "";

export function PasswordRecoveryPage({ mode }: { mode: "request" | "reset" }) {
  const [resetToken] = useState(() => mode === "reset" ? getResetToken() : "");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const requestErrors = {
    email: validateEmailAddress(email),
    phoneNumber: validatePhoneNumber(phoneNumber)
  };
  const resetErrors = {
    password: validatePasswordInput(password),
    passwordConfirmation: validatePasswordConfirmation(password, passwordConfirmation),
    token: resetToken ? "" : "رابط الاستعادة غير صالح أو منتهي."
  };
  const activeErrors = mode === "request" ? requestErrors : resetErrors;
  const isFormValid = Object.values(activeErrors).every((value) => !value);
  const showEmailError = Boolean(requestErrors.email) && (submitAttempted || Boolean(email));
  const showPhoneError = Boolean(requestErrors.phoneNumber) && (submitAttempted || Boolean(phoneNumber));
  const showPasswordError = Boolean(resetErrors.password) && (submitAttempted || Boolean(password));
  const showConfirmationError = Boolean(resetErrors.passwordConfirmation) && (submitAttempted || Boolean(passwordConfirmation));

  useEffect(() => {
    if (mode === "reset" && window.location.hash) {
      window.history.replaceState(null, "", "/reset-password");
    }
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!isFormValid) return;
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      if (mode === "request") {
        const response = await authService.requestPasswordReset({ email, phoneNumber });
        setMessage(response.message);
      } else {
        const response = await authService.resetPassword({
          password,
          passwordConfirmation,
          token: resetToken
        });
        setMessage(response.message);
        window.setTimeout(() => navigateTo("/login"), 900);
      }
    } catch (caught) {
      setError(
        caught instanceof HttpError
          ? caught.message
          : "تعذر إكمال استعادة كلمة المرور."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell" dir="rtl">
      <section className="auth-layout auth-recovery-layout">
        <aside className="auth-context">
          <img className="auth-brand-logo" alt="عبقور" src={homeContent.logoPath} />
          <h2>استعد حسابك بأمان.</h2>
          <p>سنستخدم بياناتك المسجلة للتحقق، ثم نرسل رابطاً قصير الصلاحية إلى بريدك.</p>
        </aside>
        <section className="auth-card">
          <header>
            <p className="page-eyebrow">الحساب</p>
            <h1 className="auth-title">
              {mode === "request" ? "نسيت كلمة المرور؟" : "كلمة مرور جديدة"}
            </h1>
          </header>
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "request" ? (
              <>
                <label className="form-field">البريد الإلكتروني<input aria-invalid={showEmailError} autoComplete="email" dir="ltr" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />{showEmailError ? <small className="field-error">{requestErrors.email}</small> : null}</label>
                <label className="form-field">رقم الجوال<input aria-invalid={showPhoneError} autoComplete="tel" dir="ltr" inputMode="tel" required type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />{showPhoneError ? <small className="field-error">{requestErrors.phoneNumber}</small> : null}</label>
              </>
            ) : (
              <>
                <label className="form-field">كلمة المرور الجديدة<input aria-invalid={showPasswordError} autoComplete="new-password" dir="ltr" minLength={12} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />{showPasswordError ? <small className="field-error">{resetErrors.password}</small> : null}</label>
                <label className="form-field">تأكيد كلمة المرور<input aria-invalid={showConfirmationError} autoComplete="new-password" dir="ltr" minLength={12} required type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />{showConfirmationError ? <small className="field-error">{resetErrors.passwordConfirmation}</small> : null}</label>
              </>
            )}
            {error ? <p className="error-message">{error}</p> : null}
            {mode === "reset" && resetErrors.token ? <p className="error-message">{resetErrors.token}</p> : null}
            {message ? <p className="status-message">{message}</p> : null}
            <button disabled={isSubmitting || !isFormValid} type="submit">{isSubmitting ? "جاري الإرسال..." : mode === "request" ? "إرسال تعليمات الاستعادة" : "تغيير كلمة المرور"}</button>
            <button className="secondary" type="button" onClick={() => navigateTo("/login")}>العودة لتسجيل الدخول</button>
          </form>
        </section>
      </section>
    </main>
  );
}
