import { useEffect, useState } from "react";
import { env } from "../../config/env";
import { adminService } from "../../services/adminService";
import type { AdminQuestionBankResponse } from "../../types/admin";
import { answerLabel, formatAdminDate } from "./adminUtils";
import { AdminShell } from "./AdminShell";

const emptyResult: AdminQuestionBankResponse = {
  page: 1,
  pageSize: 50,
  questions: [],
  total: 0
};

export function AdminQuestionBankPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [result, setResult] = useState(emptyResult);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError("");
      void adminService
        .getQuestionBank({ page, pageSize: 50, query, sort })
        .then(setResult)
        .catch(() => setError("تعذر تحميل بنك الأسئلة."))
        .finally(() => setIsLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [page, query, sort]);

  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <AdminShell
      currentPath="/admin/questions"
      description="بحث سريع برقم السؤال مع تحميل صفحة واحدة فقط في كل مرة."
      title="بنك الأسئلة"
    >
      <section className="admin-panel">
        <div className="admin-bank-toolbar">
          <label>
            البحث برقم السؤال
            <input
              dir="ltr"
              inputMode="numeric"
              placeholder="142 أو Q-142"
              type="search"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
          </label>
          <label>
            الترتيب
            <select value={sort} onChange={(event) => { setPage(1); setSort(event.target.value as "asc" | "desc"); }}>
              <option value="asc">رقم السؤال ↑</option>
              <option value="desc">رقم السؤال ↓</option>
            </select>
          </label>
          <span>{result.total.toLocaleString("ar-SA")} سؤال</span>
        </div>

        {error ? <p className="admin-alert error">{error}</p> : null}
        {isLoading ? <p className="admin-empty">جاري تحميل الأسئلة...</p> : null}
        {!isLoading && result.questions.length === 0 ? <p className="admin-empty">لا توجد أسئلة مطابقة.</p> : null}

        {result.questions.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>رقم السؤال</th><th>الصورة</th><th>القسم</th><th>الإجابة</th><th>الاستيراد</th></tr></thead>
              <tbody>
                {result.questions.map((question) => (
                  <tr key={question.id}>
                    <td><strong dir="ltr">{question.id}</strong></td>
                    <td>{question.imageExists ? <img alt={`السؤال ${question.questionNumber}`} loading="lazy" src={`${env.apiUrl}${question.questionImageUrl}`} /> : <span className="admin-missing">مفقودة</span>}</td>
                    <td><strong>{question.topic}</strong><small>{question.topicId ?? "غير مصنف"}</small></td>
                    <td>{answerLabel(question.correctAnswer)}</td>
                    <td>{question.importJobId ? <span><b>#{question.importJobId.slice(0, 8)}</b><small>{question.importedAt ? formatAdminDate(question.importedAt) : ""}</small></span> : "قديم / يدوي"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="admin-pagination">
          <button className="secondary" disabled={page <= 1} type="button" onClick={() => setPage((current) => current - 1)}>السابق</button>
          <span>صفحة {page.toLocaleString("ar-SA")} من {pageCount.toLocaleString("ar-SA")}</span>
          <button className="secondary" disabled={page >= pageCount} type="button" onClick={() => setPage((current) => current + 1)}>التالي</button>
        </div>
      </section>
    </AdminShell>
  );
}
