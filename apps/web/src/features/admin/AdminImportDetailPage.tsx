import { useEffect, useMemo, useState } from "react";
import { adminService } from "../../services/adminService";
import { HttpError } from "../../services/http";
import type { DuplicateAction, ImportJobDetail } from "../../types/admin";
import { navigateTo } from "../../utils/router";
import { formatAdminDate, importStatusLabels } from "./adminUtils";
import { AdminShell } from "./AdminShell";
import { ImportResultsTable } from "./ImportResultsTable";

const duplicateOptions: Array<{ label: string; value: DuplicateAction }> = [
  { label: "استبدال السؤال والمتابعة", value: "replace" },
  { label: "تخطي السؤال والمتابعة", value: "skip" },
  { label: "إيقاف الرفع", value: "stop" }
];

export function AdminImportDetailPage({ jobId }: { jobId: string }) {
  const initialCache = adminService.getCachedImportJob(jobId);
  const [detail, setDetail] = useState<ImportJobDetail | null>(initialCache?.data ?? null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showRollback, setShowRollback] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [applyToAll, setApplyToAll] = useState(true);
  const [defaultAction, setDefaultAction] = useState<DuplicateAction>("skip");
  const [decisions, setDecisions] = useState<Record<number, DuplicateAction>>({});

  const loadDetail = async (force = false) => {
    if (!detail) setIsLoading(true);
    setError("");
    try {
      setDetail(await adminService.getImportJob(jobId, force));
    } catch (caught) {
      setError(caught instanceof HttpError ? caught.message : "تعذر تحميل تفاصيل الرفع.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [jobId]);

  useEffect(() => {
    if (detail?.job.status !== "importing") return;
    const timer = window.setInterval(() => {
      void adminService.getImportJob(jobId, true).then((nextDetail) => {
        setDetail(nextDetail);
        if (nextDetail.job.status === "completed") {
          setMessage("اكتملت عملية الرفع وسُجلت في السجل.");
        } else if (nextDetail.job.status === "failed") {
          setError(nextDetail.job.errorMessage ?? "فشلت عملية الرفع.");
        }
      }).catch(() => setError("تعذر تحديث تقدم الرفع."));
    }, 700);
    return () => window.clearInterval(timer);
  }, [detail?.job.status, jobId]);

  const duplicates = detail?.items.filter((item) => item.isDuplicate) ?? [];
  const plannedReplacementCount = useMemo(() => {
    if (applyToAll) return defaultAction === "replace" ? duplicates.length : 0;
    return duplicates.filter((item) => decisions[item.questionNumber] === "replace").length;
  }, [applyToAll, decisions, defaultAction, duplicates]);

  const handleConfirm = async () => {
    if (!detail) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await adminService.confirmImport(detail.job.id, {
        applyToAllDuplicates: applyToAll,
        defaultDuplicateAction: applyToAll ? defaultAction : undefined,
        duplicateDecisions: applyToAll
          ? []
          : duplicates
              .filter((item) => decisions[item.questionNumber])
              .map((item) => ({
                action: decisions[item.questionNumber] as DuplicateAction,
                questionNumber: item.questionNumber
              }))
      });
      setDetail(response);
      setShowConfirmation(false);
      setMessage("بدأ حفظ الأسئلة. يمكنك متابعة التقدم هنا.");
    } catch (caught) {
      setShowConfirmation(false);
      setError(caught instanceof HttpError ? caught.message : "تعذر تأكيد الرفع.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rollback = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      setDetail(await adminService.rollbackImport(jobId));
      setShowRollback(false);
    } catch (caught) {
      setError(caught instanceof HttpError ? caught.message : "تعذر التراجع عن الرفع.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const job = detail?.job;
  const canConfirm = Boolean(
    detail &&
    job?.status === "ready" &&
    job.errorCount === 0 &&
    !detail.items.some((item) => item.validationStatus === "error")
  );
  const progress = job && job.totalQuestions > 0
    ? Math.round((job.processedCount / job.totalQuestions) * 100)
    : 0;

  return (
    <AdminShell currentPath={`/admin/imports/${jobId}`} title={job ? `رفع #${job.id.slice(0, 8)}` : "تفاصيل الرفع"}>
      {error ? (
        <div className="admin-alert error" role="alert">
          <p>{error}</p>
          <div className="admin-confirm-actions">
            <button className="secondary" type="button" onClick={() => void loadDetail(true)}>إعادة المحاولة</button>
            {job?.status === "ready" ? <button data-prefetch-route="/admin/import" type="button" onClick={() => navigateTo("/admin/import")}>إعادة تحليل الملفات</button> : null}
          </div>
        </div>
      ) : null}
      {message ? <p className="admin-alert success">{message}</p> : null}
      {!job ? <p className="admin-empty">{isLoading ? "جاري تحميل التفاصيل..." : "لا تتوفر تفاصيل الرفع."}</p> : (
        <>
          <section className="admin-panel">
            <header className="admin-panel-heading"><div><h2>{formatAdminDate(job.createdAt)}</h2><p>{job.createdBy}</p></div><b className="admin-status" data-status={job.status}>{importStatusLabels[job.status]}</b></header>
            <dl className="admin-detail-grid">
              <div><dt>Excel</dt><dd>{job.excelFilename}</dd></div>
              <div><dt>الصور</dt><dd>{job.mediaFilename}</dd></div>
              <div><dt>الإجمالي</dt><dd>{job.totalQuestions.toLocaleString("ar-SA")}</dd></div>
              <div><dt>مضاف</dt><dd>{job.createdCount.toLocaleString("ar-SA")}</dd></div>
              <div><dt>مستبدل</dt><dd>{job.replacedCount.toLocaleString("ar-SA")}</dd></div>
              <div><dt>متخطى</dt><dd>{job.skippedCount.toLocaleString("ar-SA")}</dd></div>
              <div><dt>فاشل</dt><dd>{job.failureCount.toLocaleString("ar-SA")}</dd></div>
            </dl>
            {job.errorMessage ? <p className="admin-alert error">{job.errorMessage}</p> : null}
            {job.status === "completed" ? <button className="danger" type="button" onClick={() => setShowRollback(true)}>التراجع عن الرفع</button> : null}
          </section>

          {detail.items.length > 0 ? <ImportResultsTable detail={detail} /> : null}

          {duplicates.length > 0 && job.status === "ready" ? (
            <section className="admin-panel">
              <header className="admin-panel-heading"><h2>قرارات الأسئلة المكررة</h2></header>
              <label className="admin-checkbox"><input checked={applyToAll} type="checkbox" onChange={(event) => setApplyToAll(event.target.checked)} />تطبيق الاختيار على جميع الأسئلة المكررة</label>
              {applyToAll ? (
                <select value={defaultAction} onChange={(event) => setDefaultAction(event.target.value as DuplicateAction)}>{duplicateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              ) : (
                <div className="admin-duplicate-list">{duplicates.map((item) => <label key={item.questionId}>السؤال {item.questionNumber.toLocaleString("ar-SA")} — موجود مسبقاً<select value={decisions[item.questionNumber] ?? ""} onChange={(event) => setDecisions((current) => ({ ...current, [item.questionNumber]: event.target.value as DuplicateAction }))}><option value="">اختر الإجراء</option>{duplicateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}</div>
              )}
            </section>
          ) : null}

          {job.status === "ready" ? (
            <section className="admin-panel admin-reopen-confirmation">
              <h2>{canConfirm ? "المعاينة جاهزة للتأكيد" : "المعاينة تحتاج معالجة"}</h2>
              <p>{canConfirm ? "تمت استعادة المعاينة المحفوظة ويمكن متابعة الرفع من هنا." : "عالج أخطاء التحقق أو أعد تحليل الملفات قبل التأكيد."}</p>
              <div className="admin-confirm-actions">
                <button className="secondary" data-prefetch-route="/admin/import" type="button" onClick={() => navigateTo("/admin/import")}>رفع وتحليل جديد</button>
                <button disabled={!canConfirm || isSubmitting} type="button" onClick={() => setShowConfirmation(true)}>تأكيد الرفع</button>
              </div>
            </section>
          ) : null}

          {job.status === "importing" ? (
            <section className="admin-panel admin-progress-panel"><h2>رفع الأسئلة...</h2><strong>{job.processedCount.toLocaleString("ar-SA")} / {job.totalQuestions.toLocaleString("ar-SA")}</strong><progress max={100} value={progress}>{progress}%</progress></section>
          ) : null}

          {showConfirmation ? (
            <section className="admin-confirmation" role="alertdialog" aria-modal="true"><div><h2>تأكيد الرفع</h2><p>سيتم إضافة {job.newCount.toLocaleString("ar-SA")} سؤال.</p>{plannedReplacementCount > 0 ? <p className="destructive-copy">سيتم استبدال {plannedReplacementCount.toLocaleString("ar-SA")} سؤالاً موجوداً مسبقاً.</p> : null}<div className="admin-confirm-actions"><button className="secondary" type="button" onClick={() => setShowConfirmation(false)}>إلغاء</button><button disabled={isSubmitting} type="button" onClick={() => void handleConfirm()}>تأكيد الرفع</button></div></div></section>
          ) : null}

          {showRollback ? <section className="admin-confirmation" role="alertdialog" aria-modal="true"><div><h2>هل أنت متأكد من التراجع عن هذا الرفع؟</h2><p>سيتم التراجع عن {job.createdCount.toLocaleString("ar-SA")} سؤال مضاف و{job.replacedCount.toLocaleString("ar-SA")} سؤال مستبدل.</p><div className="admin-confirm-actions"><button className="secondary" type="button" onClick={() => setShowRollback(false)}>إلغاء</button><button className="danger" disabled={isSubmitting} type="button" onClick={() => void rollback()}>تأكيد التراجع</button></div></div></section> : null}
        </>
      )}
    </AdminShell>
  );
}
