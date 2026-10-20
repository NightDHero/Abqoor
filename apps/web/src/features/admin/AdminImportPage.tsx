import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminService } from "../../services/adminService";
import { HttpError } from "../../services/http";
import type {
  DuplicateAction,
  ImportJobDetail,
} from "../../types/admin";
import { answerLabel, importStatusLabels } from "./adminUtils";
import { AdminShell } from "./AdminShell";
import {
  adminImportExcelLimitBytes,
  adminImportPdfLimitBytes,
  formatImportFileSize
} from "./importLimits";

const duplicateOptions: Array<{ label: string; value: DuplicateAction }> = [
  { label: "استبدال السؤال والمتابعة", value: "replace" },
  { label: "تخطي السؤال والمتابعة", value: "skip" },
  { label: "إيقاف الرفع", value: "stop" }
];

const diagnosticStatusLabels = {
  extracted: "مستخرج",
  invalid: "غير صالح",
  skipped: "متجاوز"
} as const;

const diagnosticFieldLabels: Record<string, string> = {
  correctAnswer: "الإجابة الصحيحة",
  difficulty: "الصعوبة",
  optionA: "الخيار أ",
  optionB: "الخيار ب",
  optionC: "الخيار ج",
  optionD: "الخيار د",
  questionNumber: "رقم السؤال",
  questionText: "نص السؤال",
  subtopic: "الموضوع الفرعي",
  topic: "الموضوع"
};

const formatDiagnosticValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "فارغ";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export function AdminImportPage() {
  const [importType, setImportType] = useState<"general" | "aqsam">("general");
  const [bankName, setBankName] = useState("");
  const [bankKey, setBankKey] = useState("");
  const [excel, setExcel] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
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
  const [excelError, setExcelError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 25;

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

  const selectExcel = (file: File | null) => {
    resetResult();
    if (file && file.size > adminImportExcelLimitBytes) {
      setExcel(null);
      setExcelError("حجم ملف Excel يتجاوز الحد المسموح وهو 100MiB.");
      return;
    }
    setExcel(file);
    setExcelError("");
  };

  const selectPdf = (file: File | null) => {
    resetResult();
    if (file && file.size > adminImportPdfLimitBytes) {
      setPdf(null);
      setPdfError("حجم ملف PDF يتجاوز الحد المسموح وهو 1GiB.");
      return;
    }
    setPdf(file);
    setPdfError("");
  };

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetResult();
    if (!excel) {
      setError("اختر ملف Excel أولاً.");
      return;
    }
    if (importType === "aqsam" && (!bankName.trim() || !bankKey.trim())) {
      setError("أدخل اسم بنك الأقسام ومعرّفه قبل التحليل.");
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
        questionFrom,
        questionTo,
        pdf: mediaType === "pdf" ? pdf ?? undefined : undefined,
        pdfPageFrom: mediaType === "pdf" ? pdfPageFrom : undefined,
        pdfPageTo: mediaType === "pdf" ? pdfPageTo : undefined,
        images: mediaType === "images" ? images : undefined,
        importType,
        bankName: importType === "aqsam" ? bankName : undefined,
        bankKey: importType === "aqsam" ? bankKey : undefined,
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
        <section className="admin-import-step" data-step="1">
          <header className="admin-import-step-heading">
            <span>١</span>
            <div>
              <h2>نوع الرفع والبنك</h2>
              <p>حدد وجهة الأسئلة أولاً حتى تبقى البنوك العامة وأسئلة الأقسام منفصلة.</p>
            </div>
          </header>
          <fieldset className="admin-import-mode-selector">
            <legend>نوع الرفع</legend>
            <label>
              <input
                checked={importType === "general"}
                name="importType"
                type="radio"
                onChange={() => {
                  setImportType("general");
                  resetResult();
                }}
              />
              <strong>رفع الأسئلة العامة</strong>
              <small>للبنك الكمي أو اللفظي العام، دون ربط ببنك أقسام.</small>
            </label>
            <label>
              <input
                checked={importType === "aqsam"}
                name="importType"
                type="radio"
                onChange={() => {
                  setImportType("aqsam");
                  resetResult();
                }}
              />
              <strong>رفع أسئلة الأقسام</strong>
              <small>يحفظ هوية البنك ويجمع أسئلته معاً.</small>
            </label>
          </fieldset>
          {importType === "aqsam" ? (
            <div className="admin-bank-identity-fields">
              <label>
                اسم بنك الأقسام
                <input
                  maxLength={120}
                  placeholder="مثال: بنك الأقسام الكمي الأول"
                  required
                  value={bankName}
                onChange={(event) => {
                  setBankName(event.target.value);
                  resetResult();
                }}
                />
              </label>
              <label>
                معرّف البنك
                <input
                  dir="ltr"
                  maxLength={120}
                  placeholder="quant-01"
                  required
                  value={bankKey}
                onChange={(event) => {
                  setBankKey(event.target.value);
                  resetResult();
                }}
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="admin-import-step" data-step="2">
          <header className="admin-import-step-heading">
            <span>٢</span>
            <div>
              <h2>ملف Excel</h2>
              <p>اختر المصنف الذي يحتوي على بيانات الأسئلة. الحد الأقصى 100MiB.</p>
            </div>
          </header>
          <label className="admin-import-file-field">
            ملف Excel <b aria-hidden="true">مطلوب</b>
            <input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              type="file"
              onChange={(event) => selectExcel(event.target.files?.[0] ?? null)}
            />
            {excel ? (
              <small className="admin-selected-file">
                {excel.name} · {formatImportFileSize(excel.size)}
              </small>
            ) : null}
            {excelError ? <small className="admin-field-error" role="alert">{excelError}</small> : null}
          </label>
          <div className="admin-import-source-note">
            <strong>التصنيف من Excel</strong>
            <span>يحدد اسم ورقة العمل وبنية الأعمدة القسم والموضوع تلقائياً. ستظهر الورقة المختارة في المعاينة.</span>
          </div>
        </section>

        <section className="admin-import-step" data-step="3">
          <header className="admin-import-step-heading">
            <span>٣</span>
            <div>
              <h2>النطاق ومصدر الصور</h2>
              <p>طابق نطاق صفوف Excel مع صفحات PDF أو صور PNG بالترتيب نفسه.</p>
            </div>
          </header>
          <div className="admin-import-fields">
          <fieldset className="admin-range-field">
            <legend>نطاق أسئلة Excel</legend>
            <label>من السؤال<input min="1" required type="number" value={questionFrom} onChange={(event) => { setQuestionFrom(event.target.value); resetResult(); }} /></label>
            <label>إلى السؤال<input min="1" required type="number" value={questionTo} onChange={(event) => { setQuestionTo(event.target.value); resetResult(); }} /></label>
          </fieldset>
          <fieldset>
            <legend>مصدر الصور</legend>
            <label><input checked={mediaType === "pdf"} name="media" type="radio" onChange={() => { setMediaType("pdf"); setPdfError(""); resetResult(); }} /> PDF</label>
            <label><input checked={mediaType === "images"} name="media" type="radio" onChange={() => { setMediaType("images"); setPdfError(""); resetResult(); }} /> صور منفردة</label>
          </fieldset>
          {mediaType === "pdf" ? (
            <>
              <label className="admin-import-file-field">
                ملف PDF <b aria-hidden="true">مطلوب</b>
                <input accept="application/pdf,.pdf" required type="file" onChange={(event) => selectPdf(event.target.files?.[0] ?? null)} />
                {pdf ? (
                  <small className="admin-selected-file">
                    {pdf.name} · {formatImportFileSize(pdf.size)}
                  </small>
                ) : null}
                {pdfError ? <small className="admin-field-error" role="alert">{pdfError}</small> : null}
              </label>
              <fieldset className="admin-range-field">
                <legend>نطاق صفحات PDF</legend>
                <label>من صفحة<input min="1" required type="number" value={pdfPageFrom} onChange={(event) => { setPdfPageFrom(event.target.value); resetResult(); }} /></label>
                <label>إلى صفحة<input min="1" required type="number" value={pdfPageTo} onChange={(event) => { setPdfPageTo(event.target.value); resetResult(); }} /></label>
              </fieldset>
            </>
          ) : (
            <label>
              صور PNG بالترتيب
              <input accept="image/png,.png" multiple required type="file" onChange={(event) => { setImages(Array.from(event.target.files ?? [])); resetResult(); }} />
              <small>الصورة الأولى تقابل أول سؤال في النطاق، ثم يستمر الترتيب تلقائياً.</small>
            </label>
          )}
          </div>
        </section>

        <section className="admin-import-step" data-step="4">
          <header className="admin-import-step-heading">
            <span>٤</span>
            <div>
              <h2>مراجعة الإعدادات</h2>
              <p>تأكد من تطابق عدد الأسئلة مع مصدر الصور قبل بدء التحليل.</p>
            </div>
          </header>
          <div className="admin-range-summary" data-matched={selectedQuestionCount > 0 && selectedQuestionCount === selectedMediaCount}>
            <span>الأسئلة: <b>{selectedQuestionCount.toLocaleString("ar-SA")}</b></span>
            <span>{mediaType === "pdf" ? "صفحات PDF" : "الصور"}: <b>{selectedMediaCount.toLocaleString("ar-SA")}</b></span>
            <span>المطابقة: <b>{selectedQuestionCount === selectedMediaCount && selectedQuestionCount > 0 ? `${selectedQuestionCount.toLocaleString("ar-SA")} / ${selectedMediaCount.toLocaleString("ar-SA")}` : "غير متطابقة"}</b></span>
          </div>
          {error ? <p className="admin-alert error" role="alert">{error}</p> : null}
          <button type="submit" disabled={isSubmitting || Boolean(excelError || pdfError)}>
            {isSubmitting ? "جاري التحليل..." : "تحليل الدفعة وعرض المعاينة"}
          </button>
        </section>
      </form>

      {message ? <p className="admin-alert">{message}</p> : null}

      {job ? (
        <>
          <section className="admin-panel">
            <header className="admin-panel-heading">
              <div>
                <h2>
                  {job.status === "completed" || job.status === "failed" || job.status === "cancelled" || job.status === "rolled_back"
                    ? "٧. النتيجة النهائية"
                    : "٥. المعاينة والتحقق"}
                </h2>
                <p>رفع #{job.id.slice(0, 8)} · {importStatusLabels[job.status]}</p>
                <p>{job.importType === "aqsam" ? `أسئلة الأقسام · ${job.bankName ?? "البنك"}` : "الأسئلة العامة"}</p>
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
                <span key={sheet.sheetName}>
                  <b>{sheet.topic}{sheet.subtopic ? ` ← ${sheet.subtopic}` : ""}</b>
                  {sheet.questionCount.toLocaleString("ar-SA")} سؤال
                </span>
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

          {detail.diagnostics ? (
            <section className="admin-panel admin-import-diagnostics">
              <header className="admin-panel-heading">
                <div>
                  <h2>بيانات Excel المستخرجة</h2>
                  <p>هذه هي نتيجة المحلل في الخادم كما استُخدمت في التحقق والمطابقة.</p>
                </div>
                <b className="admin-status" data-status={detail.diagnostics.matchingStatus === "completed" ? "ready" : "failed"}>
                  {detail.diagnostics.matchingStatus === "completed" ? "اكتملت المطابقة" : "لم تبدأ المطابقة"}
                </b>
              </header>
              <div className="admin-diagnostic-summary">
                <span>النطاق: <b>{detail.diagnostics.configuredQuestionRange.from.toLocaleString("ar-SA")}–{detail.diagnostics.configuredQuestionRange.to.toLocaleString("ar-SA")}</b></span>
                <span>الأوراق المحددة: <b>{detail.diagnostics.selectedWorksheetNames.join("، ") || "لا توجد"}</b></span>
                <span>معرّفات Excel: <b>{detail.diagnostics.parsedQuestionIdentifiers.join("، ") || "لا توجد"}</b></span>
                <span>معرّفات الصور: <b>{detail.diagnostics.mediaIdentifiers.join("، ") || "لا توجد"}</b></span>
              </div>
              {detail.diagnostics.sheets.map((sheet) => (
                <details className="admin-diagnostic-sheet" key={sheet.sheetName} open={sheet.selected}>
                  <summary>
                    <span>{sheet.sheetName}</span>
                    <small>
                      {sheet.selected ? "محددة للاستيراد" : sheet.recognized ? "معروفة ومتجاوزة" : "بنية غير معروفة"}
                      {sheet.format ? ` · ${sheet.format}` : ""}
                    </small>
                  </summary>
                  {sheet.skippedReason ? <p className="admin-diagnostic-note">{sheet.skippedReason}</p> : null}
                  <div className="admin-diagnostic-block">
                    <h3>الرؤوس المكتشفة</h3>
                    <div className="admin-diagnostic-chips">
                      {sheet.detectedHeaders.map((header, index) => (
                        <span key={`${sheet.sheetName}-header-${index}`}>
                          {String.fromCharCode(65 + index)}: {header || "فارغ"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="admin-diagnostic-block">
                    <h3>ربط الأعمدة</h3>
                    {sheet.columnMappings.length > 0 ? (
                      <div className="admin-table-wrap admin-diagnostic-table-wrap">
                        <table className="admin-table">
                          <thead><tr><th>الحقل</th><th>المصدر</th><th>الرأس</th></tr></thead>
                          <tbody>
                            {sheet.columnMappings.map((mapping) => (
                              <tr key={`${sheet.sheetName}-${mapping.field}`}>
                                <td>{diagnosticFieldLabels[mapping.field] ?? mapping.field}</td>
                                <td>{mapping.columnName}</td>
                                <td>{mapping.header ?? "ترتيب الصف"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="admin-diagnostic-empty">لم يتم اكتشاف ربط أعمدة صالح.</p>}
                  </div>
                  <div className="admin-diagnostic-block">
                    <h3>الصفوف المستخرجة والمتجاوزة</h3>
                    <p className="admin-diagnostic-note">الصفوف الفارغة: {sheet.emptyRowCount.toLocaleString("ar-SA")}</p>
                    <div className="admin-table-wrap admin-diagnostic-rows-wrap">
                      <table className="admin-table admin-diagnostic-rows">
                        <thead><tr><th>صف Excel</th><th>الحالة</th><th>رقم السؤال</th><th>السؤال</th><th>الخيارات</th><th>الإجابة</th><th>القسم والموضوع</th><th>البيانات الخام</th><th>التفاصيل</th></tr></thead>
                        <tbody>
                          {sheet.rows.map((row) => (
                            <tr data-diagnostic-status={row.status} key={`${sheet.sheetName}-${row.excelRowNumber}`}>
                              <td>{row.excelRowNumber.toLocaleString("ar-SA")}</td>
                              <td><b>{diagnosticStatusLabels[row.status]}</b></td>
                              <td>{row.questionNumber?.toLocaleString("ar-SA") ?? "فارغ"}</td>
                              <td>{row.questionText ?? "فارغ"}</td>
                              <td>{row.options?.join(" | ") ?? "فارغ"}</td>
                              <td>{answerLabel(row.correctAnswer)}</td>
                              <td>{row.subject ? `${row.subject === "quantitative" ? "كمي" : "لفظي"} ← ${row.topic ?? "دون موضوع"}${row.subtopic ? ` ← ${row.subtopic}` : ""}` : "غير محدد"}</td>
                              <td><code>{row.rawValues.map(formatDiagnosticValue).join(" | ")}</code></td>
                              <td>{row.reason ?? (row.issues.map((issue) => issue.message).join(" · ") || "—")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              ))}
              <details className="admin-diagnostic-json">
                <summary>عرض JSON الخام</summary>
                <pre dir="ltr">{JSON.stringify(detail.diagnostics, null, 2)}</pre>
              </details>
            </section>
          ) : null}

          {job.issues.length > 0 ? (
            <section className="admin-panel">
              <h2>أخطاء التحقق</h2>
              <ul className="admin-issue-list">
                {job.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}
              </ul>
            </section>
          ) : null}

          {detail.items.length > 0 ? (
            <section className="admin-panel">
              <header className="admin-panel-heading"><div><h2>الأسئلة المحللة</h2><p>النطاق المحدد فقط، بواقع {previewPageSize.toLocaleString("ar-SA")} سؤالاً في الصفحة.</p></div></header>
              <div className="admin-table-wrap">
                <table className="admin-table admin-import-preview-table">
                  <thead><tr><th>السؤال</th><th>{job.sourceType === "pdf" ? "صفحة PDF" : "الصورة"}</th><th>القسم</th><th>الموضوع</th><th>الموضوع الفرعي</th><th>الإجابة</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {previewItems.map((item) => (
                      <tr key={item.questionId}>
                        <td>{item.questionNumber.toLocaleString("ar-SA")}</td>
                        <td>{item.pageNumber?.toLocaleString("ar-SA") ?? item.sourceImageName ?? "—"}</td>
                        <td>{item.subject === "quantitative" ? "كمي" : "لفظي"}</td>
                        <td>{item.topic}</td>
                        <td>{item.subtopic ?? "بدون موضوع فرعي"}</td>
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

          {duplicates.length > 0 && job.status === "ready" ? (
            <section className="admin-panel">
              <header className="admin-panel-heading"><h2>٦. قرارات الأسئلة المكررة</h2></header>
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

          {job.status === "importing" ? (
            <section className="admin-panel admin-progress-panel">
              <h2>٧. رفع الأسئلة...</h2>
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
