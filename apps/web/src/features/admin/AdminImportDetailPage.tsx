import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { HttpError } from "../../services/http";
import type { ImportJobDetail } from "../../types/admin";
import { answerLabel, formatAdminDate, importStatusLabels } from "./adminUtils";
import { AdminShell } from "./AdminShell";

export function AdminImportDetailPage({ jobId }: { jobId: string }) {
  const [detail, setDetail] = useState<ImportJobDetail | null>(null);
  const [error, setError] = useState("");
  const [showRollback, setShowRollback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void adminService
      .getImportJob(jobId)
      .then(setDetail)
      .catch((caught) => setError(caught instanceof HttpError ? caught.message : "تعذر تحميل تفاصيل الاستيراد."));
  }, [jobId]);

  const rollback = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      setDetail(await adminService.rollbackImport(jobId));
      setShowRollback(false);
    } catch (caught) {
      setError(caught instanceof HttpError ? caught.message : "تعذر التراجع عن الاستيراد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const job = detail?.job;
  return (
    <AdminShell currentPath={`/admin/imports/${jobId}`} title={job ? `استيراد #${job.id.slice(0, 8)}` : "تفاصيل الاستيراد"}>
      {error ? <p className="admin-alert error">{error}</p> : null}
      {!job ? <p className="admin-empty">جاري تحميل التفاصيل...</p> : (
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
            {job.status === "completed" ? <button className="danger" type="button" onClick={() => setShowRollback(true)}>التراجع عن الاستيراد</button> : null}
          </section>

          <section className="admin-panel">
            <h2>نتائج الأسئلة</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>السؤال</th><th>القسم</th><th>الإجابة</th><th>الصورة</th><th>النتيجة</th></tr></thead>
                <tbody>{detail.items.map((item) => <tr key={item.questionId}><td dir="ltr">{item.questionId}</td><td>{item.sheetName}</td><td>{answerLabel(item.correctAnswer)}</td><td>{item.imageStatus === "matched" ? "موجودة" : "مفقودة"}</td><td>{({ pending: "بانتظار التأكيد", created: "مضاف", replaced: "مستبدل", skipped: "متخطى", failed: "فشل" } as const)[item.outcome]}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          {showRollback ? <section className="admin-confirmation" role="alertdialog" aria-modal="true"><div><h2>هل أنت متأكد من التراجع عن هذا الاستيراد؟</h2><p>سيتم التراجع عن {job.createdCount.toLocaleString("ar-SA")} سؤال مضاف و{job.replacedCount.toLocaleString("ar-SA")} سؤال مستبدل.</p><div className="admin-confirm-actions"><button className="secondary" type="button" onClick={() => setShowRollback(false)}>إلغاء</button><button className="danger" disabled={isSubmitting} type="button" onClick={() => void rollback()}>تأكيد التراجع</button></div></div></section> : null}
        </>
      )}
    </AdminShell>
  );
}
