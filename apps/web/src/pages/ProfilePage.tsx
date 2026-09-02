import { FormEvent, useEffect, useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { SummaryMetric } from "../components/ui/SummaryMetric";
import {
  createDefaultProfileForm,
  toProfileInput,
  validateProfileForm,
  type ProfileFormState
} from "../features/profile/profileFormState";
import {
  studyStrategyPreferenceOptions,
  studyStylePreferenceOptions,
  weakerSectionOptions,
  weeklyStudyHourOptions
} from "../features/profile/profileOptions";
import { HttpError } from "../services/http";
import { profileService } from "../services/profileService";
import type { ThemePreference } from "../theme/theme";
import type { User } from "../types/auth";
import type {
  StudyStrategyPreference,
  StudyStylePreference,
  WeakerSection,
  WeeklyStudyHours
} from "../types/profile";

const themePreferenceOptions: Array<{
  label: string;
  value: ThemePreference;
}> = [
  { label: "فاتح", value: "light" },
  { label: "داكن", value: "dark" }
];

function InlineOptions<T extends string>({
  options,
  value,
  onChange
}: {
  options: Array<{ label: string; value: T }>;
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <div className="profile-option-row">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={value === option.value ? "profile-choice selected" : "profile-choice"}
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

export function ProfilePage({
  activeTheme,
  onThemeChange,
  onProfileSaved,
  user
}: {
  activeTheme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onProfileSaved: (user: User) => void;
  user: User;
}) {
  const [form, setForm] = useState<ProfileFormState>(() =>
    createDefaultProfileForm()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const examDateLabel = form.hasExamDate && form.examDate
    ? new Date(`${form.examDate}T00:00:00`).toLocaleDateString("ar-SA", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "غير محدد";
  const weeklyHoursLabel =
    weeklyStudyHourOptions.find((option) => option.value === form.weeklyStudyHours)
      ?.label ?? "لم يحدد";
  const weakerSectionLabel =
    weakerSectionOptions.find((option) => option.value === form.weakerSection)
      ?.label ?? "لم يحدد";

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await profileService.getProfile();

        if (isMounted) {
          setForm(createDefaultProfileForm(response.profile));
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof HttpError
              ? caughtError.message
              : "تعذر تحميل الملف الدراسي."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateForm = (nextValues: Partial<ProfileFormState>) => {
    setError("");
    setMessage("");
    setForm((currentForm) => ({
      ...currentForm,
      ...nextValues
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateProfileForm(form);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await profileService.saveProfile(toProfileInput(form));
      onProfileSaved({
        ...user,
        profileCompleted: response.profile.profileCompleted,
        username: response.profile.username
      });
      setMessage("تم حفظ التغييرات.");
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر حفظ الملف الدراسي."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer
      eyebrow="الحساب"
      title="ملفي"
    >
      {isLoading ? <p className="status-message">جاري تحميل الملف الدراسي...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {message ? <p className="status-message">{message}</p> : null}

      <section className="profile-dashboard-head" aria-label="هوية وملخص الملف الدراسي">
        <div className="profile-identity">
          <span className="profile-identity-avatar">
            <img alt="" src="/assets/hub/avatar.png" />
          </span>
          <div>
            <strong>{form.username || "مستخدم عبقور"}</strong>
            <span dir="ltr">{user.email}</span>
          </div>
        </div>

        <div className="profile-overview">
          <SummaryMetric
            label="الدرجة المستهدفة"
            value={form.targetScore}
          />
          <SummaryMetric
            label="الاختبار"
            value={examDateLabel}
          />
          <SummaryMetric
            label="إيقاع الدراسة"
            value={weeklyHoursLabel}
          />
          <SummaryMetric
            label="التحدي الأكبر"
            value={weakerSectionLabel}
          />
        </div>
      </section>

      <form className="profile-form" id="settings" onSubmit={handleSubmit}>
        <header className="profile-editor-heading">
          <h2>إعدادات الملف</h2>
        </header>
        <section className="profile-section" aria-labelledby="account-section">
          <h2 id="account-section">الحساب</h2>
          <div className="profile-field-grid">
            <label className="form-field profile-username-field">
              اسم المستخدم
              <input
                autoComplete="username"
                dir="ltr"
                maxLength={24}
                minLength={3}
                type="text"
                value={form.username}
                onChange={(event) =>
                  updateForm({ username: event.target.value })
                }
              />
              <small>هويتك العامة داخل أبقور</small>
            </label>
            <div>
              <span>البريد الإلكتروني</span>
              <strong dir="ltr">{user.email}</strong>
            </div>
            <div>
              <span>كلمة المرور</span>
              <strong>تدار من نظام تسجيل الدخول</strong>
            </div>
          </div>
        </section>

        <section
          className="profile-section profile-appearance-section"
          aria-labelledby="appearance-section"
        >
          <h2 id="appearance-section">المظهر</h2>
          <div className="form-field">
            واجهة عبقور
            <InlineOptions
              options={themePreferenceOptions}
              value={activeTheme}
              onChange={onThemeChange}
            />
          </div>
        </section>

        <section className="profile-section" aria-labelledby="study-goals-section">
          <h2 id="study-goals-section">أهداف الدراسة</h2>
          <label className="form-field">
            الدرجة المستهدفة: {form.targetScore}
            <input
              max={100}
              min={50}
              type="range"
              value={form.targetScore}
              onChange={(event) =>
                updateForm({ targetScore: Number(event.target.value) })
              }
            />
          </label>

          <div className="profile-option-row">
            <button
              aria-pressed={form.hasExamDate}
              className={form.hasExamDate ? "profile-choice selected" : "profile-choice"}
              type="button"
              onClick={() => updateForm({ hasExamDate: true })}
            >
              لدي موعد اختبار
            </button>
            <button
              aria-pressed={!form.hasExamDate}
              className={!form.hasExamDate ? "profile-choice selected" : "profile-choice"}
              type="button"
              onClick={() => updateForm({ examDate: "", hasExamDate: false })}
            >
              ليس لدي موعد حتى الآن
            </button>
          </div>
          {form.hasExamDate ? (
            <label className="form-field">
              موعد الاختبار
              <input
                type="date"
                value={form.examDate}
                onChange={(event) => updateForm({ examDate: event.target.value })}
              />
            </label>
          ) : null}
        </section>

        <section className="profile-section" aria-labelledby="study-profile-section">
          <h2 id="study-profile-section">الملف الدراسي</h2>
          <div className="profile-option-row">
            <button
              aria-pressed={form.hasTakenQudurat === true}
              className={
                form.hasTakenQudurat === true
                  ? "profile-choice selected"
                  : "profile-choice"
              }
              type="button"
              onClick={() => updateForm({ hasTakenQudurat: true })}
            >
              سبق لي دخول الاختبار
            </button>
            <button
              aria-pressed={form.hasTakenQudurat === false}
              className={
                form.hasTakenQudurat === false
                  ? "profile-choice selected"
                  : "profile-choice"
              }
              type="button"
              onClick={() =>
                updateForm({
                  attemptCount: "",
                  hasTakenQudurat: false,
                  latestScore: ""
                })
              }
            >
              لم أدخل الاختبار بعد
            </button>
          </div>

          {form.hasTakenQudurat ? (
            <div className="profile-two-column">
              <label className="form-field">
                عدد المحاولات
                <input
                  min={1}
                  type="number"
                  value={form.attemptCount}
                  onChange={(event) =>
                    updateForm({ attemptCount: event.target.value })
                  }
                />
              </label>
              <label className="form-field">
                آخر درجة
                <input
                  max={100}
                  min={0}
                  type="number"
                  value={form.latestScore}
                  onChange={(event) =>
                    updateForm({ latestScore: event.target.value })
                  }
                />
              </label>
            </div>
          ) : null}

          <div className="form-field">
            القسم الأضعف
            <InlineOptions
              options={weakerSectionOptions}
              value={form.weakerSection}
              onChange={(weakerSection: WeakerSection) =>
                updateForm({ weakerSection })
              }
            />
          </div>
        </section>

        <section className="profile-section" aria-labelledby="preferences-section">
          <h2 id="preferences-section">تفضيلات الدراسة</h2>
          <div className="form-field">
            ساعات الدراسة الأسبوعية
            <InlineOptions
              options={weeklyStudyHourOptions}
              value={form.weeklyStudyHours}
              onChange={(weeklyStudyHours: WeeklyStudyHours) =>
                updateForm({ weeklyStudyHours })
              }
            />
          </div>
          <div className="form-field">
            أسلوب الدراسة
            <InlineOptions
              options={studyStylePreferenceOptions}
              value={form.studyStylePreference}
              onChange={(studyStylePreference: StudyStylePreference) =>
                updateForm({ studyStylePreference })
              }
            />
          </div>
          <div className="form-field">
            استراتيجية الخطة الدراسية
            <InlineOptions
              options={studyStrategyPreferenceOptions}
              value={form.studyStrategyPreference}
              onChange={(studyStrategyPreference: StudyStrategyPreference) =>
                updateForm({ studyStrategyPreference })
              }
            />
          </div>
        </section>

        <div className="action-row">
          <button type="submit" disabled={isSaving || isLoading}>
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات الآن"}
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
