import { FormEvent, useEffect, useState } from "react";
import { SystemIcon } from "../../components/ui/SystemIcon";
import { authService } from "../../services/authService";
import { HttpError } from "../../services/http";
import type { AuthMode, User } from "../../types/auth";
import { navigateTo } from "../../utils/router";
import { homeContent } from "../home/homeContent";
import { GoogleSignInButton } from "./GoogleSignInButton";
import {
  canSubmitAuthForm,
  validateEmailAddress,
  validateLoginIdentifier,
  validatePasswordConfirmation,
  validatePasswordInput,
  validatePhoneNumber,
  validatePhoneVerificationCode,
  validateVerificationCode
} from "./authFormValidation";

const resendCooldownSeconds = 60;

const getHttpErrorCode = (error: HttpError) => {
  if (typeof error.data !== "object" || error.data === null || !("code" in error.data)) {
    return "";
  }
  return typeof error.data.code === "string" ? error.data.code : "";
};

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
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isPhoneCodeSent, setIsPhoneCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false);
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState("");
  const [googleLinkPassword, setGoogleLinkPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = labels[mode];

  useEffect(() => {
    setError("");
    setIsSubmitting(false);
    setVerificationCode("");
    setPhoneVerificationCode("");
    setIsCodeSent(false);
    setIsPhoneCodeSent(false);
    setEmailResendCooldown(0);
    setPhoneResendCooldown(0);
    setPendingGoogleCredential("");
    setGoogleLinkPassword("");
    setTouched({});
    setSubmitAttempted(false);
  }, [mode]);

  useEffect(() => {
    if (emailResendCooldown <= 0 && phoneResendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setEmailResendCooldown((current) => Math.max(0, current - 1));
      setPhoneResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailResendCooldown > 0, phoneResendCooldown > 0]);

  const fieldErrors = {
    email: mode === "register"
      ? validateEmailAddress(email)
      : validateLoginIdentifier(email),
    password: mode === "register" ? validatePasswordInput(password) : password ? "" : "كلمة المرور مطلوبة.",
    passwordConfirmation: mode === "register"
      ? validatePasswordConfirmation(password, passwordConfirmation)
      : "",
    phoneNumber: mode === "register" ? validatePhoneNumber(phoneNumber) : "",
    verificationCode: mode === "register"
      ? validateVerificationCode(verificationCode)
      : "",
    phoneVerificationCode: mode === "register"
      ? validatePhoneVerificationCode(phoneVerificationCode)
      : ""
  };
  const isFormValid = canSubmitAuthForm(fieldErrors, mode === "register"
    ? { emailCodeSent: isCodeSent, phoneCodeSent: isPhoneCodeSent }
    : {});
  const showFieldError = (field: keyof typeof fieldErrors) =>
    Boolean(fieldErrors[field]) && (submitAttempted || touched[field]);

  const handleRequestCode = async () => {
    setTouched((current) => ({ ...current, email: true }));
    if (fieldErrors.email) return;
    setError("");
    setIsSendingCode(true);
    try {
      await authService.requestRegistrationCode(email);
      setVerificationCode("");
      setIsCodeSent(true);
      setEmailResendCooldown(resendCooldownSeconds);
    } catch (caughtError) {
      setError(caughtError instanceof HttpError ? caughtError.message : "تعذر إرسال رمز التحقق.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleRequestPhoneCode = async () => {
    setTouched((current) => ({ ...current, phoneNumber: true }));
    if (fieldErrors.phoneNumber || phoneResendCooldown > 0) return;
    setError("");
    setIsSendingPhoneCode(true);
    try {
      await authService.requestRegistrationPhoneCode(phoneNumber);
      setPhoneVerificationCode("");
      setIsPhoneCodeSent(true);
      setPhoneResendCooldown(resendCooldownSeconds);
    } catch (caughtError) {
      setError(caughtError instanceof HttpError ? caughtError.message : "تعذر إرسال رمز تحقق الجوال.");
    } finally {
      setIsSendingPhoneCode(false);
    }
  };

  const handleModeSelect = (nextMode: AuthMode) => {
    if (nextMode === mode) {
      return;
    }

    navigateTo(nextMode === "login" ? "/login" : "/register");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!isFormValid) return;
    setError("");
    setIsSubmitting(true);

    try {
      const response = await authService.authenticate(mode, {
        email: mode === "register" ? email : undefined,
        identifier: mode === "login" ? email : undefined,
        password,
        passwordConfirmation: mode === "register" ? passwordConfirmation : undefined,
        phoneNumber: mode === "register" ? phoneNumber : undefined,
        phoneVerificationCode: mode === "register" ? phoneVerificationCode : undefined,
        verificationCode: mode === "register" ? verificationCode : undefined
      });
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

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    setPendingGoogleCredential("");
    setGoogleLinkPassword("");
    setIsSubmitting(true);
    try {
      const response = await authService.authenticateWithGoogle(credential);
      onAuthenticated(response.user);
    } catch (caughtError) {
      if (caughtError instanceof HttpError && getHttpErrorCode(caughtError) === "GOOGLE_LINK_REQUIRED") {
        setPendingGoogleCredential(credential);
        setError("");
      } else {
        setError(caughtError instanceof HttpError ? caughtError.message : "تعذر تسجيل الدخول عبر Google.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLink = async () => {
    setTouched((current) => ({ ...current, googleLinkPassword: true }));
    if (!pendingGoogleCredential || !googleLinkPassword) return;
    setError("");
    setIsSubmitting(true);
    try {
      const response = await authService.linkGoogleAccount({
        credential: pendingGoogleCredential,
        password: googleLinkPassword
      });
      onAuthenticated(response.user);
    } catch (caughtError) {
      setError(caughtError instanceof HttpError ? caughtError.message : "تعذر ربط حساب Google.");
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
            {mode === "register" ? "البريد الإلكتروني" : "البريد الإلكتروني أو رقم الجوال"}
            <input
              aria-invalid={showFieldError("email")}
              autoComplete={mode === "register" ? "email" : "username"}
              dir="ltr"
              required
              type={mode === "register" ? "email" : "text"}
              value={email}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              onChange={(event) => {
                setEmail(event.target.value);
                if (mode === "register") {
                  setIsCodeSent(false);
                  setVerificationCode("");
                    setEmailResendCooldown(0);
                }
              }}
            />
            {showFieldError("email") ? <small className="field-error">{fieldErrors.email}</small> : null}
          </label>
          {mode === "register" ? (
            <label className="form-field">
              رقم الجوال
              <input
                autoComplete="tel"
                dir="ltr"
                inputMode="tel"
                placeholder="05xxxxxxxx"
                required
                type="tel"
                value={phoneNumber}
                aria-invalid={showFieldError("phoneNumber")}
                onBlur={() => setTouched((current) => ({ ...current, phoneNumber: true }))}
                onChange={(event) => {
                  setPhoneNumber(event.target.value);
                  setIsPhoneCodeSent(false);
                  setPhoneVerificationCode("");
                  setPhoneResendCooldown(0);
                }}
              />
              {showFieldError("phoneNumber") ? <small className="field-error">{fieldErrors.phoneNumber}</small> : null}
            </label>
          ) : null}
          <label className="form-field">
            كلمة المرور
            <input
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              dir="ltr"
              minLength={mode === "register" ? 12 : undefined}
              required
              type="password"
              value={password}
              aria-invalid={showFieldError("password")}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              onChange={(event) => setPassword(event.target.value)}
            />
            {showFieldError("password") ? <small className="field-error">{fieldErrors.password}</small> : null}
          </label>
          {mode === "register" ? (
            <label className="form-field">
              تأكيد كلمة المرور
              <input
                autoComplete="new-password"
                dir="ltr"
                minLength={12}
                required
                type="password"
                value={passwordConfirmation}
                aria-invalid={showFieldError("passwordConfirmation")}
                onBlur={() => setTouched((current) => ({ ...current, passwordConfirmation: true }))}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
              {showFieldError("passwordConfirmation") ? <small className="field-error">{fieldErrors.passwordConfirmation}</small> : null}
            </label>
          ) : (
            <button
              className="auth-forgot-password"
              type="button"
              onClick={() => navigateTo("/forgot-password")}
            >
              نسيت كلمة المرور؟
            </button>
          )}
          {mode === "register" ? (
            <div className="auth-verification-block">
              <div className="auth-verification-copy">
                <strong>تحقق من بريدك الإلكتروني</strong>
                <span>سنرسل رمزاً من ٦ أرقام إلى <b dir="ltr">{email || "بريدك الإلكتروني"}</b></span>
              </div>
              <button
                className="secondary"
                disabled={isSendingCode || emailResendCooldown > 0 || Boolean(fieldErrors.email)}
                type="button"
                onClick={() => void handleRequestCode()}
              >
                {isSendingCode
                  ? "جاري الإرسال..."
                  : emailResendCooldown > 0
                    ? `إعادة الإرسال بعد ${emailResendCooldown} ث`
                    : isCodeSent ? "إعادة إرسال الرمز" : "إرسال رمز التحقق"}
              </button>
              {isCodeSent ? (
                <label className="form-field">
                  رمز التحقق
                  <input
                    aria-invalid={showFieldError("verificationCode")}
                    autoComplete="one-time-code"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    value={verificationCode}
                    onBlur={() => setTouched((current) => ({ ...current, verificationCode: true }))}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  {showFieldError("verificationCode") ? <small className="field-error">{fieldErrors.verificationCode}</small> : null}
                </label>
              ) : (
                <small className="auth-verification-hint">سنرسل رمزاً من ٦ أرقام للتأكد من ملكية البريد.</small>
              )}
            </div>
          ) : null}
          {mode === "register" ? (
            <div className="auth-verification-block">
              <div className="auth-verification-copy">
                <strong>تحقق من رقم الجوال</strong>
                <span>يصبح الرقم وسيلة دخول موثوقة بعد إثبات ملكيته.</span>
              </div>
              <button
                className="secondary"
                disabled={isSendingPhoneCode || phoneResendCooldown > 0 || Boolean(fieldErrors.phoneNumber)}
                type="button"
                onClick={() => void handleRequestPhoneCode()}
              >
                {isSendingPhoneCode
                  ? "جاري الإرسال..."
                  : phoneResendCooldown > 0
                    ? `إعادة الإرسال بعد ${phoneResendCooldown} ث`
                    : isPhoneCodeSent ? "إعادة إرسال الرمز" : "إرسال رمز تحقق الجوال"}
              </button>
              {isPhoneCodeSent ? (
                <label className="form-field">
                  رمز تحقق الجوال
                  <input
                    aria-invalid={showFieldError("phoneVerificationCode")}
                    autoComplete="one-time-code"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={phoneVerificationCode}
                    onBlur={() => setTouched((current) => ({ ...current, phoneVerificationCode: true }))}
                    onChange={(event) => setPhoneVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                  {showFieldError("phoneVerificationCode") ? <small className="field-error">{fieldErrors.phoneVerificationCode}</small> : null}
                </label>
              ) : (
                <small className="auth-verification-hint">ستصلك رسالة نصية من خدمة التحقق الآمنة.</small>
              )}
            </div>
          ) : null}
          {error ? <p className="error-message">{error}</p> : null}
          <button type="submit" disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? "جاري الإرسال..." : copy.action}
          </button>
          <div className="auth-divider"><span>أو</span></div>
          <GoogleSignInButton
            disabled={isSubmitting}
            onCredential={(credential) => void handleGoogleCredential(credential)}
            onError={setError}
          />
          {pendingGoogleCredential ? (
            <section className="auth-google-link" aria-labelledby="google-link-title">
              <div>
                <strong id="google-link-title">اربط حساب Google بأمان</strong>
                <p>هذا البريد مرتبط بحساب عبقور قائم. أدخل كلمة مرور عبقور مرة واحدة لتأكيد الربط.</p>
              </div>
              <label className="form-field">
                كلمة مرور حساب عبقور
                <input
                  aria-invalid={Boolean(touched.googleLinkPassword && !googleLinkPassword)}
                  autoComplete="current-password"
                  dir="ltr"
                  type="password"
                  value={googleLinkPassword}
                  onBlur={() => setTouched((current) => ({ ...current, googleLinkPassword: true }))}
                  onChange={(event) => setGoogleLinkPassword(event.target.value)}
                />
                {touched.googleLinkPassword && !googleLinkPassword ? <small className="field-error">كلمة المرور مطلوبة لتأكيد الربط.</small> : null}
              </label>
              <button disabled={isSubmitting || !googleLinkPassword} type="button" onClick={() => void handleGoogleLink()}>
                تأكيد وربط الحساب
              </button>
            </section>
          ) : null}
        </form>
        </section>
      </section>
    </main>
  );
}
