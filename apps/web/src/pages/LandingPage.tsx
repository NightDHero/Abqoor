import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

export function LandingPage({
  isLoadingUser,
  user
}: {
  isLoadingUser: boolean;
  user: User | null;
}) {
  return (
    <main className="landing-shell" dir="rtl">
      <section className="landing-panel">
        <div className="landing-copy">
          <p className="page-eyebrow">عبقور</p>
          <h1 className="landing-title">تدريب أذكى.<br />تقدّم أوضح.</h1>
          <p className="landing-summary">
            مساحة عربية هادئة تساعدك على فهم مستواك، اختيار ما تحتاجه،
            والاستمرار بثقة حتى يوم اختبار القدرات.
          </p>
        </div>
        <aside className="landing-entry" aria-label="الدخول إلى عبقور">
          <p>ابدأ من مستواك الحالي</p>
          {isLoadingUser ? (
            <p className="status-message">جاري التحقق من الجلسة...</p>
          ) : (
            <div className="action-row">
              {user ? (
                <button
                  type="button"
                  onClick={() =>
                    navigateTo(user.profileCompleted ? "/career" : "/setup-profile")
                  }
                >
                  دخول التطبيق
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => navigateTo("/register")}>
                    إنشاء حساب
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => navigateTo("/login")}
                  >
                    تسجيل الدخول
                  </button>
                </>
              )}
            </div>
          )}
          <span>الكمي واللفظي في تجربة واحدة</span>
        </aside>
      </section>
    </main>
  );
}
