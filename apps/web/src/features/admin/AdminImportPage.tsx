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
  const [excelType, setExcelType] = useState<"quantitative" | "verbal">("quantitative");
  const [quantitativeTopicId, setQuantitativeTopicId] = useState("");
  const [quantitativeTopics, setQuantitativeTopics] = useState<Array<{ id: string; label: string }>>([]);
  const [mediaType, setMediaType] = useState<"pdf" | "images">("pdf");
  const [questionFrom, setQuestionFrom] = useState("1");
  const [questionTo, setQuestionTo] = useState("1");
  const [pdfPageFrom, setPdfPageFrom] = useState("1");
  const [pdfPageTo, setPdfPageTo] = useState("1");
  const [detail, setDetail] = useState<ImportJobDetail | null>(null);
  const [decisions, setDecisions] = useState<Record<number, DuplicateAction>>({});
  const [applyToAll, setApplyToAll] = useState(true);
  const [defaultAction, setDefaultAction] = useState<DuplicateAction>("skip");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 25;

  useEffect(() => {
    void adminService
      .getImportTaxonomy()
      .then((taxonomy) => setQuantitativeTopics(taxonomy.quantitativeTopics))
      .catch(() => setError("تعذر تحميل تصنيف الموضوعات الكمية."));
  }, []);

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
    setPreviewPage(1);
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
    if (excelType === "quantitative" && !quantitativeTopicId) {
      setError("اختر موضوع السؤال الكمي من التصنيف المعتمد.");
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

    const questionCount = Number(questionTo) - Number(questionFrom) + 1;
    const mediaCount = mediaType === "pdf"
      ? Number(pdfPageTo) - Number(pdfPageFrom) + 1
      : images.length;
    if (!Number.isInteger(questionCount) || questionCount < 1) {
      setError("نطاق أسئلة Excel غير صالح.");
      return;
    }
    if (!Number.isInteger(mediaCount) || mediaCount < 1) {
      setError("نطاق مصدر المحتوى غير صالح.");
      return;
    }
    if (questionCount !== mediaCount) {
      setError(`عدد الأسئلة (${questionCount}) يجب أن يساوي عدد ${mediaType === "pdf" ? "صفحات PDF" : "الصور"} (${mediaCount}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminService.analyzeImport({
        excel,
        excelType,
        quantitativeTopicId: excelType === "quantitative" ? quantitativeTopicId : undefined,
        questionFrom,
        questionTo,
        pdf: mediaType === "pdf" ? pdf ?? undefined : undefined,
        pdfPageFrom: mediaType === "pdf" ? pdfPageFrom : undefined,
        pdfPageTo: mediaType === "pdf" ? pdfPageTo : undefined,
        images: mediaType === "images" ? images : undefined,
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
  const selectedQuestionCount = Math.max(0, Number(questionTo) - Number(questionFrom) + 1);
  const selectedMediaCount = mediaType === "pdf"
    ? Math.max(0, Number(pdfPageTo) - Number(pdfPageFrom) + 1)
    : images.length;
  const previewPageCount = detail ? Math.max(1, Math.ceil(detail.items.length / previewPageSize)) : 1;
  const previewItems = detail?.items.slice(
    (previewPage - 1) * previewPageSize,
    previewPage * previewPageSize
  ) ?? [];

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
          <fieldset className="admin-segmented-field">
            <legend>نوع بنك الأسئلة</legend>
            <label><input checked={excelType === "quantitative"} name="excelType" type="radio" onChange={() => setExcelType("quantitative")} /> كمي</label>
            <label><input checked={excelType === "verbal"} name="excelType" type="radio" onChange={() => setExcelType("verbal")} /> لفظي</label>
          </fieldset>
          {excelType === "quantitative" ? (
            <label>
              الموضوع الكمي
              <select
                required
                value={quantitativeTopicId}
                onChange={(event) => setQuantitativeTopicId(event.target.value)}
              >
                <option value="">اختر الموضوع</option>
                {quantitativeTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.label}</option>
                ))}
              </select>
              <small>كمي هو القسم الرئيسي؛ اختر موضوع الأسئلة داخل هذا القسم.</small>
            </label>
          ) : null}
          <label>
            ملف Excel
            <input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              type="file"
              onChange={(event) => setExcel(event.target.files?.[0] ?? null)}
            />
          </label>
          <fieldset className="admin-range-field">
            <legend>نطاق أسئلة Excel</legend>
            <label>من السؤال<input min="1" required type="number" value={questionFrom} onChange={(event) => setQuestionFrom(event.target.value)} /></label>
            <label>إلى السؤال<input min="1" required type="number" value={questionTo} onChange={(event) => setQuestionTo(event.target.value)} /></label>
          </fieldset>
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
              <fieldset className="admin-range-field">
                <legend>نطاق صفحات PDF</legend>
                <label>من صفحة<input min="1" required type="number" value={pdfPageFrom} onChange={(event) => setPdfPageFrom(event.target.value)} /></label>
                <label>إلى صفحة<input min="1" required type="number" value={pdfPageTo} onChange={(event) => setPdfPageTo(event.target.value)} /></label>
              </fieldset>
            </>
          ) : (
            <label>
              صور PNG بالترتيب
              <input accept="image/png,.png" multiple required type="file" onChange={(event) => setImages(Array.from(event.target.files ?? []))} />
              <small>الصورة الأولى تقابل أول سؤال في النطاق، ثم يستمر الترتيب تلقائياً.</small>
            </label>
          )}
        </div>

        <div className="admin-range-summary" data-matched={selectedQuestionCount > 0 && selectedQuestionCount === selectedMediaCount}>
          <span>الأسئلة: <b>{selectedQuestionCount.toLocaleString("ar-SA")}</b></span>
          <span>{mediaType === "pdf" ? "صفحات PDF" : "الصور"}: <b>{selectedMediaCount.toLocaleString("ar-SA")}</b></span>
          <span>المطابقة: <b>{selectedQuestionCount === selectedMediaCount && selectedQuestionCount > 0 ? `${selectedQuestionCount.toLocaleString("ar-SA")} / ${selectedMediaCount.toLocaleString("ar-SA")}` : "غير متطابقة"}</b></span>
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
              <header className="admin-panel-heading"><div><h2>٤. المعاينة</h2><p>النطاق المحدد فقط، بواقع {previewPageSize.toLocaleString("ar-SA")} سؤالاً في الصفحة.</p></div></header>
              <div className="admin-table-wrap">
                <table className="admin-table admin-import-preview-table">
                  <thead><tr><th>السؤال</th><th>{job.sourceType === "pdf" ? "صفحة PDF" : "الصورة"}</th><th>القسم</th><th>الإجابة</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {previewItems.map((item) => (
                      <tr key={item.questionId}>
                        <td>{item.questionNumber.toLocaleString("ar-SA")}</td>
                        <td>{item.pageNumber?.toLocaleString("ar-SA") ?? item.sourceImageName ?? "—"}</td>
                        <td>{item.sheetName}</td>
                        <td>{answerLabel(item.correctAnswer)}</td>
                        <td><b data-valid={item.validationStatus === "valid"}>{item.validationStatus === "valid" ? "جاهز" : item.errors[0]?.message ?? "خطأ"}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewPageCount > 1 ? <nav className="admin-pagination" aria-label="صفحات معاينة الاستيراد"><button className="secondary" disabled={previewPage === 1} type="button" onClick={() => setPreviewPage((page) => page - 1)}>السابق</button><span>{previewPage.toLocaleString("ar-SA")} / {previewPageCount.toLocaleString("ar-SA")}</span><button className="secondary" disabled={previewPage === previewPageCount} type="button" onClick={() => setPreviewPage((page) => page + 1)}>التالي</button></nav> : null}
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
