import { useEffect, useMemo, useRef, useState } from "react";
import { SystemIcon } from "../../components/ui/SystemIcon";
import { env } from "../../config/env";
import { adminService } from "../../services/adminService";
import { shouldAvoidSpeculativePreloading } from "../../utils/networkPreferences";
import type {
  AdminQuestion,
  AdminQuestionBankResponse,
  AdminQuestionDetail
} from "../../types/admin";
import { answerLabel, formatAdminDate } from "./adminUtils";
import { AdminShell } from "./AdminShell";
import {
  getQuestionBankPageCount,
  shouldShowQuestionBankEmptyState
} from "./adminQuestionBankState";

type QuestionMode = "general" | "aqsam";
type QuestionSource = "excel" | "manual" | "pdf";
type QuestionSubject = "quantitative" | "verbal";

const pageSize = 50;
const emptyResult: AdminQuestionBankResponse = {
  banks: [],
  mode: "general",
  page: 1,
  pageSize,
  questionCounts: { subjects: [] },
  questions: [],
  summary: { quantitative: 0, total: 0, verbal: 0 },
  total: 0
};

const sectionLabel = (subject: string) =>
  subject === "quantitative" ? "الكمي" : "اللفظي";

const sourceLabel = (source: QuestionSource) => ({
  excel: "Excel",
  manual: "رفع صور",
  pdf: "PDF"
})[source];

const optionLabels = ["أ", "ب", "ج", "د"];

export function AdminQuestionBankPage() {
  const initialRequest = {
    mode: "general" as const,
    page: 1,
    pageSize,
    sort: "asc" as const
  };
  const initialCache = adminService.getCachedQuestionBank(initialRequest);
  const [mode, setMode] = useState<QuestionMode>("general");
  const [bankId, setBankId] = useState("");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<QuestionSubject | "">("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [source, setSource] = useState<QuestionSource | "">("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [result, setResult] = useState(initialCache?.data ?? emptyResult);
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminQuestionDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<AdminQuestion | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const request = useMemo(() => ({
    bankId: bankId || undefined,
    difficulty: difficulty ? Number(difficulty) : undefined,
    mode,
    page,
    pageSize,
    query,
    sort,
    source: source || undefined,
    subject: subject || undefined,
    subtopic: subtopic || undefined,
    topic: topic || undefined
  }), [bankId, difficulty, mode, page, query, sort, source, subject, subtopic, topic]);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    const cached = adminService.getCachedQuestionBank(request);
    setResult(cached?.data ?? { ...emptyResult, mode, page });
    setIsLoading(!cached);
    setError("");

    const timer = window.setTimeout(() => {
      void adminService.getQuestionBank(request)
        .then((response) => {
          if (requestVersionRef.current === requestVersion) setResult(response);
        })
        .catch((requestError) => {
          if (requestVersionRef.current !== requestVersion) return;
          setError(
            requestError instanceof Error && requestError.message
              ? requestError.message
              : "تعذر تحميل بنك الأسئلة."
          );
        })
        .finally(() => {
          if (requestVersionRef.current === requestVersion) setIsLoading(false);
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      if (requestVersionRef.current === requestVersion) requestVersionRef.current += 1;
    };
  }, [request, reloadVersion]);

  const pageCount = getQuestionBankPageCount(result.total, result.pageSize);
  const showEmptyState = shouldShowQuestionBankEmptyState({
    error,
    isLoading,
    questionCount: result.questions.length
  });

  useEffect(() => {
    if (isLoading || error || page >= pageCount) return;
    void adminService.getQuestionBank({ ...request, page: page + 1 }).catch(() => undefined);
  }, [error, isLoading, page, pageCount, request]);

  useEffect(() => {
    const hasFilters = Boolean(
      query.trim() || bankId || subject || topic || subtopic || difficulty || source
    );
    if (
      isLoading || error || page !== 1 || hasFilters || shouldAvoidSpeculativePreloading()
    ) return;

    void adminService.getQuestionBank({
      mode: mode === "general" ? "aqsam" : "general",
      page: 1,
      pageSize,
      sort
    }).catch(() => undefined);
  }, [bankId, difficulty, error, isLoading, mode, page, query, sort, source, subject, subtopic, topic]);

  useEffect(() => {
    if (!selectedQuestionId) {
      setDetail(null);
      setDetailError("");
      return;
    }

    let active = true;
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    void adminService.getQuestionDetail(selectedQuestionId)
      .then((response) => {
        if (active) setDetail(response.question);
      })
      .catch((requestError) => {
        if (!active) return;
        setDetailError(
          requestError instanceof Error && requestError.message
            ? requestError.message
            : "تعذر تحميل تفاصيل السؤال."
        );
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedQuestionId]);

  useEffect(() => {
    if (!selectedQuestionId && !archiveTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (archiveTarget) setArchiveTarget(null);
      else setSelectedQuestionId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [archiveTarget, selectedQuestionId]);

  const availableSubjects = result.questionCounts.subjects;
  const availableTopics = useMemo(() => {
    const relevantSubjects = availableSubjects.filter((item) =>
      !subject || item.subjectId === (subject === "quantitative" ? "math" : "arabic")
    );
    return [...new Set(relevantSubjects.flatMap((item) => item.topics.map((entry) => entry.topicLabel)))];
  }, [availableSubjects, subject]);
  const availableSubtopics = useMemo(() => [
    ...new Set(
      availableSubjects.flatMap((item) => item.topics)
        .filter((item) => !topic || item.topicLabel === topic)
        .flatMap((item) => item.subtopics.map((entry) => entry.subtopicLabel))
    )
  ], [availableSubjects, topic]);

  const activeFilterCount = [subject, topic, subtopic, difficulty, source, bankId]
    .filter(Boolean).length;

  const clearFilters = () => {
    setQuery("");
    setSubject("");
    setTopic("");
    setSubtopic("");
    setDifficulty("");
    setSource("");
    setBankId("");
    setPage(1);
  };

  const changeMode = (nextMode: QuestionMode) => {
    setMode(nextMode);
    setBankId("");
    setPage(1);
  };

  const archiveQuestion = async () => {
    if (!archiveTarget || archivingId) return;
    const target = archiveTarget;
    setArchivingId(target.id);
    setFeedback(null);
    try {
      await adminService.archiveQuestion(target.id);
      setResult((current) => ({
        ...current,
        questions: current.questions.filter((question) => question.id !== target.id),
        total: Math.max(0, current.total - 1)
      }));
      setArchiveTarget(null);
      setSelectedQuestionId((current) => current === target.id ? null : current);
      setFeedback({
        message: `تمت إزالة السؤال ${target.questionNumber.toLocaleString("ar-SA")} من البنك النشط.`,
        tone: "success"
      });
      if (result.questions.length === 1 && page > 1) setPage((current) => current - 1);
      else setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setArchiveTarget(null);
      setFeedback({
        message: requestError instanceof Error && requestError.message
          ? requestError.message
          : "تعذر إزالة السؤال. حاول مرة أخرى.",
        tone: "error"
      });
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <AdminShell
      currentPath="/admin/questions"
      description="راجع الأسئلة النشطة وصنّفها وأدرها من مكان واحد."
      title="بنك الأسئلة"
    >
      <section className="admin-question-summary" aria-label="ملخص بنك الأسئلة">
        <article>
          <span>إجمالي الأسئلة النشطة</span>
          <strong>{result.summary.total.toLocaleString("ar-SA")}</strong>
        </article>
        <article data-subject="quantitative">
          <span>الأسئلة الكمية</span>
          <strong>{result.summary.quantitative.toLocaleString("ar-SA")}</strong>
        </article>
        <article data-subject="verbal">
          <span>الأسئلة اللفظية</span>
          <strong>{result.summary.verbal.toLocaleString("ar-SA")}</strong>
        </article>
      </section>

      <div className="admin-bank-mode-switch" role="group" aria-label="نوع بنك الأسئلة">
        <button
          aria-pressed={mode === "general"}
          className={mode === "general" ? "selected" : "secondary"}
          type="button"
          onClick={() => changeMode("general")}
        >
          الأسئلة العامة
        </button>
        <button
          aria-pressed={mode === "aqsam"}
          className={mode === "aqsam" ? "selected" : "secondary"}
          type="button"
          onClick={() => changeMode("aqsam")}
        >
          أسئلة الأقسام
        </button>
      </div>

      {mode === "aqsam" ? (
        <section className="admin-panel admin-aqsam-banks" aria-label="بنوك الأقسام">
          <header className="admin-panel-heading">
            <div>
              <h2>بنوك الأقسام</h2>
              <p>اختر بنكاً لعرض أسئلته فقط، أو اترك الاختيار فارغاً لعرض الجميع.</p>
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
          ) : <p className="admin-empty">لا توجد بنوك أقسام مرفوعة بعد.</p>}
        </section>
      ) : null}

      <section className="admin-panel admin-question-bank-panel">
        <header className="admin-question-bank-heading">
          <div>
            <span className="admin-question-bank-eyebrow">
              <SystemIcon name="filter" /> البحث والتصفية
            </span>
            <h2>الأسئلة النشطة</h2>
          </div>
          <span className="admin-question-result-count">
            {error ? "العدد غير متاح" : `${result.total.toLocaleString("ar-SA")} سؤال مطابق`}
          </span>
        </header>

        <div className="admin-question-filters">
          <label className="admin-question-search">
            <span>ابحث في الأسئلة</span>
            <span className="admin-question-search-control">
              <SystemIcon name="search" />
              <input
                placeholder="رقم السؤال، النص، الموضوع..."
                type="search"
                value={query}
                onChange={(event) => {
                  setPage(1);
                  setQuery(event.target.value);
                }}
              />
            </span>
          </label>
          <label>
            <span>القسم</span>
            <select value={subject} onChange={(event) => {
              setSubject(event.target.value as QuestionSubject | "");
              setTopic("");
              setSubtopic("");
              setPage(1);
            }}>
              <option value="">الكل</option>
              <option value="quantitative">الكمي</option>
              <option value="verbal">اللفظي</option>
            </select>
          </label>
          <label>
            <span>الموضوع</span>
            <select value={topic} onChange={(event) => {
              setTopic(event.target.value);
              setSubtopic("");
              setPage(1);
            }}>
              <option value="">كل الموضوعات</option>
              {availableTopics.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>الموضوع الفرعي</span>
            <select value={subtopic} onChange={(event) => {
              setSubtopic(event.target.value);
              setPage(1);
            }}>
              <option value="">كل الموضوعات الفرعية</option>
              {availableSubtopics.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>الصعوبة</span>
            <select value={difficulty} onChange={(event) => {
              setDifficulty(event.target.value);
              setPage(1);
            }}>
              <option value="">كل المستويات</option>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((item) => (
                <option key={item} value={item}>المستوى {item.toLocaleString("ar-SA")}</option>
              ))}
            </select>
          </label>
          <label>
            <span>المصدر</span>
            <select value={source} onChange={(event) => {
              setSource(event.target.value as QuestionSource | "");
              setPage(1);
            }}>
              <option value="">كل المصادر</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
              <option value="manual">رفع صور</option>
            </select>
          </label>
          <label>
            <span>الترتيب</span>
            <select value={sort} onChange={(event) => {
              setSort(event.target.value as "asc" | "desc");
              setPage(1);
            }}>
              <option value="asc">رقم السؤال تصاعدياً</option>
              <option value="desc">رقم السؤال تنازلياً</option>
            </select>
          </label>
          <button
            className="secondary admin-question-clear-filters"
            disabled={activeFilterCount === 0 && !query}
            type="button"
            onClick={clearFilters}
          >
            <SystemIcon name="x" />
            مسح الفلاتر {activeFilterCount > 0 ? `(${activeFilterCount.toLocaleString("ar-SA")})` : ""}
          </button>
        </div>

        {feedback ? (
          <p
            className={`admin-alert${feedback.tone === "error" ? " error" : ""}`}
            role={feedback.tone === "error" ? "alert" : "status"}
          >
            {feedback.message}
          </p>
        ) : null}
        {error ? (
          <p className="admin-alert error" role="alert">
            {error}
            <button className="secondary" type="button" onClick={() => setReloadVersion((current) => current + 1)}>
              إعادة المحاولة
            </button>
          </p>
        ) : null}
        {isLoading && result.questions.length === 0 ? (
          <p className="admin-empty">جاري تحميل الأسئلة...</p>
        ) : null}
        {showEmptyState ? (
          <div className="admin-question-empty">
            <SystemIcon name="question" />
            <strong>لا توجد أسئلة مطابقة</strong>
            <span>جرّب تغيير عبارة البحث أو مسح الفلاتر النشطة.</span>
          </div>
        ) : null}

        {!error && result.questions.length > 0 ? (
          <div className="admin-table-wrap admin-question-table-wrap" aria-busy={isLoading}>
            <table className="admin-table admin-question-table">
              <thead>
                <tr>
                  <th>السؤال</th>
                  <th>التصنيف</th>
                  <th>الصعوبة</th>
                  <th>المصدر</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {result.questions.map((question) => (
                  <tr key={question.id}>
                    <td data-label="السؤال">
                      <button
                        className="admin-question-identity"
                        type="button"
                        onClick={() => setSelectedQuestionId(question.id)}
                      >
                        <span className="admin-question-thumbnail">
                          {question.imageExists ? (
                            <img alt="" loading="lazy" src={`${env.apiUrl}${question.questionImageUrl}`} />
                          ) : <SystemIcon name="question" />}
                        </span>
                        <span>
                          <strong>سؤال {question.questionNumber.toLocaleString("ar-SA")}</strong>
                          <small dir="ltr">{question.id}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="التصنيف">
                      <span className={`admin-question-subject admin-question-subject-${question.subject}`}>
                        {sectionLabel(question.subject)}
                      </span>
                      <strong>{question.topic}</strong>
                      <small>{question.subtopic ?? "دون موضوع فرعي"}</small>
                    </td>
                    <td data-label="الصعوبة">
                      <span className="admin-question-difficulty" aria-label={`الصعوبة ${question.difficulty} من 10`}>
                        <b>{question.difficulty.toLocaleString("ar-SA")}</b>
                        <span><i style={{ width: `${Math.min(100, question.difficulty * 10)}%` }} /></span>
                      </span>
                    </td>
                    <td data-label="المصدر">
                      <strong>{sourceLabel(question.source)}</strong>
                      <small>{question.bankName ?? (question.questionScope === "general" ? "الأسئلة العامة" : "بنك أقسام")}</small>
                    </td>
                    <td data-label="الحالة">
                      <span className="admin-question-active-status">نشط</span>
                    </td>
                    <td data-label="الإجراءات">
                      <details className="admin-question-actions">
                        <summary><SystemIcon name="more" /><span>الإجراءات</span></summary>
                        <div>
                          <button className="secondary" type="button" onClick={() => setSelectedQuestionId(question.id)}>
                            <SystemIcon name="eye" /> عرض التفاصيل
                          </button>
                          <button className="admin-question-archive-action" type="button" onClick={() => setArchiveTarget(question)}>
                            <SystemIcon name="trash" /> إزالة من البنك
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!error && result.total > 0 ? (
          <div className="admin-pagination">
            <button className="secondary" disabled={page <= 1 || isLoading} type="button" onClick={() => setPage((current) => current - 1)}>السابق</button>
            <span>صفحة {page.toLocaleString("ar-SA")} من {pageCount.toLocaleString("ar-SA")}</span>
            <button className="secondary" disabled={page >= pageCount || isLoading} type="button" onClick={() => setPage((current) => current + 1)}>التالي</button>
          </div>
        ) : null}
      </section>

      {selectedQuestionId ? (
        <div className="admin-question-detail-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedQuestionId(null);
        }}>
          <aside aria-labelledby="admin-question-detail-title" aria-modal="true" className="admin-question-detail" role="dialog">
            <header>
              <div>
                <span>تفاصيل السؤال</span>
                <h2 id="admin-question-detail-title">
                  {detail ? `سؤال ${detail.questionNumber.toLocaleString("ar-SA")}` : "جاري التحميل"}
                </h2>
              </div>
              <button aria-label="إغلاق التفاصيل" className="secondary admin-question-icon-button" type="button" onClick={() => setSelectedQuestionId(null)}>
                <SystemIcon name="x" />
              </button>
            </header>
            {detailLoading ? <p className="admin-empty">جاري تحميل تفاصيل السؤال...</p> : null}
            {detailError ? <p className="admin-alert error" role="alert">{detailError}</p> : null}
            {detail ? (
              <div className="admin-question-detail-content">
                <div className="admin-question-detail-image">
                  {detail.imageExists ? (
                    <img alt={`السؤال ${detail.questionNumber}`} src={`${env.apiUrl}${detail.questionImageUrl}`} />
                  ) : <span><SystemIcon name="question" /> لا توجد صورة محفوظة</span>}
                </div>
                <section>
                  <h3>نص السؤال</h3>
                  <p>{detail.questionText || "لا يتوفر نص مستخرج لهذا السؤال القديم."}</p>
                </section>
                {detail.options.length > 0 ? (
                  <section>
                    <h3>خيارات الإجابة</h3>
                    <ol className="admin-question-options">
                      {detail.options.map((option, index) => {
                        const isCorrect = index === "ABCD".indexOf(detail.correctAnswer);
                        return (
                          <li data-correct={isCorrect} key={`${index}-${option}`}>
                            <b>{optionLabels[index] ?? index + 1}</b>
                            <span>{option || "حقل فارغ"}</span>
                            {isCorrect ? <small>الإجابة الصحيحة</small> : null}
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ) : null}
                <dl className="admin-question-detail-grid">
                  <div><dt>القسم</dt><dd>{sectionLabel(detail.subject)}</dd></div>
                  <div><dt>الموضوع</dt><dd>{detail.topic}</dd></div>
                  <div><dt>الموضوع الفرعي</dt><dd>{detail.subtopic ?? "غير معيّن"}</dd></div>
                  <div><dt>الصعوبة</dt><dd>{detail.difficulty.toLocaleString("ar-SA")} / ١٠</dd></div>
                  <div><dt>الإجابة الصحيحة</dt><dd>{answerLabel(detail.correctAnswer)}</dd></div>
                  <div><dt>المصدر</dt><dd>{sourceLabel(detail.source)}</dd></div>
                  <div><dt>البنك</dt><dd>{detail.bankName ?? "الأسئلة العامة"}</dd></div>
                  <div><dt>آخر رفع</dt><dd>{detail.importedAt ? formatAdminDate(detail.importedAt) : "قديم / يدوي"}</dd></div>
                </dl>
                <footer>
                  <span>السؤال نشط ومتاح حالياً ضمن نطاقه الدراسي.</span>
                  <button className="danger" type="button" onClick={() => setArchiveTarget(detail)}>
                    <SystemIcon name="trash" /> إزالة من البنك النشط
                  </button>
                </footer>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {archiveTarget ? (
        <div className="admin-confirmation" role="presentation">
          <div aria-labelledby="archive-question-title" aria-modal="true" role="alertdialog">
            <span className="admin-question-confirm-icon"><SystemIcon name="trash" /></span>
            <div>
              <h2 id="archive-question-title">إزالة السؤال من البنك النشط؟</h2>
              <p>لن يظهر سؤال {archiveTarget.questionNumber.toLocaleString("ar-SA")} بعد ذلك في بنك الأسئلة النشط أو تدريب الطلاب أو الاختبارات الجديدة.</p>
              <p className="admin-question-preservation-note">ستبقى الصورة والسجلات والإجابات التاريخية محفوظة، ويمكن استعادته لاحقاً من قاعدة البيانات.</p>
            </div>
            <div className="admin-confirm-actions">
              <button className="secondary" disabled={Boolean(archivingId)} type="button" onClick={() => setArchiveTarget(null)}>إلغاء</button>
              <button className="danger" disabled={Boolean(archivingId)} type="button" onClick={() => void archiveQuestion()}>
                {archivingId ? "جاري الإزالة..." : "تأكيد الإزالة"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
