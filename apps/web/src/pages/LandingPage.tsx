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
        <p className="page-eyebrow">عبقور</p>
        <h1 className="landing-title">أساس تجربة عبقور</h1>
        <p className="landing-summary">
          تم تجهيز أساس الواجهة العربية، التوجيه، الحماية، والتنقل. صفحات
          المنتج التفصيلية ستبنى تدريجيا حسب خطة التنفيذ.
        </p>
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
      </section>
    </main>
  );
}
