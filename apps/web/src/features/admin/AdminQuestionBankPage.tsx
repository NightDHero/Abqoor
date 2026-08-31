import { useEffect, useState } from "react";
import { env } from "../../config/env";
import { adminService } from "../../services/adminService";
import type {
  AdminQuestionBankResponse,
  AdminQuestionSubjectCount,
  AdminQuestionTopicCount
} from "../../types/admin";
import { answerLabel, formatAdminDate } from "./adminUtils";
import { AdminShell } from "./AdminShell";

const emptyResult: AdminQuestionBankResponse = {
  page: 1,
  pageSize: 50,
  questionCounts: { subjects: [] },
  questions: [],
  total: 0
};

const topicCountKey = (
  subject: AdminQuestionSubjectCount,
  topic: AdminQuestionTopicCount
) => `${subject.subjectId}:${topic.topicId ?? topic.topicLabel}`;

export function AdminQuestionBankPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [result, setResult] = useState(emptyResult);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTopicKey, setSelectedTopicKey] = useState("");

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
      {result.questionCounts.subjects.length > 0 ? (
        <section
          aria-label="توزيع بنك الأسئلة"
          className="admin-panel admin-bank-overview"
        >
          {result.questionCounts.subjects.map((subject) => {
            const maxTopicCount = Math.max(
              1,
              ...subject.topics.map((topic) => topic.count)
            );
            const selectedTopic =
              subject.topics.find(
                (topic) => topicCountKey(subject, topic) === selectedTopicKey
              ) ?? null;
            const maxSubtopicCount = Math.max(
              1,
              ...(selectedTopic?.subtopics.map((subtopic) => subtopic.count) ??
                [])
            );

            return (
              <article
                className={`admin-bank-overview-subject admin-bank-overview-${subject.subjectId}`}
                key={subject.subjectId}
              >
                <header>
                  <span>{subject.subjectLabel}</span>
                  <strong>
                    {subject.total.toLocaleString("ar-SA")} سؤال
                  </strong>
                </header>

                <div className="admin-topic-pillars" role="list">
                  {subject.topics.map((topic) => {
                    const key = topicCountKey(subject, topic);
                    const height = Math.max(
                      topic.count > 0 ? 12 : 4,
                      (topic.count / maxTopicCount) * 100
                    );

                    return (
                      <button
                        aria-pressed={selectedTopicKey === key}
                        className={
                          selectedTopicKey === key ? "selected" : undefined
                        }
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedTopicKey((current) =>
                            current === key ? "" : key
                          );
                        }}
                      >
                        <span className="admin-topic-pillar-track">
                          <span style={{ height: `${height}%` }} />
                        </span>
                        <strong>{topic.topicLabel}</strong>
                        <small>
                          {topic.count.toLocaleString("ar-SA")} سؤال
                        </small>
                      </button>
                    );
                  })}
                </div>

                {selectedTopic && selectedTopic.subtopics.length > 0 ? (
                  <div
                    aria-label={`تفصيل ${selectedTopic.topicLabel}`}
                    className="admin-subtopic-counts"
                  >
                    {selectedTopic.subtopics.map((subtopic) => (
                      <div
                        className="admin-subtopic-count"
                        key={subtopic.subtopicId ?? subtopic.subtopicLabel}
                      >
                        <span>{subtopic.subtopicLabel}</span>
                        <div>
                          <span
                            style={{
                              width: `${Math.max(
                                subtopic.count > 0 ? 8 : 3,
                                (subtopic.count / maxSubtopicCount) * 100
                              )}%`
                            }}
                          />
                        </div>
                        <strong>
                          {subtopic.count.toLocaleString("ar-SA")}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

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
            <select
              value={sort}
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value as "asc" | "desc");
              }}
            >
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
              <thead><tr><th>رقم السؤال</th><th>الصورة</th><th>القسم</th><th>الإجابة</th><th>الرفع</th></tr></thead>
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
