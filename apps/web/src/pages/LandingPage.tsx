import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

export function LandingPage({
  isLoadingUser,
  user
}: {
  isLoadingUser: boolean;
  user: User | null;
}) {
  const primaryDestination = user
    ? user.profileCompleted
      ? "/career"
      : "/setup-profile"
    : "/register";

  return (
    <main className="public-home" dir="rtl">
      <nav className="public-home-nav" aria-label="تنقل الصفحة الرئيسية">
        <a
          className="public-home-brand"
          href="/"
          onClick={(event) => event.preventDefault()}
        >
          <strong>عبقور</strong>
          <span>تدريب القدرات</span>
        </a>
        <div className="public-home-nav-actions">
          {!user ? (
            <button
              className="public-home-text-action"
              type="button"
              onClick={() => navigateTo("/login")}
            >
              تسجيل الدخول
            </button>
          ) : null}
          <button
            className="public-home-primary-action"
            disabled={isLoadingUser}
            type="button"
            onClick={() => navigateTo(primaryDestination)}
          >
            {isLoadingUser
              ? "جاري التحقق..."
              : user
                ? "دخول المركز"
                : "ابدأ الآن"}
          </button>
        </div>
      </nav>

      <section className="public-home-hero">
        <div className="public-home-copy">
          <p className="public-home-kicker">رحلتك نحو درجة أقوى تبدأ من فهمك</p>
          <h1>
            تعلّم بوضوح.
            <span> تقدّم بثقة.</span>
          </h1>
          <p>
            بيئة عربية متكاملة تجمع التدريب الكمي واللفظي، الحصص الموجّهة،
            والاختبارات المحاكية في رحلة واحدة هادئة نحو الإتقان.
          </p>
          <div className="public-home-hero-actions">
            <button
              className="public-home-primary-action"
              disabled={isLoadingUser}
              type="button"
              onClick={() => navigateTo(primaryDestination)}
            >
              {user ? "انتقل إلى المركز" : "أنشئ حسابك"}
            </button>
            {!user ? (
              <button
                className="public-home-secondary-action"
                type="button"
                onClick={() => navigateTo("/login")}
              >
                لدي حساب
              </button>
            ) : null}
          </div>
        </div>

        <div className="public-home-world-preview" aria-label="العالمان الكمي واللفظي">
          <article className="public-home-world public-home-world-math">
            <span>01</span>
            <h2>الكمي</h2>
            <p>مهارات مترابطة تبني دقتك خطوة بخطوة.</p>
          </article>
          <article className="public-home-world public-home-world-verbal">
            <span>02</span>
            <h2>اللفظي</h2>
            <p>فهم أعمق للغة وسرعة أوضح في الاختيار.</p>
          </article>
        </div>
      </section>

      <section className="public-home-features" aria-labelledby="features-title">
        <header>
          <p>كل ما تحتاجه في مسار واحد</p>
          <h2 id="features-title">تجربة تتقدم معك</h2>
        </header>
        <div>
          <article>
            <span>01</span>
            <h3>استكشف بحرية</h3>
            <p>انتقل بين المحاور والأسئلة بالترتيب الذي يناسبك.</p>
          </article>
          <article>
            <span>02</span>
            <h3>تدرّب بذكاء</h3>
            <p>جلسات موجّهة تستفيد من إجاباتك السابقة.</p>
          </article>
          <article>
            <span>03</span>
            <h3>اختبر جاهزيتك</h3>
            <p>محاكاة جادة تمنحك صورة أوضح قبل الاختبار.</p>
          </article>
        </div>
      </section>

      <section className="public-home-cta">
        <div>
          <p>ابدأ من مستواك الحالي</p>
          <h2>كل إجابة تقرّبك من هدفك.</h2>
        </div>
        <button
          className="public-home-primary-action"
          type="button"
          onClick={() => navigateTo(primaryDestination)}
        >
          {user ? "العودة إلى المركز" : "ابدأ رحلتك"}
        </button>
      </section>
    </main>
  );
}
