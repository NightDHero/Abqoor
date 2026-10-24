import { AbqoorGuide } from "../components/tutorial/AbqoorGuide";
import { navigateTo } from "../utils/router";

export function NotFoundPage() {
  return (
    <main className="not-found-page" dir="rtl">
      <div className="not-found-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section className="not-found-scene" aria-labelledby="not-found-title">
        <div className="not-found-copy">
          <p className="not-found-code">404 <span>المسار ضاع</span></p>
          <h1 id="not-found-title">لم يتم العثور على الصفحة</h1>
          <p>يبدو أن الصفحة التي تبحث عنها غيّرت طريقها أو لم تعد موجودة.</p>
          <div className="not-found-actions">
            <button type="button" onClick={() => navigateTo("/")}>
              العودة للرئيسية
            </button>
            <button
              className="not-found-back"
              type="button"
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else navigateTo("/");
              }}
            >
              الرجوع للخلف
            </button>
          </div>
        </div>
        <div className="not-found-character" aria-hidden="true">
          <span className="not-found-orbit" />
          <AbqoorGuide expression="confused" />
          <i>؟</i>
        </div>
      </section>
    </main>
  );
}
