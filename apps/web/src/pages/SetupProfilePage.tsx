import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { isCompleteWeeklySchedule } from "../features/profile/studyPlan";
import { useStudyPlanPreview } from "../features/profile/useStudyPlanPreview";
import { bankService } from "../services/bankService";
import { HttpError } from "../services/http";
import { profileService } from "../services/profileService";
import type { User } from "../types/auth";
import type { BankConfig, WeakerSection } from "../types/profile";
import { navigateTo } from "../utils/router";

type SetupStepId = "username" | "target" | "examDate" | "taken" | "attempts" | "score" | "weaker" | "startDate" | "schedule";
type SetupStep = { id: SetupStepId; title: string; render: () => ReactNode };
const arabicNumber = (value: number) => value.toLocaleString("ar-SA");

export const validateSetupStep = (id: SetupStepId, form: ProfileFormState) => {
  if (id === "username") return validateUsername(form.username);
  if (id === "target" && (form.targetScore < 50 || form.targetScore > 100)) return "اختر درجة مستهدفة بين ٥٠ و١٠٠.";
  if (id === "examDate" && form.hasExamDate && !form.examDate) return "اختر موعد الاختبار أو فعّل خيار عدم وجود موعد حالياً.";
  if (id === "taken" && form.hasTakenQudurat === null) return "حدد هل سبق لك دخول اختبار القدرات.";
  if (id === "attempts" && (!Number.isInteger(Number(form.attemptCount)) || Number(form.attemptCount) < 1)) return "أدخل عدد محاولات صحيحاً.";
  if (id === "score" && (!Number.isInteger(Number(form.latestScore)) || Number(form.latestScore) < 0 || Number(form.latestScore) > 100)) return "أدخل آخر درجة بين ٠ و١٠٠.";
  if (id === "weaker" && !form.weakerSection) return "اختر القسم الذي يمثل تحدياً أكبر.";
  if (id === "startDate" && !form.studyPlanStartDate) return "اختر تاريخ بدء المذاكرة.";
  if (id === "schedule" && !isCompleteWeeklySchedule({ quantitativeStudyDays: form.quantitativeStudyDays, restDay: form.weeklyRestDay, reviewDay: form.weeklyReviewDay, verbalStudyDays: form.verbalStudyDays })) return "يجب أن يحتوي الأسبوع على ٥ أيام مذاكرة ويوم مراجعة ويوم راحة دون تداخل.";
  return "";
};

function OptionButtons<T extends string>({
  options,
  value,
  onChange
}: {
  options: Array<{ label: string; value: T }>;
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <div className="onboarding-options">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={value === option.value ? "onboarding-option selected" : "onboarding-option"}
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SetupProfilePage({
  onProfileCompleted,
  user
}: {
  onProfileCompleted: (user: User) => void;
  user: User;
}) {
  const [form, setForm] = useState<ProfileFormState>(() => createDefaultProfileForm());
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUsernameOnlySetup, setIsUsernameOnlySetup] = useState(false);
  const [stepInteracted, setStepInteracted] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
        setIsUsernameOnlySetup(
          profileResponse.profile.profileCompleted && !profileResponse.profile.username
        );
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof HttpError ? caughtError.message : "تعذر تحميل بيانات الخطة الدراسية.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false);
      });
    return () => { isMounted = false; };
  }, []);

  const updateForm = (nextValues: Partial<ProfileFormState>) => {
    setError("");
    setStepInteracted(true);
    setForm((current) => applyProfileFormUpdate(current, nextValues));
  };

  const steps = useMemo<SetupStep[]>(() => {
    if (!bankConfig) return [];
    const allSteps: SetupStep[] = [
      {
        id: "username",
        title: "ما اسم المستخدم الذي تريده داخل عبقور؟",
        render: () => (
          <label className="form-field onboarding-username-field">
            اسم المستخدم
            <input aria-invalid={Boolean(validateUsername(form.username))} autoComplete="username" dir="auto" maxLength={20} minLength={3} placeholder="مثال: طالب عبقور" type="text" value={form.username} onChange={(event) => updateForm({ username: event.target.value })} />
            <small>من ٣ إلى ٢٠ حرفاً شاملاً المسافات، وهي منفصلة عن بريدك الإلكتروني.</small>
          </label>
        )
      },
      {
        id: "target",
        title: "ما الدرجة التي تستهدف تحقيقها في اختبار القدرات؟",
        render: () => (
          <label className="onboarding-slider">
            <span>{form.targetScore}</span>
            <input max={100} min={50} type="range" value={form.targetScore} onChange={(event) => updateForm({ targetScore: Number(event.target.value) })} />
          </label>
        )
      },
      {
        id: "examDate",
        title: "متى موعد اختبارك القادم؟",
        render: () => (
          <div className="onboarding-stack">
            <div className="onboarding-options">
              <button aria-pressed={form.hasExamDate} className={form.hasExamDate ? "onboarding-option selected" : "onboarding-option"} type="button" onClick={() => updateForm({ hasExamDate: true })}>لدي موعد اختبار</button>
              <button aria-pressed={!form.hasExamDate} className={!form.hasExamDate ? "onboarding-option selected" : "onboarding-option"} type="button" onClick={() => updateForm({ examDate: "", hasExamDate: false })}>ليس لدي موعد حتى الآن</button>
            </div>
            {form.hasExamDate ? <label className="form-field">تاريخ الاختبار<input type="date" value={form.examDate} onChange={(event) => updateForm({ examDate: event.target.value })} /></label> : null}
          </div>
        )
      },
      {
        id: "taken",
        title: "هل سبق لك دخول اختبار القدرات؟",
        render: () => (
          <div className="onboarding-options">
            <button aria-pressed={form.hasTakenQudurat === true} className={form.hasTakenQudurat === true ? "onboarding-option selected" : "onboarding-option"} type="button" onClick={() => updateForm({ hasTakenQudurat: true })}>نعم</button>
            <button aria-pressed={form.hasTakenQudurat === false} className={form.hasTakenQudurat === false ? "onboarding-option selected" : "onboarding-option"} type="button" onClick={() => updateForm({ attemptCount: "", hasTakenQudurat: false, latestScore: "" })}>لا</button>
          </div>
        )
      },
      {
        id: "attempts",
        title: "كم مرة دخلت اختبار القدرات؟",
        render: () => <label className="form-field">عدد المحاولات<input min={1} type="number" value={form.attemptCount} onChange={(event) => updateForm({ attemptCount: event.target.value })} /></label>
      },
      {
        id: "score",
        title: "ما آخر درجة حصلت عليها؟",
        render: () => <label className="form-field">آخر درجة<input max={100} min={0} type="number" value={form.latestScore} onChange={(event) => updateForm({ latestScore: event.target.value })} /></label>
      },
      {
        id: "weaker",
        title: "أي القسمين يمثل تحدياً أكبر بالنسبة لك؟",
        render: () => <OptionButtons options={weakerSectionOptions} value={form.weakerSection} onChange={(weakerSection: WeakerSection) => updateForm({ weakerSection })} />
      },
      {
        id: "startDate",
        title: "متى تبدأ مذاكرتك",
        render: () => <StudyPlanDateField isPlanLoading={studyPlanPreview.isLoading} plan={studyPlanPreview.plan} startDate={form.studyPlanStartDate} onChange={(studyPlanStartDate) => updateForm({ studyPlanStartDate })} />
      },
      {
        id: "schedule",
        title: "نظّم أسبوعك",
        render: () => <StudyPlanScheduleField isPlanLoading={studyPlanPreview.isLoading} plan={studyPlanPreview.plan} quantitativeStudyDays={form.quantitativeStudyDays} restDay={form.weeklyRestDay} reviewDay={form.weeklyReviewDay} verbalStudyDays={form.verbalStudyDays} onScheduleChange={({ quantitativeStudyDays, restDay: weeklyRestDay, reviewDay: weeklyReviewDay, verbalStudyDays }) => updateForm({ quantitativeStudyDays, weeklyRestDay, weeklyReviewDay, verbalStudyDays })} onStudyDaysChange={(quantitativeStudyDays, verbalStudyDays) => updateForm({ quantitativeStudyDays, verbalStudyDays })} />
      }
    ];
    if (isUsernameOnlySetup) return [allSteps[0]];
    return form.hasTakenQudurat === true ? allSteps : allSteps.filter((_step, index) => index !== 4 && index !== 5);
  }, [bankConfig, form, isUsernameOnlySetup, studyPlanPreview.isLoading, studyPlanPreview.plan]);

  useEffect(() => {
    setStepIndex((current) => Math.min(current, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  useEffect(() => {
    setStepInteracted(false);
    setError("");
  }, [stepIndex]);

  const currentStep = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];
  const progressPercent = steps.length ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;
  const isLastStep = stepIndex >= steps.length - 1;
  const currentStepError = currentStep ? validateSetupStep(currentStep.id, form) : "";

  const saveProfile = async () => {
    const validationMessage = validateProfileForm(
      form,
      bankConfig?.availableBankCount
    );
    if (validationMessage) { setError(validationMessage); return; }
    setError("");
    setIsSaving(true);
    try {
      const response = await profileService.saveProfile(toProfileInput(form));
      onProfileCompleted({ ...user, profileCompleted: response.profile.profileCompleted, username: response.profile.username });
      navigateTo("/career");
    } catch (caughtError) {
      setError(caughtError instanceof HttpError ? caughtError.message : "تعذر حفظ الملف الدراسي.");
    } finally { setIsSaving(false); }
  };

  if (isLoadingProfile) return <main className="onboarding-shell" dir="rtl"><p className="status-message">جاري تجهيز ملفك الدراسي...</p></main>;
  if (!currentStep) return <main className="onboarding-shell" dir="rtl"><p className="error-message">{error || "تعذر تحميل إعدادات الأقسام."}</p></main>;

  return (
    <main className="onboarding-shell" dir="rtl">
      <section className="onboarding-layout" aria-labelledby="setup-profile-title">
        <aside className="onboarding-guide">
          <div className="onboarding-header"><p className="page-eyebrow">إعداد الملف الدراسي</p><h1 id="setup-profile-title">لنجهّز خطة عبقور لك</h1><p>أجب عن الأسئلة الأساسية، وسنحسب رحلتك بحسب الأقسام المتاحة وأيام راحتك.</p></div>
          <button className="secondary onboarding-auth-return" type="button" onClick={() => navigateTo("/login")}>← العودة إلى تسجيل الدخول / إنشاء حساب</button>
          <div className="onboarding-progress"><span>السؤال {arabicNumber(stepIndex + 1)} من {arabicNumber(steps.length)}</span><div aria-label={`نسبة الإكمال ${progressPercent}%`} className="onboarding-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}><span style={{ width: `${progressPercent}%` }} /></div></div>
          <p className="onboarding-reassurance">يمكنك تعديل هذه الإجابات لاحقًا من ملفك الشخصي.</p>
        </aside>
        <section className="onboarding-card">
          <section className="onboarding-question"><span className="onboarding-step-number">{arabicNumber(stepIndex + 1)}</span><h2>{currentStep.title}</h2>{currentStep.render()}</section>
          {error || (stepInteracted && currentStepError) ? <p className="error-message" role="alert">{error || currentStepError}</p> : null}
          <div className="onboarding-actions">
            <button className="secondary" type="button" disabled={stepIndex === 0 || isSaving} onClick={() => setStepIndex((current) => current - 1)}>السابق</button>
            <button type="button" disabled={isSaving || Boolean(currentStepError)} onClick={() => isLastStep ? void saveProfile() : setStepIndex((current) => Math.min(current + 1, steps.length - 1))}>{isSaving ? "جاري بناء الخطة..." : isLastStep ? "ولد خطتي" : "التالي"}</button>
          </div>
        </section>
      </section>
    </main>
  );
}
