import { navigateTo } from "../utils/router";

export function NotFoundPage() {
  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <p className="page-eyebrow">غير موجود</p>
        <h1 className="landing-title">لم يتم العثور على الصفحة</h1>
        <p className="landing-summary">
          المسار المطلوب غير موجود ضمن أساس الواجهة الحالي.
        </p>
        <button type="button" onClick={() => navigateTo("/")}>
          العودة للبداية
        </button>
      </section>
    </main>
  );
}
