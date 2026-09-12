import { FormEvent, useEffect, useState } from "react";
import { SystemIcon } from "../../components/ui/SystemIcon";
import { authService } from "../../services/authService";
import { HttpError } from "../../services/http";
import type { AuthMode, User } from "../../types/auth";
import { navigateTo } from "../../utils/router";
import { homeContent } from "../home/homeContent";

const labels = {
  login: {
    action: "تسجيل الدخول",
    eyebrow: "الدخول",
    title: "تسجيل الدخول"
  },
  register: {
    action: "إنشاء الحساب",
    eyebrow: "حساب جديد",
    title: "إنشاء حساب"
  }
};

const authModeOptions: Array<{ label: string; value: AuthMode }> = [
  { label: "تسجيل الدخول", value: "login" },
  { label: "إنشاء حساب", value: "register" }
];

const goBack = () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  navigateTo("/");
};

export function AuthPage({
  mode,
  onAuthenticated
}: {
  mode: AuthMode;
  onAuthenticated: (user: User) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = labels[mode];

  useEffect(() => {
    setError("");
    setIsSubmitting(false);
  }, [mode]);

  const handleModeSelect = (nextMode: AuthMode) => {
    if (nextMode === mode) {
      return;
    }

    navigateTo(nextMode === "login" ? "/login" : "/register");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await authService.authenticate(mode, { email, password });
      onAuthenticated(response.user);
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر إكمال المصادقة."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell" dir="rtl">
      <nav className="app-navigation auth-app-navigation" aria-label="تنقل الحساب">
        <div className="app-navigation-shell">
          <button
            aria-label="العودة للصفحة السابقة"
            className="app-navigation-back"
            type="button"
            onClick={goBack}
          >
            <SystemIcon name="back" />
          </button>

          <a
            className="app-navigation-brand"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("/");
            }}
          >
            <img alt="" src={homeContent.logoPath} />
            <span>عبقور</span>
          </a>

          <div className="app-navigation-track">
            {authModeOptions.map((option) => (
              <a
                aria-current={mode === option.value ? "page" : undefined}
                className={
                  mode === option.value
                    ? "app-navigation-item active"
                    : "app-navigation-item"
                }
                href={option.value === "login" ? "/login" : "/register"}
                key={option.value}
                onClick={(event) => {
                  event.preventDefault();
                  handleModeSelect(option.value);
                }}
              >
                <span className="app-navigation-label">{option.label}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      <section className="auth-layout">
        <aside className="auth-context">
          <img className="auth-brand-logo" alt="عبقور" src={homeContent.logoPath} />
          <h2>مكان واحد لرحلتك في القدرات.</h2>
          <p>
            تدرب، راجع أخطاءك، وتابع تقدمك من حساب واحد مصمم للدراسة اليومية.
          </p>
          <button className="secondary" type="button" onClick={() => navigateTo("/")}>
            العودة للرئيسية
          </button>
        </aside>
        <section className="auth-card">
          <header>
          <p className="page-eyebrow">{copy.eyebrow}</p>
          <h1 className="auth-title">{copy.title}</h1>
          </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-mode-switch" role="group" aria-label="اختيار طريقة الحساب">
            {authModeOptions.map((option) => (
              <button
                aria-pressed={mode === option.value}
                className={
                  mode === option.value
                    ? "auth-mode-switch-option selected"
                    : "auth-mode-switch-option"
                }
                key={option.value}
                type="button"
                onClick={() => handleModeSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="form-field">
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
          <label className="form-field">
            كلمة المرور
            <input
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              dir="ltr"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="error-message">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "جاري الإرسال..." : copy.action}
          </button>
        </form>
        </section>
      </section>
    </main>
  );
}
