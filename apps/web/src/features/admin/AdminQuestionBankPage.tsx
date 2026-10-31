import { useEffect, useRef, useState } from "react";
import { env } from "../../config/env";
import { adminService } from "../../services/adminService";
import { shouldAvoidSpeculativePreloading } from "../../utils/networkPreferences";
import type {
  AdminQuestionBankResponse,
  AdminQuestionSubjectCount,
  AdminQuestionTopicCount
} from "../../types/admin";
import { answerLabel, formatAdminDate } from "./adminUtils";
import { AdminShell } from "./AdminShell";
import {
  getQuestionBankPageCount,
  shouldShowQuestionBankEmptyState
} from "./adminQuestionBankState";

const emptyResult: AdminQuestionBankResponse = {
  banks: [],
  mode: "general",
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

const sectionLabel = (subject: string) =>
  subject === "quantitative" ? "الكمي" : "اللفظي";

export function AdminQuestionBankPage() {
  const initialCache = adminService.getCachedQuestionBank({
    mode: "general",
    page: 1,
    pageSize: 50,
    sort: "asc"
  });
  const [mode, setMode] = useState<"general" | "aqsam">("general");
  const [bankId, setBankId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [result, setResult] = useState(initialCache?.data ?? emptyResult);
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [error, setError] = useState("");
  const [selectedTopicKey, setSelectedTopicKey] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    const request = {
      bankId: bankId || undefined,
      mode,
      page,
      pageSize: 50,
      query,
      sort
    };
    const cached = adminService.getCachedQuestionBank(request);
    setResult(cached?.data ?? {
      ...emptyResult,
      mode,
      page
    });
    setIsLoading(!cached);
    setError("");

    const timer = window.setTimeout(() => {
      const loadQuestionBank = async () => {
        try {
          const response = await adminService.getQuestionBank(request);
          if (requestVersionRef.current === requestVersion) {
            setResult(response);
          }
        } catch (requestError) {
          if (requestVersionRef.current !== requestVersion) return;
          setError(
            requestError instanceof Error && requestError.message
              ? requestError.message
              : "تعذر تحميل بنك الأسئلة."
          );
        } finally {
          if (requestVersionRef.current === requestVersion) setIsLoading(false);
        }
      };

      void loadQuestionBank();
    }, 180);
    return () => {
      window.clearTimeout(timer);
      if (requestVersionRef.current === requestVersion) {
        requestVersionRef.current += 1;
      }
    };
  }, [bankId, mode, page, query, reloadVersion, sort]);

  const pageCount = getQuestionBankPageCount(result.total, result.pageSize);
  const showEmptyState = shouldShowQuestionBankEmptyState({
    error,
    isLoading,
    questionCount: result.questions.length
  });

  useEffect(() => {
    if (isLoading || error || page >= pageCount) return;

    void adminService.getQuestionBank({
      bankId: bankId || undefined,
      mode,
      page: page + 1,
      pageSize: 50,
      query,
      sort
    }).catch(() => undefined);
  }, [bankId, error, isLoading, mode, page, pageCount, query, sort]);

  useEffect(() => {
    if (
      isLoading ||
      error ||
      page !== 1 ||
      query.trim() ||
      bankId ||
      shouldAvoidSpeculativePreloading()
    ) {
      return;
    }

    void adminService.getQuestionBank({
      mode: mode === "general" ? "aqsam" : "general",
      page: 1,
      pageSize: 50,
      sort
    }).catch(() => undefined);
  }, [bankId, error, isLoading, mode, page, query, sort]);

  return (
    <AdminShell
      currentPath="/admin/questions"
      description="بحث سريع برقم السؤال مع تحميل صفحة واحدة فقط في كل مرة."
      title="بنك الأسئلة"
    >
      <div className="admin-bank-mode-switch" role="group" aria-label="نوع بنك الأسئلة">
        <button
          aria-pressed={mode === "general"}
          className={mode === "general" ? "selected" : "secondary"}
          type="button"
          onClick={() => {
            setMode("general");
            setBankId("");
            setPage(1);
          }}
        >
          الأسئلة العامة
        </button>
        <button
          aria-pressed={mode === "aqsam"}
          className={mode === "aqsam" ? "selected" : "secondary"}
          type="button"
          onClick={() => {
            setMode("aqsam");
            setBankId("");
            setPage(1);
          }}
        >
          أسئلة الأقسام
        </button>
      </div>

      {mode === "aqsam" ? (
        <section className="admin-panel admin-aqsam-banks" aria-label="بنوك الأقسام">
          <header className="admin-panel-heading">
            <div>
              <h2>بنوك الأقسام</h2>
              <p>كل بنك يحتفظ بهويته وأسئلته وعدده الفعلي.</p>
            </div>
          </header>
          {result.banks.length > 0 ? (
            <div className="admin-aqsam-bank-grid">
              {result.banks.map((bank) => (
                <button
                  aria-pressed={bankId === bank.id}
                  className={bankId === bank.id ? "selected" : "secondary"}
                  key={bank.id}
                  type="button"
                  onClick={() => {
                    setBankId((current) => current === bank.id ? "" : bank.id);
                    setPage(1);
                  }}
                >
                  <strong>{bank.name}</strong>
                  <span dir="ltr">{bank.key}</span>
                  <b>{bank.questionCount.toLocaleString("ar-SA")} سؤال</b>
                </button>
              ))}
            </div>
          ) : (
            <p className="admin-empty">لا توجد بنوك أقسام مرفوعة بعد.</p>
          )}
        </section>
      ) : null}

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
            البحث برقم السؤال {mode === "aqsam" ? "داخل بنوك الأقسام" : "العام"}
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
          <span>{error ? "العدد غير متاح" : `${result.total.toLocaleString("ar-SA")} سؤال`}</span>
        </div>

        {error ? (
          <p className="admin-alert error" role="alert">
            {error}{" "}
            <button
              className="secondary"
              type="button"
              onClick={() => setReloadVersion((current) => current + 1)}
            >
              إعادة المحاولة
            </button>
          </p>
        ) : null}
        {isLoading ? <p className="admin-empty">جاري تحميل الأسئلة...</p> : null}
        {showEmptyState ? <p className="admin-empty">لا توجد أسئلة مطابقة.</p> : null}

        {!error && result.questions.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>رقم السؤال</th>{mode === "aqsam" ? <th>البنك</th> : null}<th>الصورة</th><th>التصنيف</th><th>الإجابة</th><th>الرفع</th></tr></thead>
              <tbody>
                {result.questions.map((question) => (
                  <tr key={question.id}>
                    <td>
                      <strong>{question.questionNumber.toLocaleString("ar-SA")}</strong>
                      <small dir="ltr">{question.id}</small>
                    </td>
                    {mode === "aqsam" ? <td><strong>{question.bankName ?? "غير محدد"}</strong></td> : null}
                    <td>{question.imageExists ? <img alt={`السؤال ${question.questionNumber}`} loading="lazy" src={`${env.apiUrl}${question.questionImageUrl}`} /> : <span className="admin-missing">مفقودة</span>}</td>
                    <td>
                      <dl className="admin-question-classification">
                        <div><dt>القسم</dt><dd>{sectionLabel(question.subject)}</dd></div>
                        <div><dt>الموضوع</dt><dd>{question.topic}</dd></div>
                        <div><dt>الموضوع الفرعي</dt><dd>{question.subtopic ?? "غير محدد"}</dd></div>
                      </dl>
                    </td>
                    <td>{answerLabel(question.correctAnswer)}</td>
                    <td>{question.importJobId ? <span><b>#{question.importJobId.slice(0, 8)}</b><small>{question.importedAt ? formatAdminDate(question.importedAt) : ""}</small></span> : "قديم / يدوي"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!error ? <div className="admin-pagination">
          <button className="secondary" disabled={page <= 1} type="button" onClick={() => setPage((current) => current - 1)}>السابق</button>
          <span>صفحة {page.toLocaleString("ar-SA")} من {pageCount.toLocaleString("ar-SA")}</span>
          <button className="secondary" disabled={page >= pageCount} type="button" onClick={() => setPage((current) => current + 1)}>التالي</button>
        </div> : null}
      </section>
    </AdminShell>
  );
}
