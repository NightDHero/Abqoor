import { useMemo, useState, type ReactNode } from "react";
import { profileService } from "../services/profileService";
import { HttpError } from "../services/http";
import type { User } from "../types/auth";
import type {
  StudyStrategyPreference,
  StudyStylePreference,
  WeakerSection,
  WeeklyStudyHours
} from "../types/profile";
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
import { navigateTo } from "../utils/router";

type SetupStep = {
  number: number;
  title: string;
  render: () => ReactNode;
};

const arabicNumber = (value: number) => value.toLocaleString("ar-SA");

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
  const [form, setForm] = useState<ProfileFormState>(() =>
    createDefaultProfileForm()
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateForm = (nextValues: Partial<ProfileFormState>) => {
    setError("");
    setForm((currentForm) => ({
      ...currentForm,
      ...nextValues
    }));
  };

  const steps = useMemo<SetupStep[]>(() => {
    const allSteps: SetupStep[] = [
      {
        number: 1,
        title: "ما الدرجة التي تستهدف تحقيقها في اختبار القدرات؟",
        render: () => (
          <label className="onboarding-slider">
            <span>{form.targetScore}</span>
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
        )
      },
      {
        number: 2,
        title: "متى موعد اختبارك القادم؟",
        render: () => (
          <div className="onboarding-stack">
            <div className="onboarding-options">
              <button
                aria-pressed={form.hasExamDate}
                className={form.hasExamDate ? "onboarding-option selected" : "onboarding-option"}
                type="button"
                onClick={() => updateForm({ hasExamDate: true })}
              >
                لدي موعد اختبار
              </button>
              <button
                aria-pressed={!form.hasExamDate}
                className={!form.hasExamDate ? "onboarding-option selected" : "onboarding-option"}
                type="button"
                onClick={() => updateForm({ examDate: "", hasExamDate: false })}
              >
                ليس لدي موعد حتى الآن
              </button>
            </div>
            {form.hasExamDate ? (
              <label className="form-field">
                تاريخ الاختبار
                <input
                  type="date"
                  value={form.examDate}
                  onChange={(event) => updateForm({ examDate: event.target.value })}
                />
              </label>
            ) : null}
          </div>
        )
      },
      {
        number: 3,
        title: "كم ساعة تستطيع الدراسة أسبوعياً بشكل واقعي؟",
        render: () => (
          <OptionButtons
            options={weeklyStudyHourOptions}
            value={form.weeklyStudyHours}
            onChange={(weeklyStudyHours: WeeklyStudyHours) =>
              updateForm({ weeklyStudyHours })
            }
          />
        )
      },
      {
        number: 4,
        title: "هل سبق لك دخول اختبار القدرات؟",
        render: () => (
          <div className="onboarding-options">
            <button
              aria-pressed={form.hasTakenQudurat === true}
              className={
                form.hasTakenQudurat === true
                  ? "onboarding-option selected"
                  : "onboarding-option"
              }
              type="button"
              onClick={() => updateForm({ hasTakenQudurat: true })}
            >
              نعم
            </button>
            <button
              aria-pressed={form.hasTakenQudurat === false}
              className={
                form.hasTakenQudurat === false
                  ? "onboarding-option selected"
                  : "onboarding-option"
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
              لا
            </button>
          </div>
        )
      },
      {
        number: 5,
        title: "كم مرة دخلت اختبار القدرات؟",
        render: () => (
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
        )
      },
      {
        number: 6,
        title: "ما آخر درجة حصلت عليها؟",
        render: () => (
          <label className="form-field">
            آخر درجة
            <input
              max={100}
              min={0}
              type="number"
              value={form.latestScore}
              onChange={(event) => updateForm({ latestScore: event.target.value })}
            />
          </label>
        )
      },
      {
        number: 7,
        title: "أي القسمين يمثل تحدياً أكبر بالنسبة لك؟",
        render: () => (
          <OptionButtons
            options={weakerSectionOptions}
            value={form.weakerSection}
            onChange={(weakerSection: WeakerSection) =>
              updateForm({ weakerSection })
            }
          />
        )
      },
      {
        number: 8,
        title: "كيف تفضل الدراسة عادة؟",
        render: () => (
          <OptionButtons
            options={studyStylePreferenceOptions}
            value={form.studyStylePreference}
            onChange={(studyStylePreference: StudyStylePreference) =>
              updateForm({ studyStylePreference })
            }
          />
        )
      },
      {
        number: 9,
        title: "كيف تفضل أن تبني أبقور خطتك الدراسية؟",
        render: () => (
          <OptionButtons
            options={studyStrategyPreferenceOptions}
            value={form.studyStrategyPreference}
            onChange={(studyStrategyPreference: StudyStrategyPreference) =>
              updateForm({ studyStrategyPreference })
            }
          />
        )
      }
    ];

    return form.hasTakenQudurat === true
      ? allSteps
      : allSteps.filter((step) => step.number !== 5 && step.number !== 6);
  }, [form]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const progressPercent = Math.round(((stepIndex + 1) / steps.length) * 100);
  const isLastStep = stepIndex >= steps.length - 1;

  const saveProfile = async () => {
    const validationMessage = validateProfileForm(form);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await profileService.saveProfile(toProfileInput(form));
      onProfileCompleted({
        ...user,
        profileCompleted: response.profile.profileCompleted
      });
      navigateTo("/career");
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

  const goNext = () => {
    setError("");

    if (isLastStep) {
      void saveProfile();
      return;
    }

    setStepIndex((currentIndex) => Math.min(currentIndex + 1, steps.length - 1));
  };

  return (
    <main className="onboarding-shell" dir="rtl">
      <section className="onboarding-layout" aria-labelledby="setup-profile-title">
        <aside className="onboarding-guide">
          <div className="onboarding-header">
          <p className="page-eyebrow">إعداد الملف الدراسي</p>
          <h1 id="setup-profile-title">لنجهّز خطة أبقور لك</h1>
          <p>
            هذه الأسئلة تساعد أبقور على تخصيص الدراسة، تحسين التوقعات، وبناء
            توصيات أكثر دقة.
          </p>
          </div>

          <div className="onboarding-progress">
          <span>
            السؤال {arabicNumber(currentStep.number)} من {arabicNumber(9)}
          </span>
          <div
            aria-label={`نسبة الإكمال ${progressPercent}%`}
            className="onboarding-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          </div>
          <p className="onboarding-reassurance">يمكنك تعديل هذه الإجابات لاحقًا من ملفك الشخصي.</p>
        </aside>

        <section className="onboarding-card">
          <section className="onboarding-question">
            <span className="onboarding-step-number">{arabicNumber(currentStep.number)}</span>
            <h2>{currentStep.title}</h2>
            {currentStep.render()}
          </section>

          {error ? <p className="error-message">{error}</p> : null}

          <div className="onboarding-actions">
          <button
            className="secondary"
            type="button"
            disabled={stepIndex === 0 || isSaving}
            onClick={() => setStepIndex((currentIndex) => currentIndex - 1)}
          >
            السابق
          </button>
          <button type="button" disabled={isSaving} onClick={goNext}>
            {isSaving ? "جاري الحفظ..." : isLastStep ? "إنهاء الإعداد" : "التالي"}
          </button>
          </div>
        </section>
      </section>
    </main>
  );
}
