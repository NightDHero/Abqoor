import { useEffect, useRef } from "react";
import {
  AdaptiveSessionVisual,
  FloatingQuestionField,
  FocusMapVisual,
  HomeQuestionCard,
  MockExamJourneyVisual,
  QuickExplanationVisual,
  TopicPathVisual,
  showcaseQuestions
} from "../features/home/HomeProductVisuals";
import {
  arrivalQuestionPlacements,
  recognitionQuestionPlacements,
  transitionQuestionPlacements
} from "../features/home/homeQuestionData";
import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

export function LandingPage({
  isLoadingUser,
  user
}: {
  isLoadingUser: boolean;
  user: User | null;
}) {
  const journeyRef = useRef<HTMLElement>(null);
  const primaryDestination = user
    ? user.profileCompleted
      ? "/career"
      : "/setup-profile"
    : "/register";

  useEffect(() => {
    const journey = journeyRef.current;
    if (!journey) {
      return;
    }

    const revealItems = journey.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        rootMargin: "-8% 0px -12%",
        threshold: 0.16
      }
    );

    revealItems.forEach((item) => observer.observe(item));
    journey.querySelector<HTMLElement>(".home-arrival-copy")?.classList.add(
      "is-visible"
    );

    return () => observer.disconnect();
  }, []);

  const primaryLabel = isLoadingUser
    ? "جاري التحقق..."
    : user
      ? "كمل رحلتك"
      : "ابدأ رحلتك";

  return (
    <main className="public-home" dir="rtl" ref={journeyRef}>
      <div className="home-ambient-world" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>س</span>
        <span>ص</span>
        <span>π</span>
      </div>

      <section className="home-arrival" aria-labelledby="home-arrival-title">
        <div className="home-brand-mark" aria-label="عبقور، تدريب القدرات">
          <strong>عبقور</strong>
          <span>تدريب القدرات</span>
        </div>

        <FloatingQuestionField
          className="home-arrival-questions"
          placements={arrivalQuestionPlacements}
        />

        <div className="home-arrival-copy" data-reveal>
          <p>رحلتك تبدأ من سؤال واحد</p>
          <h1 id="home-arrival-title">
            مو لازم تبدأ
            <span>وأنت عارف كل شيء</span>
          </h1>
          <strong>المهم تعرف من وين تبدأ.</strong>
          <div className="home-arrival-actions">
            <button
              className="home-journey-entry"
              disabled={isLoadingUser}
              type="button"
              onClick={() => navigateTo(primaryDestination)}
            >
              <span>{primaryLabel}</span>
              <i aria-hidden="true" />
            </button>
            {!user ? (
              <button
                className="home-account-entry"
                type="button"
                onClick={() => navigateTo("/login")}
              >
                لدي حساب
              </button>
            ) : null}
          </div>
        </div>

        <a className="home-scroll-cue" href="#home-recognition">
          <span>اكتشف رحلتك</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <section
        className="home-recognition"
        id="home-recognition"
        aria-labelledby="home-recognition-title"
      >
        <FloatingQuestionField
          className="home-recognition-questions"
          placements={recognitionQuestionPlacements}
        />

        <div className="home-recognition-copy" data-reveal>
          <span>خلّنا نسألك أول</span>
          <div className="home-dialogue-lines">
            <h2 id="home-recognition-title">تبغى تختبر روحك؟</h2>
            <p>تبغى تعرف جانبك الضعيف؟</p>
            <p>تبغى كل الأسئلة مقسمة بأقسامها؟</p>
            <p>اختبارك قرب وتبغى تدريب مركز؟</p>
          </div>
        </div>

        <div className="home-recognition-showcase" data-reveal>
          <HomeQuestionCard question={showcaseQuestions.analogy} />
          <HomeQuestionCard question={showcaseQuestions.oddWord} />
          <HomeQuestionCard question={showcaseQuestions.sentence} />
        </div>
      </section>

      <section className="home-time-journey" aria-labelledby="home-time-title">
        <header data-reveal>
          <span>مهما كان وقتك</span>
          <h2 id="home-time-title">لك طريق يبدأ من مكانك.</h2>
        </header>

        <div className="home-time-fork" data-reveal>
          <article>
            <span>المسار المركّز</span>
            <h3>اختبارك بكرة؟</h3>
            <p>اختبر، اكتشف ضعفك، وركّز.</p>
          </article>
          <div className="home-time-fork-line" aria-hidden="true">
            <i />
            <span />
            <i />
          </div>
          <article>
            <span>مسار البناء</span>
            <h3>باقي لك سنة؟</h3>
            <p>ابنِ الأساس، وتدرّج على راحتك.</p>
          </article>
        </div>

        <FloatingQuestionField
          className="home-transition-questions"
          placements={transitionQuestionPlacements}
        />
      </section>

      <section
        className="home-library-journey"
        aria-labelledby="home-library-title"
      >
        <header className="home-journey-heading" data-reveal>
          <span>أول شيء عندك</span>
          <h2 id="home-library-title">موسوعة الأسئلة</h2>
          <p>ادخل على النوع اللي تبيه، وامشِ من العنوان للسؤال مباشرة.</p>
        </header>
        <div data-reveal>
          <TopicPathVisual />
        </div>
      </section>

      <section
        className="home-smart-journey"
        aria-labelledby="home-smart-title"
      >
        <header className="home-journey-heading" data-reveal>
          <span>وبعد ما نعرف مستواك...</span>
          <h2 id="home-smart-title">البرنامج الذكي</h2>
          <p>
            ما يرمي عليك أسئلة عشوائية. يبني لك حصة من إجاباتك، أخطائك،
            والجوانب اللي تحتاج تثبيت.
          </p>
        </header>
        <div data-reveal>
          <AdaptiveSessionVisual />
        </div>
      </section>

      <section
        className="home-exam-journey"
        aria-labelledby="home-exam-title"
      >
        <div className="home-exam-intro" data-reveal>
          <span>اختبار كامل</span>
          <h2 id="home-exam-title">تبي تعرف مستواك صدق؟</h2>
          <p>جرّب محاكاة قريبة من جو القدرات قبل يوم الاختبار.</p>
        </div>

        <div className="home-exam-transition" data-reveal>
          <MockExamJourneyVisual />
          <div className="home-exam-to-focus" aria-hidden="true">
            <span />
            <i />
            <span />
          </div>
          <FocusMapVisual />
        </div>

        <div className="home-clarity-copy" data-reveal>
          <span>بعد كل محاولة...</span>
          <h2>صورتك أوضح.</h2>
          <p>تعرف وين تحتاج تركز، من غير ضياع.</p>
        </div>
      </section>

      <section
        className="home-explanation-journey"
        aria-labelledby="home-explanation-title"
      >
        <header className="home-journey-heading" data-reveal>
          <span>وإذا وقفت عليك فكرة</span>
          <h2 id="home-explanation-title">علقت في سؤال؟</h2>
          <p>شرح صغير وقت الحاجة، من غير ما يقطع عليك الحل.</p>
        </header>
        <div data-reveal>
          <QuickExplanationVisual />
        </div>
      </section>

      <section className="home-final-journey" aria-labelledby="home-final-title">
        <div className="home-final-question-stream" aria-hidden="true">
          <span>إكمال الجمل</span>
          <i />
          <span>الجبر</span>
          <i />
          <span>اختبار محاكي</span>
          <i />
          <span>خطتك الجاية</span>
        </div>

        <div data-reveal>
          <p>ابدأ من مكانك</p>
          <h2 id="home-final-title">يلا، خلنا نعرف مستواك.</h2>
          <button
            className="home-journey-entry"
            disabled={isLoadingUser}
            type="button"
            onClick={() => navigateTo(primaryDestination)}
          >
            <span>{user ? "كمل رحلتك" : "سجّل وابدأ"}</span>
            <i aria-hidden="true" />
          </button>
          {!user ? (
            <button
              className="home-account-entry"
              type="button"
              onClick={() => navigateTo("/login")}
            >
              لدي حساب
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
