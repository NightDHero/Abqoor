import { useState, type FormEvent } from "react";
import { authService } from "../../services/authService";
import { HttpError } from "../../services/http";
import { navigateTo } from "../../utils/router";
import { homeContent } from "../home/homeContent";

const getResetToken = () =>
  new URLSearchParams(window.location.search).get("token") ?? "";

export function PasswordRecoveryPage({ mode }: { mode: "request" | "reset" }) {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          token: getResetToken()
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
                <label className="form-field">البريد الإلكتروني<input autoComplete="email" dir="ltr" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label className="form-field">رقم الجوال<input autoComplete="tel" dir="ltr" inputMode="tel" required type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /></label>
              </>
            ) : (
              <>
                <label className="form-field">كلمة المرور الجديدة<input autoComplete="new-password" dir="ltr" minLength={12} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                <label className="form-field">تأكيد كلمة المرور<input autoComplete="new-password" dir="ltr" minLength={12} required type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>
              </>
            )}
            {error ? <p className="error-message">{error}</p> : null}
            {message ? <p className="status-message">{message}</p> : null}
            <button disabled={isSubmitting} type="submit">{isSubmitting ? "جاري الإرسال..." : mode === "request" ? "إرسال تعليمات الاستعادة" : "تغيير كلمة المرور"}</button>
            <button className="secondary" type="button" onClick={() => navigateTo("/login")}>العودة لتسجيل الدخول</button>
          </form>
        </section>
      </section>
    </main>
  );
}
