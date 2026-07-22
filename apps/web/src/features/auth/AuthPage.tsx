import { FormEvent, useState } from "react";
import { authService } from "../../services/authService";
import { HttpError } from "../../services/http";
import type { AuthMode, User } from "../../types/auth";
import { navigateTo } from "../../utils/router";

const labels = {
  login: {
    action: "تسجيل الدخول",
    alternate: "إنشاء حساب جديد",
    eyebrow: "الدخول",
    title: "تسجيل الدخول"
  },
  register: {
    action: "إنشاء الحساب",
    alternate: "لديك حساب؟ سجل الدخول",
    eyebrow: "حساب جديد",
    title: "إنشاء حساب"
  }
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
      <section className="auth-card">
        <div>
          <p className="page-eyebrow">{copy.eyebrow}</p>
          <h1 className="auth-title">{copy.title}</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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

        <button
          className="secondary"
          type="button"
          onClick={() => navigateTo(mode === "login" ? "/register" : "/login")}
        >
          {copy.alternate}
        </button>
      </section>
    </main>
  );
}
