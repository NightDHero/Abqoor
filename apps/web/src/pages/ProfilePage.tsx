import { FormEvent, useEffect, useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { SummaryMetric } from "../components/ui/SummaryMetric";
import { StudyPlanDateField, StudyPlanScheduleField } from "../features/profile/StudyPlanFields";
import {
  createDefaultProfileForm,
  toProfileInput,
  validateProfileForm,
  type ProfileFormState
} from "../features/profile/profileFormState";
import { weakerSectionOptions } from "../features/profile/profileOptions";
import { formatPlanDate } from "../features/profile/studyPlan";
import { useStudyPlanPreview } from "../features/profile/useStudyPlanPreview";
import { bankService } from "../services/bankService";
import { authService } from "../services/authService";
import { HttpError } from "../services/http";
import { profileService } from "../services/profileService";
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
  const [phonePassword, setPhonePassword] = useState("");
  const studyPlanPreview = useStudyPlanPreview({
    restDay: form.weeklyRestDay,
    reviewDay: form.weeklyReviewDay,
    startDate: form.studyPlanStartDate
  });

  useEffect(() => {
    let isMounted = true;
    void Promise.all([profileService.getProfile(), bankService.getConfig()])
      .then(([profileResponse, bankResponse]) => {
        if (!isMounted) return;
        setForm(createDefaultProfileForm(profileResponse.profile));
        setBankConfig(bankResponse.config);
      })
      .catch((caughtError) => {
        if (isMounted) setError(caughtError instanceof HttpError ? caughtError.message : "تعذر تحميل الملف الدراسي.");
      })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const updateForm = (nextValues: Partial<ProfileFormState>) => {
    setError("");
    setMessage("");
    setForm((current) => ({ ...current, ...nextValues }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateProfileForm(form);
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

  const handlePhoneSubmit = async () => {
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const response = await authService.addPhoneNumber({
        password: phonePassword,
        phoneNumber
      });
      onProfileSaved(response.user);
      setPhoneNumber("");
      setPhonePassword("");
      setMessage("تمت إضافة رقم الجوال إلى الحساب.");
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

  return (
    <PageContainer eyebrow="الحساب" title="ملفي">
      {isLoading ? <p className="status-message">جاري تحميل الملف الدراسي...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {message ? <p className="status-message">{message}</p> : null}

      <section className="profile-dashboard-head" aria-label="هوية وملخص الملف الدراسي">
        <div className="profile-identity"><div><strong>{form.username || "مستخدم عبقور"}</strong><span dir="ltr">{user.email}</span></div></div>
        <div className="profile-overview">
          <SummaryMetric label="الدرجة المستهدفة" value={form.targetScore} />
          <SummaryMetric label="الاختبار" value={examDateLabel} />
          <SummaryMetric label="الأقسام المتاحة" value={bankConfig?.availableBankCount.toLocaleString("ar-SA") ?? "..."} />
          <SummaryMetric label="الخطة" value={completionDateLabel} />
        </div>
      </section>

      <form className="profile-form" id="settings" onSubmit={handleSubmit}>
        <header className="profile-editor-heading"><h2>إعدادات الملف</h2></header>
        <section className="profile-section" aria-labelledby="account-section">
          <h2 id="account-section">الحساب</h2>
          <div className="profile-field-grid">
            <label className="form-field profile-username-field">اسم المستخدم<input autoComplete="username" dir="ltr" maxLength={24} minLength={3} type="text" value={form.username} onChange={(event) => updateForm({ username: event.target.value })} /><small>هويتك العامة داخل عبقور</small></label>
            <div><span>البريد الإلكتروني</span><strong dir="ltr">{user.email}</strong></div>
            <div><span>رقم الجوال</span><strong dir="ltr">{user.phoneNumber ?? "غير مضاف"}</strong></div>
            <div><span>كلمة المرور</span><strong>تدار من نظام تسجيل الدخول</strong></div>
          </div>
          {!user.phoneNumber ? (
            <div className="profile-missing-phone">
              <p>أضف رقم الجوال لتتمكن من استعادة حسابك عند الحاجة.</p>
              <label className="form-field">رقم الجوال<input autoComplete="tel" dir="ltr" required type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /></label>
              <label className="form-field">كلمة المرور الحالية<input autoComplete="current-password" dir="ltr" required type="password" value={phonePassword} onChange={(event) => setPhonePassword(event.target.value)} /></label>
              <button disabled={isSaving || !phoneNumber || !phonePassword} type="button" onClick={() => void handlePhoneSubmit()}>إضافة رقم الجوال</button>
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
          {bankConfig ? <><StudyPlanDateField bankConfig={bankConfig} isPlanLoading={studyPlanPreview.isLoading} plan={studyPlanPreview.plan} startDate={form.studyPlanStartDate} onChange={(studyPlanStartDate) => updateForm({ studyPlanStartDate })} /><StudyPlanScheduleField isPlanLoading={studyPlanPreview.isLoading} plan={studyPlanPreview.plan} restDay={form.weeklyRestDay} reviewDay={form.weeklyReviewDay} onConflict={setError} onRestDayChange={(weeklyRestDay) => updateForm({ weeklyRestDay })} onReviewDayChange={(weeklyReviewDay) => updateForm({ weeklyReviewDay })} /></> : <p className="status-message">جاري تحميل إعدادات الأقسام...</p>}
        </section>

        <div className="action-row"><button type="submit" disabled={isSaving || isLoading || !bankConfig}>{isSaving ? "جاري الحفظ..." : "حفظ التغييرات الآن"}</button></div>
      </form>

      <section className="profile-section profile-account-actions" aria-labelledby="account-actions-section"><div><h2 id="account-actions-section">إجراءات الحساب</h2><p>يمكنك إنهاء الجلسة الحالية بأمان من هذا الجهاز.</p></div><button className="profile-sign-out" type="button" onClick={() => void onLogout()}>تسجيل الخروج</button></section>
    </PageContainer>
  );
}
