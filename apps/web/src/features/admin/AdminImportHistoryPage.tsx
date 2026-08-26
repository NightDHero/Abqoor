import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { navigateTo } from "../../utils/router";
import type { ImportJob } from "../../types/admin";
import { formatAdminDate, importStatusLabels } from "./adminUtils";
import { AdminShell } from "./AdminShell";

export function AdminImportHistoryPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void adminService
      .getImportJobs()
      .then((response) => setJobs(response.jobs))
      .catch(() => setError("تعذر تحميل سجل الاستيراد."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AdminShell currentPath="/admin/imports" title="سجل الاستيراد">
      {error ? <p className="admin-alert error">{error}</p> : null}
      {isLoading ? <p className="admin-empty">جاري تحميل السجل...</p> : null}
      {!isLoading && jobs.length === 0 ? <p className="admin-empty">لا توجد عمليات استيراد بعد.</p> : null}
      <div className="admin-history-list full">
        {jobs.map((job) => (
          <button className="admin-history-row" key={job.id} type="button" onClick={() => navigateTo(`/admin/imports/${job.id}`)}>
            <span><strong>استيراد #{job.id.slice(0, 8)}</strong><small>{formatAdminDate(job.createdAt)} · {job.createdBy}</small></span>
            <span><b>{job.totalQuestions.toLocaleString("ar-SA")}</b><small>سؤال</small></span>
            <span><b>{job.createdCount.toLocaleString("ar-SA")}</b><small>جديد</small></span>
            <span><b>{job.replacedCount.toLocaleString("ar-SA")}</b><small>مستبدل</small></span>
            <span><b>{job.skippedCount.toLocaleString("ar-SA")}</b><small>متخطى</small></span>
            <b data-status={job.status}>{importStatusLabels[job.status]}</b>
          </button>
        ))}
      </div>
    </AdminShell>
  );
}
