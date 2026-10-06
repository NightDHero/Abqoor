import { FormEvent, useEffect, useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { SummaryMetric } from "../components/ui/SummaryMetric";
import { StudyPlanDateField, StudyPlanScheduleField } from "../features/profile/StudyPlanFields";
import {
  createDefaultProfileForm,
  applyProfileFormUpdate,
  toProfileInput,
  validateProfileForm,
  validateUsername,
  type ProfileFormState
} from "../features/profile/profileFormState";
import { weakerSectionOptions } from "../features/profile/profileOptions";
import { formatPlanDate } from "../features/profile/studyPlan";
import { useStudyPlanPreview } from "../features/profile/useStudyPlanPreview";
import { bankService } from "../services/bankService";
import { authService } from "../services/authService";
import { HttpError } from "../services/http";
import { profileService } from "../services/profileService";
import {
  validatePhoneNumber,
  validatePhoneVerificationCode
} from "../features/auth/authFormValidation";
import type { ThemePreference } from "../theme/theme";
import type { User } from "../types/auth";
import type { BankConfig, WeakerSection } from "../types/profile";

const themePreferenceOptions: Array<{ label: string; value: ThemePreference }> = [
  { label: "فاتح", value: "light" },
  { label: "داكن", value: "dark" }
];

function InlineOptions<T extends string>({ options, value, onChange }: {
  options: Array<{ label: string; value: T }>;
  value: T | "";
  onChange: (value: T) => void;
}) {
  return <div className="profile-option-row">{options.map((option) => (
    <button aria-pressed={value === option.value} className={value === option.value ? "profile-choice selected" : "profile-choice"} key={option.value} type="button" onClick={() => onChange(option.value)}>{option.label}</button>
  ))}</div>;
}

export function ProfilePage({
  activeTheme,
  onLogout,
  onThemeChange,
  onProfileSaved,
  user
}: {
  activeTheme: ThemePreference;
  onLogout: () => Promise<void>;
  onThemeChange: (theme: ThemePreference) => void;
  onProfileSaved: (user: User) => void;
  user: User;
}) {
  const [form, setForm] = useState<ProfileFormState>(() => createDefaultProfileForm());
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [isPhoneCodeSent, setIsPhoneCodeSent] = useState(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneCodeTouched, setPhoneCodeTouched] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(!user.phoneNumber);
  const studyPlanPreview = useStudyPlanPreview({
    bankCount: form.studyPlanBankCount,
    quantitativeStudyDays: form.quantitativeStudyDays,
    restDay: form.weeklyRestDay,
    reviewDay: form.weeklyReviewDay,
    startDate: form.studyPlanStartDate,
    verbalStudyDays: form.verbalStudyDays
  });

  useEffect(() => {
    let isMounted = true;
    void Promise.all([profileService.getProfile(), bankService.getConfig()])
      .then(([profileResponse, bankResponse]) => {
        if (!isMounted) return;
        setForm(
          createDefaultProfileForm(
            profileResponse.profile,
            bankResponse.config.availableBankCount
          )
        );
        setBankConfig(bankResponse.config);
      })
      .catch((caughtError) => {
        if (isMounted) setError(caughtError instanceof HttpError ? caughtError.message : "تعذر تحميل الملف الدراسي.");
      })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (phoneResendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setPhoneResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phoneResendCooldown > 0]);

  const updateForm = (nextValues: Partial<ProfileFormState>) => {
    setError("");
    setMessage("");
    setForm((current) => applyProfileFormUpdate(current, nextValues));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateProfileForm(
      form,
      bankConfig?.availableBankCount
    );
    if (validationMessage) { setError(validationMessage); return; }
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const response = await profileService.saveProfile(toProfileInput(form));
      setForm(createDefaultProfileForm(response.profile));
      onProfileSaved({ ...user, profileCompleted: response.profile.profileCompleted, username: response.profile.username });
      setMessage("تم حفظ التغييرات وإعادة حساب خطتك.");
    } catch (caughtError) {
      setError(caughtError instanceof HttpError ? caughtError.message : "تعذر حفظ الملف الدراسي.");
    } finally { setIsSaving(false); }
  };

  const phoneNumberError = validatePhoneNumber(phoneNumber);
  const phoneCodeError = validatePhoneVerificationCode(phoneVerificationCode);

  const handlePhoneCodeRequest = async () => {
    setPhoneTouched(true);
    if (phoneNumberError || phoneResendCooldown > 0) return;
    setError("");
    setMessage("");
    setIsSendingPhoneCode(true);
    try {
      await authService.requestPhoneVerification(phoneNumber);
      setPhoneVerificationCode("");
      setPhoneCodeTouched(false);
      setIsPhoneCodeSent(true);
      setPhoneResendCooldown(60);
      setMessage("أرسلنا رمز تحقق إلى رقم الجوال.");
    } catch (caughtError) {
      setError(caughtError instanceof HttpError ? caughtError.message : "تعذر إرسال رمز تحقق الجوال.");
    } finally {
      setIsSendingPhoneCode(false);
    }
  };

  const handlePhoneSubmit = async () => {
    setPhoneTouched(true);
    setPhoneCodeTouched(true);
    if (phoneNumberError || phoneCodeError || !isPhoneCodeSent) return;
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const response = await authService.addPhoneNumber({
        code: phoneVerificationCode,
        phoneNumber
      });
      onProfileSaved(response.user);
      setPhoneNumber("");
      setPhoneVerificationCode("");
      setIsPhoneCodeSent(false);
      setPhoneResendCooldown(0);
      setIsEditingPhone(false);
      setMessage(user.phoneNumber ? "تم تحديث رقم الجوال." : "تمت إضافة رقم الجوال إلى الحساب.");
    } catch (caughtError) {
      setError(caughtError instanceof HttpError ? caughtError.message : "تعذر إضافة رقم الجوال.");
    } finally {
      setIsSaving(false);
    }
  };

  const examDateLabel = form.hasExamDate && form.examDate
    ? formatPlanDate(form.examDate)
    : "غير محدد";
  const completionDateLabel = studyPlanPreview.plan
    ? formatPlanDate(studyPlanPreview.plan.completionDate)
    : "غير محدد";
  const liveValidationError = isLoading
    ? ""
    : validateProfileForm(form, bankConfig?.availableBankCount);

  return (
    <PageContainer eyebrow="الحساب" title="ملفي">
      {isLoading ? <p className="status-message">جاري تحميل الملف الدراسي...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {!error && liveValidationError ? <p className="error-message" role="alert">{liveValidationError}</p> : null}
      {message ? <p className="status-message">{message}</p> : null}

      <section className="profile-dashboard-head" aria-label="هوية وملخص الملف الدراسي">
        <div className="profile-identity"><div><strong>{form.username || "مستخدم عبقور"}</strong><span dir="ltr">{user.email}</span></div></div>
        <div className="profile-overview">
          <SummaryMetric label="الدرجة المستهدفة" value={form.targetScore} />
          <SummaryMetric label="الاختبار" value={examDateLabel} />
          <SummaryMetric label="الأقسام المتاحة" value={form.studyPlanBankCount.toLocaleString("ar-SA")} />
          <SummaryMetric label="الخطة" value={completionDateLabel} />
        </div>
      </section>

      <form className="profile-form" id="settings" onSubmit={handleSubmit}>
        <header className="profile-editor-heading"><h2>إعدادات الملف</h2></header>
        <section className="profile-section" aria-labelledby="account-section">
          <h2 id="account-section">الحساب</h2>
          <div className="profile-field-grid">
            <label className="form-field profile-username-field">اسم المستخدم<input aria-invalid={Boolean(validateUsername(form.username))} autoComplete="username" dir="auto" maxLength={20} minLength={3} type="text" value={form.username} onChange={(event) => updateForm({ username: event.target.value })} /><small>من ٣ إلى ٢٠ حرفاً شاملاً المسافات</small></label>
            <div><span>البريد الإلكتروني</span><strong dir="ltr">{user.email}</strong><small>{user.emailVerified ? "موثق" : "غير موثق"}</small></div>
            <div><span>رقم الجوال</span><strong dir="ltr">{user.phoneNumber ?? "غير مضاف"}</strong><small>{user.phoneVerified ? "موثق" : "غير موثق"}</small></div>
            <div><span>كلمة المرور</span><strong>تدار من نظام تسجيل الدخول</strong></div>
          </div>
          {user.phoneNumber && !isEditingPhone ? (
            <button className="secondary profile-change-phone" type="button" onClick={() => {
              setPhoneNumber(user.phoneNumber ?? "");
              setIsEditingPhone(true);
            }}>تغيير رقم الجوال</button>
          ) : null}
          {isEditingPhone ? (
            <div className="profile-missing-phone">
              <p>{user.phoneNumber ? "أدخل الرقم الجديد ثم أثبت ملكيته برمز التحقق." : "أضف رقم الجوال وتحقق منه لتتمكن من استخدامه للدخول والاستعادة."}</p>
              <label className="form-field">رقم الجوال<input aria-invalid={phoneTouched && Boolean(phoneNumberError)} autoComplete="tel" dir="ltr" type="tel" value={phoneNumber} onBlur={() => setPhoneTouched(true)} onChange={(event) => {
                setPhoneNumber(event.target.value);
                setIsPhoneCodeSent(false);
                setPhoneVerificationCode("");
                setPhoneResendCooldown(0);
              }} />{phoneTouched && phoneNumberError ? <small className="field-error">{phoneNumberError}</small> : null}</label>
              <button className="secondary" disabled={isSendingPhoneCode || phoneResendCooldown > 0 || Boolean(phoneNumberError)} type="button" onClick={() => void handlePhoneCodeRequest()}>
                {isSendingPhoneCode ? "جاري الإرسال..." : phoneResendCooldown > 0 ? `إعادة الإرسال بعد ${phoneResendCooldown} ث` : isPhoneCodeSent ? "إعادة إرسال الرمز" : "إرسال رمز التحقق"}
              </button>
              {isPhoneCodeSent ? <label className="form-field">رمز التحقق<input aria-invalid={phoneCodeTouched && Boolean(phoneCodeError)} autoComplete="one-time-code" dir="ltr" inputMode="numeric" maxLength={10} value={phoneVerificationCode} onBlur={() => setPhoneCodeTouched(true)} onChange={(event) => setPhoneVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 10))} />{phoneCodeTouched && phoneCodeError ? <small className="field-error">{phoneCodeError}</small> : null}</label> : null}
              <div className="action-row">
                <button disabled={isSaving || !isPhoneCodeSent || Boolean(phoneNumberError) || Boolean(phoneCodeError)} type="button" onClick={() => void handlePhoneSubmit()}>{user.phoneNumber ? "حفظ الرقم الموثق" : "إضافة الرقم الموثق"}</button>
                {user.phoneNumber ? <button className="secondary" type="button" onClick={() => {
                  setPhoneNumber("");
                  setPhoneVerificationCode("");
                  setIsPhoneCodeSent(false);
                  setPhoneResendCooldown(0);
                  setIsEditingPhone(false);
                }}>إلغاء</button> : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="profile-section profile-appearance-section" aria-labelledby="appearance-section">
          <h2 id="appearance-section">المظهر</h2>
          <div className="form-field">واجهة عبقور<InlineOptions options={themePreferenceOptions} value={activeTheme} onChange={onThemeChange} /></div>
        </section>

        <section className="profile-section" aria-labelledby="study-goals-section">
          <h2 id="study-goals-section">أهداف الدراسة</h2>
          <label className="form-field">الدرجة المستهدفة: {form.targetScore}<input max={100} min={50} type="range" value={form.targetScore} onChange={(event) => updateForm({ targetScore: Number(event.target.value) })} /></label>
          <div className="profile-option-row">
            <button aria-pressed={form.hasExamDate} className={form.hasExamDate ? "profile-choice selected" : "profile-choice"} type="button" onClick={() => updateForm({ hasExamDate: true })}>لدي موعد اختبار</button>
            <button aria-pressed={!form.hasExamDate} className={!form.hasExamDate ? "profile-choice selected" : "profile-choice"} type="button" onClick={() => updateForm({ examDate: "", hasExamDate: false })}>ليس لدي موعد حتى الآن</button>
          </div>
          {form.hasExamDate ? <label className="form-field">موعد الاختبار<input type="date" value={form.examDate} onChange={(event) => updateForm({ examDate: event.target.value })} /></label> : null}
        </section>

        <section className="profile-section" aria-labelledby="study-profile-section">
          <h2 id="study-profile-section">الملف الدراسي</h2>
          <div className="profile-option-row">
            <button aria-pressed={form.hasTakenQudurat === true} className={form.hasTakenQudurat === true ? "profile-choice selected" : "profile-choice"} type="button" onClick={() => updateForm({ hasTakenQudurat: true })}>سبق لي دخول الاختبار</button>
            <button aria-pressed={form.hasTakenQudurat === false} className={form.hasTakenQudurat === false ? "profile-choice selected" : "profile-choice"} type="button" onClick={() => updateForm({ attemptCount: "", hasTakenQudurat: false, latestScore: "" })}>لم أدخل الاختبار بعد</button>
          </div>
          {form.hasTakenQudurat ? <div className="profile-two-column"><label className="form-field">عدد المحاولات<input min={1} type="number" value={form.attemptCount} onChange={(event) => updateForm({ attemptCount: event.target.value })} /></label><label className="form-field">آخر درجة<input max={100} min={0} type="number" value={form.latestScore} onChange={(event) => updateForm({ latestScore: event.target.value })} /></label></div> : null}
          <div className="form-field">القسم الأضعف<InlineOptions options={weakerSectionOptions} value={form.weakerSection} onChange={(weakerSection: WeakerSection) => updateForm({ weakerSection })} /></div>
        </section>

        <section className="profile-section profile-study-plan" aria-labelledby="study-plan-section">
          <h2 id="study-plan-section">خطة الأقسام</h2>
          {bankConfig ? <><StudyPlanDateField isPlanLoading={studyPlanPreview.isLoading} plan={studyPlanPreview.plan} startDate={form.studyPlanStartDate} onChange={(studyPlanStartDate) => updateForm({ studyPlanStartDate })} /><StudyPlanScheduleField initiallyCollapsed isPlanLoading={studyPlanPreview.isLoading} plan={studyPlanPreview.plan} quantitativeStudyDays={form.quantitativeStudyDays} restDay={form.weeklyRestDay} reviewDay={form.weeklyReviewDay} verbalStudyDays={form.verbalStudyDays} onScheduleChange={({ quantitativeStudyDays, restDay: weeklyRestDay, reviewDay: weeklyReviewDay, verbalStudyDays }) => updateForm({ quantitativeStudyDays, weeklyRestDay, weeklyReviewDay, verbalStudyDays })} onStudyDaysChange={(quantitativeStudyDays, verbalStudyDays) => updateForm({ quantitativeStudyDays, verbalStudyDays })} /></> : <p className="status-message">جاري تحميل إعدادات الأقسام...</p>}
        </section>

        <div className="action-row"><button type="submit" disabled={isSaving || isLoading || !bankConfig || Boolean(liveValidationError)}>{isSaving ? "جاري الحفظ..." : "حفظ التغييرات الآن"}</button></div>
      </form>

      <section className="profile-section profile-account-actions" aria-labelledby="account-actions-section"><div><h2 id="account-actions-section">إجراءات الحساب</h2><p>يمكنك إنهاء الجلسة الحالية بأمان من هذا الجهاز.</p></div><button className="profile-sign-out" type="button" onClick={() => void onLogout()}>تسجيل الخروج</button></section>
    </PageContainer>
  );
}
