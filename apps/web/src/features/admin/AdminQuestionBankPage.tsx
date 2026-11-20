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
type QuestionStatus = "active" | "archived" | "all";
type QuestionSubject = "quantitative" | "verbal";

const pageSize = 50;
const difficultyMax = 4;
const difficultyLevels = Array.from(
  { length: difficultyMax },
  (_, index) => index + 1
);
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
const difficultyLabel = (value: number) =>
  value >= 1 && value <= difficultyMax
    ? `${value.toLocaleString("ar-SA")} / ${difficultyMax.toLocaleString("ar-SA")}`
    : "قيمة قديمة غير متوافقة";

function DifficultyRating({ value }: { value: number }) {
  const normalizedValue = value >= 1 && value <= difficultyMax ? value : 0;

  return (
    <span
      aria-label={`الصعوبة ${difficultyLabel(value)}`}
      className="admin-question-difficulty"
    >
      <span aria-hidden="true" className="admin-question-difficulty-stars">
        {difficultyLevels.map((level) => (
          <i data-filled={level <= normalizedValue} key={level}>★</i>
        ))}
      </span>
    </span>
  );
}

export function AdminQuestionBankPage() {
  const initialRequest = {
    mode: "general" as const,
    page: 1,
    pageSize,
    sort: "asc" as const,
    status: "active" as const
  };
  const initialCache = adminService.getCachedQuestionBank(initialRequest);
  const [mode, setMode] = useState<QuestionMode>("general");
  const [bankId, setBankId] = useState("");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<QuestionSubject | "">("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null);
  const [source, setSource] = useState<QuestionSource | "">("");
  const [status, setStatus] = useState<QuestionStatus>("active");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [result, setResult] = useState(initialCache?.data ?? emptyResult);
  const [filterCatalogs, setFilterCatalogs] = useState<
    Record<string, AdminQuestionBankResponse["questionCounts"]["subjects"]>
  >(() => {
    const catalogs: Record<
      string,
      AdminQuestionBankResponse["questionCounts"]["subjects"]
    > = {};
    if (initialCache) catalogs["general:all:active"] = initialCache.data.questionCounts.subjects;
    return catalogs;
  });
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
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const requestVersionRef = useRef(0);

  const request = useMemo(() => ({
    bankId: bankId || undefined,
    difficulty: difficultyFilter ?? undefined,
    mode,
    page,
    pageSize,
    query,
    sort,
    source: source || undefined,
    status,
    subject: subject || undefined,
    subtopic: subtopic || undefined,
    topic: topic || undefined
  }), [bankId, difficultyFilter, mode, page, query, sort, source, status, subject, subtopic, topic]);
  const filterScopeKey = `${mode}:${bankId || "all"}:${status}`;
  const selectionScopeKey = JSON.stringify(request);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    const cached = adminService.getCachedQuestionBank(request);
    setResult(cached?.data ?? { ...emptyResult, mode, page });
    setIsLoading(!cached);
    setError("");

    const timer = window.setTimeout(() => {
      void adminService.getQuestionBank(request)
        .then((response) => {
          if (requestVersionRef.current !== requestVersion) return;
          setResult(response);
          setFilterCatalogs((current) => ({
            ...current,
            [filterScopeKey]: response.questionCounts.subjects
          }));
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
  }, [filterScopeKey, request, reloadVersion]);

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
      query.trim() || bankId || subject || topic || subtopic || difficultyFilter || source || status !== "active"
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
  }, [bankId, difficultyFilter, error, isLoading, mode, page, query, sort, source, status, subject, subtopic, topic]);

  useEffect(() => {
    setSelectedQuestionIds(new Set());
  }, [selectionScopeKey]);

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
    if (!selectedQuestionId && !archiveTarget && !bulkArchiveIds) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (bulkArchiveIds) setBulkArchiveIds(null);
      else if (archiveTarget) setArchiveTarget(null);
      else setSelectedQuestionId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [archiveTarget, bulkArchiveIds, selectedQuestionId]);

  const availableSubjects = filterCatalogs[filterScopeKey] ?? [];
  const availableTopics = useMemo(() => {
    const relevantSubjects = availableSubjects.filter((item) =>
      !subject || item.subjectId === (subject === "quantitative" ? "math" : "arabic")
    );
    return [...new Set(relevantSubjects.flatMap((item) => item.topics.map((entry) => entry.topicLabel)))];
  }, [availableSubjects, subject]);
  const availableSubtopics = useMemo(() => [
    ...new Set(
      availableSubjects
        .filter((item) =>
          !subject || item.subjectId === (subject === "quantitative" ? "math" : "arabic")
        )
        .flatMap((item) => item.topics)
        .filter((item) => !topic || item.topicLabel === topic)
        .flatMap((item) => item.subtopics.map((entry) => entry.subtopicLabel))
    )
  ], [availableSubjects, subject, topic]);

  const activeFilterCount = [
    subject,
    topic,
    subtopic,
    difficultyFilter,
    source,
    bankId,
    status === "active" ? "" : status
  ]
    .filter(Boolean).length;

  const activeFilterChips = [
    query.trim() ? {
      key: "query",
      label: `البحث: ${query.trim()}`,
      onClear: () => setQuery("")
    } : null,
    subject ? {
      key: "subject",
      label: `القسم: ${sectionLabel(subject)}`,
      onClear: () => {
        setSubject("");
        setTopic("");
        setSubtopic("");
      }
    } : null,
    topic ? {
      key: "topic",
      label: `الموضوع: ${topic}`,
      onClear: () => {
        setTopic("");
        setSubtopic("");
      }
    } : null,
    subtopic ? {
      key: "subtopic",
      label: `الموضوع الفرعي: ${subtopic}`,
      onClear: () => setSubtopic("")
    } : null,
    difficultyFilter ? {
      key: "difficulty",
      label: `الصعوبة: ${"★".repeat(difficultyFilter)}`,
      onClear: () => setDifficultyFilter(null)
    } : null,
    source ? {
      key: "source",
      label: `المصدر: ${sourceLabel(source)}`,
      onClear: () => setSource("")
    } : null,
    status !== "active" ? {
      key: "status",
      label: `الحالة: ${status === "archived" ? "مؤرشف" : "الكل"}`,
      onClear: () => setStatus("active")
    } : null,
    bankId ? {
      key: "bank",
      label: `البنك: ${result.banks.find((bank) => bank.id === bankId)?.name ?? bankId}`,
      onClear: () => setBankId("")
    } : null
  ].filter((chip): chip is { key: string; label: string; onClear: () => void } => Boolean(chip));

  const clearFilters = () => {
    setQuery("");
    setSubject("");
    setTopic("");
    setSubtopic("");
    setDifficultyFilter(null);
    setSource("");
    setStatus("active");
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
      const archived = await adminService.archiveQuestion(target.id);
      setResult((current) => ({
        ...current,
        questions: status === "all"
          ? current.questions.map((question) => question.id === target.id
            ? { ...question, archivedAt: archived.archivedAt, status: "archived" }
            : question)
          : current.questions.filter((question) => question.id !== target.id),
        total: status === "all" ? current.total : Math.max(0, current.total - 1)
      }));
      setArchiveTarget(null);
      setSelectedQuestionId((current) => current === target.id ? null : current);
      setFeedback({
        message: `تمت إزالة السؤال ${target.questionNumber.toLocaleString("ar-SA")} من البنك النشط.`,
        tone: "success"
      });
      if (status !== "all" && result.questions.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadVersion((current) => current + 1);
      }
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

  const selectableQuestionIds = result.questions
    .filter((question) => question.status === "active")
    .map((question) => question.id);
  const selectedCount = selectedQuestionIds.size;
  const allVisibleSelected = selectableQuestionIds.length > 0 &&
    selectableQuestionIds.every((id) => selectedQuestionIds.has(id));

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selectedCount > 0 && !allVisibleSelected;
  }, [allVisibleSelected, selectedCount]);

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const toggleAllVisibleQuestions = () => {
    setSelectedQuestionIds(
      allVisibleSelected ? new Set() : new Set(selectableQuestionIds)
    );
  };

  const archiveSelectedQuestions = async () => {
    if (!bulkArchiveIds?.length || isBulkArchiving) return;
    const selectedIds = [...bulkArchiveIds];
    setIsBulkArchiving(true);
    setFeedback(null);
    try {
      const archived = await adminService.archiveQuestions(selectedIds);
      const archivedById = new Map(
        archived.questions.map((question) => [question.questionId, question.archivedAt])
      );
      setResult((current) => ({
        ...current,
        questions: status === "all"
          ? current.questions.map((question) => archivedById.has(question.id)
            ? {
              ...question,
              archivedAt: archivedById.get(question.id) ?? question.archivedAt,
              status: "archived" as const
            }
            : question)
          : current.questions.filter((question) => !archivedById.has(question.id)),
        total: status === "all"
          ? current.total
          : Math.max(0, current.total - archivedById.size)
      }));
      setBulkArchiveIds(null);
      setSelectedQuestionIds(new Set());
      setFeedback({
        message: `تمت أرشفة ${archivedById.size.toLocaleString("ar-SA")} سؤال محدد مع الحفاظ على سجلاتها التاريخية.`,
        tone: "success"
      });
      if (status !== "all" && result.questions.length === archivedById.size && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadVersion((current) => current + 1);
      }
    } catch (requestError) {
      setBulkArchiveIds(null);
      setFeedback({
        message: requestError instanceof Error && requestError.message
          ? requestError.message
          : "تعذر أرشفة الأسئلة المحددة. حاول مرة أخرى.",
        tone: "error"
      });
    } finally {
      setIsBulkArchiving(false);
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
          <span>{status === "active" ? "إجمالي الأسئلة النشطة" : status === "archived" ? "إجمالي الأسئلة المؤرشفة" : "إجمالي الأسئلة"}</span>
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
            <h2>{status === "active" ? "الأسئلة النشطة" : status === "archived" ? "الأسئلة المؤرشفة" : "كل الأسئلة"}</h2>
          </div>
          <span aria-live="polite" className="admin-question-result-count">
            {error ? "العدد غير متاح" : `${result.total.toLocaleString("ar-SA")} سؤال مطابق`}
          </span>
        </header>

        <div className="admin-question-filters">
          <label className="admin-question-search" data-active={Boolean(query.trim())}>
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
          <label data-active={Boolean(subject)}>
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
          <label data-active={Boolean(topic)}>
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
          <label data-active={Boolean(subtopic)}>
            <span>الموضوع الفرعي</span>
            <select value={subtopic} onChange={(event) => {
              setSubtopic(event.target.value);
              setPage(1);
            }}>
              <option value="">كل الموضوعات الفرعية</option>
              {availableSubtopics.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <fieldset className="admin-question-difficulty-filter" data-active={Boolean(difficultyFilter)}>
            <legend>الصعوبة</legend>
            <div role="group" aria-label="تصفية حسب الصعوبة الدقيقة">
              {difficultyLevels.map((level) => (
                <button
                  aria-label={`الصعوبة ${level.toLocaleString("ar-SA")} من ${difficultyMax.toLocaleString("ar-SA")}`}
                  aria-pressed={difficultyFilter === level}
                  className={difficultyFilter === level ? "selected" : undefined}
                  key={level}
                  type="button"
                  onClick={() => {
                    setDifficultyFilter((current) => current === level ? null : level);
                    setPage(1);
                  }}
                >
                  <span aria-hidden="true">{"★".repeat(level)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label data-active={Boolean(source)}>
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
          <label data-active={status !== "active"}>
            <span>الحالة</span>
            <select value={status} onChange={(event) => {
              setStatus(event.target.value as QuestionStatus);
              setPage(1);
            }}>
              <option value="active">نشط</option>
              <option value="archived">مؤرشف</option>
              <option value="all">الكل</option>
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
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="admin-question-active-filters" aria-label="الفلاتر النشطة">
            <span>الفلاتر النشطة</span>
            {activeFilterChips.map((chip) => (
              <button
                aria-label={`مسح فلتر ${chip.label}`}
                key={chip.key}
                type="button"
                onClick={() => {
                  chip.onClear();
                  setPage(1);
                }}
              >
                {chip.label} <SystemIcon name="x" />
              </button>
            ))}
            <button className="admin-question-clear-filters" type="button" onClick={clearFilters}>
              مسح الكل ({(activeFilterCount + (query.trim() ? 1 : 0)).toLocaleString("ar-SA")})
            </button>
          </div>
        ) : null}

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
          <>
            {selectableQuestionIds.length > 0 ? (
              <div className="admin-question-selection-toolbar" data-has-selection={selectedCount > 0}>
                <label>
                  <input
                    aria-label="تحديد كل الأسئلة النشطة الظاهرة"
                    checked={allVisibleSelected}
                    ref={selectAllRef}
                    type="checkbox"
                    onChange={toggleAllVisibleQuestions}
                  />
                  <span>تحديد الكل</span>
                </label>
                <span aria-live="polite">
                  {selectedCount > 0
                    ? `${selectedCount.toLocaleString("ar-SA")} محدد`
                    : "لم يتم تحديد أسئلة"}
                </span>
                {selectedCount > 0 ? (
                  <>
                    <button className="secondary" type="button" onClick={() => setSelectedQuestionIds(new Set())}>
                      مسح التحديد
                    </button>
                    <button
                      className="danger admin-question-bulk-archive"
                      type="button"
                      onClick={() => setBulkArchiveIds([...selectedQuestionIds])}
                    >
                      <SystemIcon name="trash" /> حذف المحدد ({selectedCount.toLocaleString("ar-SA")})
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
            <div
              aria-busy={isLoading}
              aria-label={status === "active" ? "قائمة الأسئلة النشطة" : status === "archived" ? "قائمة الأسئلة المؤرشفة" : "قائمة كل الأسئلة"}
              className="admin-question-list"
              role="list"
            >
            {result.questions.map((question) => (
              <article
                className="admin-question-row"
                data-selected={selectedQuestionIds.has(question.id)}
                key={question.id}
                role="listitem"
              >
                <input
                  aria-label={question.status === "active"
                    ? `تحديد السؤال ${question.questionNumber.toLocaleString("ar-SA")}`
                    : `السؤال ${question.questionNumber.toLocaleString("ar-SA")} مؤرشف`}
                  checked={selectedQuestionIds.has(question.id)}
                  className="admin-question-select"
                  disabled={question.status !== "active"}
                  type="checkbox"
                  onChange={() => toggleQuestionSelection(question.id)}
                />
                <div className="admin-question-primary">
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
                      <small className="admin-question-source">
                        <span>{sourceLabel(question.source)}</span>
                        <span>{question.bankName ?? (question.questionScope === "general" ? "الأسئلة العامة" : "بنك أقسام")}</span>
                        {question.status === "archived" ? <span className="admin-question-archived-status">مؤرشف</span> : null}
                      </small>
                      <small dir="ltr">{question.id}</small>
                    </span>
                  </button>
                  <details className="admin-question-actions">
                    <summary aria-label={`إجراءات السؤال ${question.questionNumber.toLocaleString("ar-SA")}`} title="إجراءات السؤال">
                      <SystemIcon name="more" />
                    </summary>
                    <div>
                      <button className="secondary" type="button" onClick={() => setSelectedQuestionId(question.id)}>
                        <SystemIcon name="eye" /> عرض التفاصيل
                      </button>
                      {question.status === "active" ? (
                        <button className="admin-question-archive-action" type="button" onClick={() => setArchiveTarget(question)}>
                          <SystemIcon name="trash" /> إزالة من البنك
                        </button>
                      ) : null}
                    </div>
                  </details>
                </div>

                <div className="admin-question-classification-summary">
                  <span className={`admin-question-subject admin-question-subject-${question.subject}`}>
                    {sectionLabel(question.subject)}
                  </span>
                  <strong>{question.topic}</strong>
                  <small>{question.subtopic ?? "دون موضوع فرعي"}</small>
                </div>

                <DifficultyRating value={question.difficulty} />
              </article>
            ))}
            </div>
          </>
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
                  <div><dt>الصعوبة</dt><dd><DifficultyRating value={detail.difficulty} /></dd></div>
                  <div><dt>الإجابة الصحيحة</dt><dd>{answerLabel(detail.correctAnswer)}</dd></div>
                  <div><dt>المصدر</dt><dd>{sourceLabel(detail.source)}</dd></div>
                  <div><dt>البنك</dt><dd>{detail.bankName ?? "الأسئلة العامة"}</dd></div>
                  <div><dt>آخر رفع</dt><dd>{detail.importedAt ? formatAdminDate(detail.importedAt) : "قديم / يدوي"}</dd></div>
                  <div><dt>الحالة</dt><dd>{detail.status === "active" ? "نشط" : "مؤرشف"}</dd></div>
                </dl>
                <footer>
                  <span>{detail.status === "active" ? "السؤال نشط ومتاح حالياً ضمن نطاقه الدراسي." : "السؤال مؤرشف وغير متاح حالياً للتدريب أو الاختبارات الجديدة."}</span>
                  {detail.status === "active" ? (
                    <button className="danger" type="button" onClick={() => setArchiveTarget(detail)}>
                      <SystemIcon name="trash" /> إزالة من البنك النشط
                    </button>
                  ) : null}
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

      {bulkArchiveIds ? (
        <div className="admin-confirmation" role="presentation">
          <div aria-labelledby="bulk-archive-question-title" aria-modal="true" role="alertdialog">
            <span className="admin-question-confirm-icon"><SystemIcon name="trash" /></span>
            <div>
              <h2 id="bulk-archive-question-title">أرشفة الأسئلة المحددة؟</h2>
              <p>سيتم حذف {bulkArchiveIds.length.toLocaleString("ar-SA")} سؤال محدد من البنك النشط.</p>
              <p className="admin-question-preservation-note">ستبقى الصور والسجلات والإجابات التاريخية محفوظة، ولن تتأثر أي أسئلة غير محددة.</p>
            </div>
            <div className="admin-confirm-actions">
              <button className="secondary" disabled={isBulkArchiving} type="button" onClick={() => setBulkArchiveIds(null)}>إلغاء</button>
              <button className="danger" disabled={isBulkArchiving} type="button" onClick={() => void archiveSelectedQuestions()}>
                {isBulkArchiving ? "جاري الأرشفة..." : `تأكيد أرشفة ${bulkArchiveIds.length.toLocaleString("ar-SA")} سؤال`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
