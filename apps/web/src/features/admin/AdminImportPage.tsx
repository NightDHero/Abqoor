import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminService } from "../../services/adminService";
import { HttpError } from "../../services/http";
import type {
  DuplicateAction,
  ImportJobDetail
} from "../../types/admin";
import { answerLabel, importStatusLabels } from "./adminUtils";
import { AdminShell } from "./AdminShell";

const duplicateOptions: Array<{ label: string; value: DuplicateAction }> = [
  { label: "استبدال السؤال والمتابعة", value: "replace" },
  { label: "تخطي السؤال والمتابعة", value: "skip" },
  { label: "إيقاف الرفع", value: "stop" }
];

export function AdminImportPage() {
  const [excel, setExcel] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<"pdf" | "images">("pdf");
  const [startQuestionNumber, setStartQuestionNumber] = useState("1");
  const [detail, setDetail] = useState<ImportJobDetail | null>(null);
  const [decisions, setDecisions] = useState<Record<number, DuplicateAction>>({});
  const [applyToAll, setApplyToAll] = useState(true);
  const [defaultAction, setDefaultAction] = useState<DuplicateAction>("skip");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (detail?.job.status !== "importing") {
      return;
    }

    const timer = window.setInterval(() => {
      void adminService
        .getImportJob(detail.job.id)
        .then((nextDetail) => {
          setDetail(nextDetail);
          if (nextDetail.job.status === "completed") {
            setMessage("اكتملت عملية الرفع وسُجلت في السجل.");
          } else if (nextDetail.job.status === "failed") {
            setError(nextDetail.job.errorMessage ?? "فشلت عملية الرفع.");
          }
        })
        .catch(() => setError("تعذر تحديث تقدم الرفع."));
    }, 700);

    return () => window.clearInterval(timer);
  }, [detail?.job.id, detail?.job.status]);

  const duplicates = detail?.items.filter((item) => item.isDuplicate) ?? [];
  const plannedReplacementCount = useMemo(() => {
    if (applyToAll) {
      return defaultAction === "replace" ? duplicates.length : 0;
    }
    return duplicates.filter((item) => decisions[item.questionNumber] === "replace").length;
  }, [applyToAll, decisions, defaultAction, duplicates]);

  const resetResult = () => {
    setDetail(null);
    setDecisions({});
    setShowConfirmation(false);
    setMessage("");
    setError("");
  };

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetResult();
    if (!excel) {
      setError("اختر ملف Excel أولاً.");
      return;
    }
    if (mediaType === "pdf" && !pdf) {
      setError("اختر ملف PDF.");
      return;
    }
    if (mediaType === "images" && images.length === 0) {
      setError("اختر صور الأسئلة بصيغة PNG.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminService.analyzeImport({
        excel,
        pdf: mediaType === "pdf" ? pdf ?? undefined : undefined,
        images: mediaType === "images" ? images : undefined,
        startQuestionNumber:
          mediaType === "pdf" ? startQuestionNumber : undefined
      });
      setDetail(response);
      setMessage(
        response.job.errorCount === 0
          ? "اكتمل التحليل. راجع المعاينة قبل التأكيد."
          : "اكتمل التحليل مع أخطاء يجب معالجتها قبل الرفع."
      );
    } catch (caught) {
      setError(caught instanceof HttpError ? caught.message : "تعذر تحليل ملفات الرفع.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!detail) return;
    setError("");
    setIsSubmitting(true);
    try {
      const response = await adminService.confirmImport(detail.job.id, {
        applyToAllDuplicates: applyToAll,
        defaultDuplicateAction: applyToAll ? defaultAction : undefined,
        duplicateDecisions: applyToAll
          ? []
          : duplicates
              .filter((item) => decisions[item.questionNumber])
              .map((item) => ({
                action: decisions[item.questionNumber],
                questionNumber: item.questionNumber
              }))
      });
      setDetail(response);
      setShowConfirmation(false);
      setMessage("بدأ حفظ الأسئلة. يمكنك متابعة التقدم أدناه.");
    } catch (caught) {
      setError(caught instanceof HttpError ? caught.message : "تعذر تأكيد الرفع.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    setIsSubmitting(true);
    try {
      setDetail(await adminService.cancelImport(detail.job.id));
      setMessage("تم إلغاء العملية وتنظيف الملفات المؤقتة.");
    } catch (caught) {
      setError(caught instanceof HttpError ? caught.message : "تعذر إلغاء الرفع.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const job = detail?.job;
  const progress = job?.totalQuestions
    ? Math.round((job.processedCount / job.totalQuestions) * 100)
    : 0;

  return (
    <AdminShell
      currentPath="/admin/import"
      description="لا يتغير بنك الأسئلة حتى تراجع المعاينة وتؤكدها صراحة."
      title="رفع الأسئلة"
    >
      <form className="admin-panel admin-import-form" onSubmit={handleAnalyze}>
        <header className="admin-panel-heading">
          <div>
            <h2>١. اختيار ملفات الدفعة</h2>
            <p>Excel هو مصدر البيانات، وPDF أو الصور هي مصدر محتوى السؤال.</p>
          </div>
        </header>

        <div className="admin-form-grid">
          <label>
            ملف Excel
            <input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              type="file"
              onChange={(event) => setExcel(event.target.files?.[0] ?? null)}
            />
          </label>
          <fieldset>
            <legend>مصدر الصور</legend>
            <label><input checked={mediaType === "pdf"} name="media" type="radio" onChange={() => setMediaType("pdf")} /> PDF</label>
            <label><input checked={mediaType === "images"} name="media" type="radio" onChange={() => setMediaType("images")} /> صور منفردة</label>
          </fieldset>
          {mediaType === "pdf" ? (
            <>
              <label>
                ملف PDF
                <input accept="application/pdf,.pdf" required type="file" onChange={(event) => setPdf(event.target.files?.[0] ?? null)} />
              </label>
              <label>
                رقم أول سؤال في الـ PDF
                <input min="1" required type="number" value={startQuestionNumber} onChange={(event) => setStartQuestionNumber(event.target.value)} />
                <small>الصفحة ١ ← السؤال {startQuestionNumber || "—"}</small>
              </label>
            </>
          ) : (
            <label>
              صور PNG المرقمة
              <input accept="image/png,.png" multiple required type="file" onChange={(event) => setImages(Array.from(event.target.files ?? []))} />
              <small>مثال: 500.png أو Q-500.png</small>
            </label>
          )}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جاري التحليل..." : "تحليل الدفعة"}
        </button>
      </form>

      {error ? <p className="admin-alert error">{error}</p> : null}
      {message ? <p className="admin-alert">{message}</p> : null}

      {job ? (
        <>
          <section className="admin-panel">
            <header className="admin-panel-heading">
              <div>
                <h2>٢. نتيجة التحليل</h2>
                <p>رفع #{job.id.slice(0, 8)} · {importStatusLabels[job.status]}</p>
              </div>
              <b className="admin-status" data-status={job.status}>{importStatusLabels[job.status]}</b>
            </header>
            <div className="admin-overview-grid compact">
              <article><span>الإجمالي</span><strong>{job.totalQuestions.toLocaleString("ar-SA")}</strong></article>
              <article><span>جديد</span><strong>{job.newCount.toLocaleString("ar-SA")}</strong></article>
              <article><span>مكرر</span><strong>{job.duplicateCount.toLocaleString("ar-SA")}</strong></article>
              <article><span>أخطاء</span><strong>{job.errorCount.toLocaleString("ar-SA")}</strong></article>
            </div>
            <div className="admin-sheet-summary">
              {job.sheetSummary.map((sheet) => (
                <span key={sheet.sheetName}><b>{sheet.sheetName}</b>{sheet.questionCount.toLocaleString("ar-SA")} سؤال</span>
              ))}
            </div>
            <div className="admin-media-summary">
              <span>المتوقع: {job.mediaSummary.expected.toLocaleString("ar-SA")}</span>
              <span>الموجود: {job.mediaSummary.found.toLocaleString("ar-SA")}</span>
              <span>المطابق: {job.mediaSummary.matched.toLocaleString("ar-SA")}</span>
              <span>الناقص: {job.mediaSummary.missing.toLocaleString("ar-SA")}</span>
              <span>الزائد: {job.mediaSummary.extra.toLocaleString("ar-SA")}</span>
            </div>
          </section>

          {job.issues.length > 0 ? (
            <section className="admin-panel">
              <h2>أخطاء التحقق</h2>
              <ul className="admin-issue-list">
                {job.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}
              </ul>
            </section>
          ) : null}

          {duplicates.length > 0 && job.status === "ready" ? (
            <section className="admin-panel">
              <header className="admin-panel-heading"><h2>٣. قرارات الأسئلة المكررة</h2></header>
              <label className="admin-checkbox">
                <input checked={applyToAll} type="checkbox" onChange={(event) => setApplyToAll(event.target.checked)} />
                تطبيق الاختيار على جميع الأسئلة المكررة
              </label>
              {applyToAll ? (
                <select value={defaultAction} onChange={(event) => setDefaultAction(event.target.value as DuplicateAction)}>
                  {duplicateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : (
                <div className="admin-duplicate-list">
                  {duplicates.map((item) => (
                    <label key={item.questionId}>
                      السؤال {item.questionNumber.toLocaleString("ar-SA")} — موجود مسبقاً
                      <select value={decisions[item.questionNumber] ?? ""} onChange={(event) => setDecisions((current) => ({ ...current, [item.questionNumber]: event.target.value as DuplicateAction }))}>
                        <option value="">اختر الإجراء</option>
                        {duplicateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {detail.items.length > 0 ? (
            <section className="admin-panel">
              <header className="admin-panel-heading"><h2>٤. معاينة الأسئلة</h2></header>
              <div className="admin-preview-list">
                {detail.items.map((item) => (
                  <details key={item.questionId}>
                    <summary>
                      <strong>السؤال {item.questionNumber.toLocaleString("ar-SA")}</strong>
                      <span>{item.sheetName}</span>
                      <b data-valid={item.validationStatus === "valid"}>{item.validationStatus === "valid" ? "صالح" : "خطأ"}</b>
                    </summary>
                    <div className="admin-question-preview">
                      <p>{item.questionText || "نص السؤال مفقود"}</p>
                      <ol>{item.options.map((option, index) => <li key={index}>{["أ", "ب", "ج", "د"][index]}: {option || "مفقود"}</li>)}</ol>
                      <dl>
                        <div><dt>الإجابة</dt><dd>{answerLabel(item.correctAnswer)}</dd></div>
                        <div><dt>الصورة</dt><dd>{item.imageStatus === "matched" ? "موجودة" : "مفقودة"}</dd></div>
                        <div><dt>صف Excel</dt><dd>{item.excelRowNumber.toLocaleString("ar-SA")}</dd></div>
                        <div><dt>صفحة PDF</dt><dd>{item.pageNumber?.toLocaleString("ar-SA") ?? "صورة منفردة"}</dd></div>
                      </dl>
                      {item.errors.length ? <ul className="admin-issue-list">{item.errors.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul> : null}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {job.status === "importing" ? (
            <section className="admin-panel admin-progress-panel">
              <h2>رفع الأسئلة...</h2>
              <strong>{job.processedCount.toLocaleString("ar-SA")} / {job.totalQuestions.toLocaleString("ar-SA")}</strong>
              <progress max={100} value={progress}>{progress}%</progress>
              <p>قراءة Excel · مطابقة الصور · التحقق من البيانات · حفظ الأسئلة</p>
            </section>
          ) : null}

          {job.status === "ready" ? (
            <div className="admin-confirm-actions">
              <button className="secondary" disabled={isSubmitting} type="button" onClick={handleCancel}>إلغاء</button>
              <button disabled={job.errorCount > 0 || isSubmitting} type="button" onClick={() => setShowConfirmation(true)}>تأكيد الرفع</button>
            </div>
          ) : null}

          {showConfirmation ? (
            <section className="admin-confirmation" role="alertdialog" aria-modal="true">
              <div>
                <h2>تأكيد الرفع</h2>
                <p>سيتم إضافة {job.newCount.toLocaleString("ar-SA")} سؤال.</p>
                {plannedReplacementCount > 0 ? <p className="destructive-copy">سيتم استبدال {plannedReplacementCount.toLocaleString("ar-SA")} سؤالاً موجوداً مسبقاً.</p> : null}
                <div className="admin-confirm-actions">
                  <button className="secondary" type="button" onClick={() => setShowConfirmation(false)}>إلغاء</button>
                  <button disabled={isSubmitting} type="button" onClick={() => void handleConfirm()}>تأكيد الرفع</button>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </AdminShell>
  );
}
